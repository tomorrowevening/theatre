import type Project from '@tomorrowevening/theatre-core/projects/Project'
import type Sheet from '@tomorrowevening/theatre-core/sheets/Sheet'
import {encodePathToProp} from '@tomorrowevening/theatre-shared/utils/addresses'
import type {SequenceAddress} from '@tomorrowevening/theatre-shared/utils/addresses'
import didYouMean from '@tomorrowevening/theatre-shared/utils/didYouMean'
import {InvalidArgumentError} from '@tomorrowevening/theatre-shared/utils/errors'
import type {
  Prism,
  Pointer,
  Ticker,
  PointerToPrismProvider,
} from '@tomorrowevening/theatre-dataverse'
import {getPointerParts} from '@tomorrowevening/theatre-dataverse'
import {Atom} from '@tomorrowevening/theatre-dataverse'
import {pointer} from '@tomorrowevening/theatre-dataverse'
import {prism, val} from '@tomorrowevening/theatre-dataverse'
import {padStart} from 'lodash-es'
import type {
  IPlaybackController,
  IPlaybackState,
} from './playbackControllers/DefaultPlaybackController'
import DefaultPlaybackController from './playbackControllers/DefaultPlaybackController'
import TheatreSequence from './TheatreSequence'
import type {Keyframe} from '@tomorrowevening/theatre-core/projects/store/types/SheetState_Historic'
import type {ILogger} from '@tomorrowevening/theatre-shared/logger'
import type {ISequence} from '..'
import {notify} from '@tomorrowevening/theatre-shared/notify'
import type {$IntentionalAny} from '@tomorrowevening/theatre-dataverse/src/types'
import {isSheetObject} from '@tomorrowevening/theatre-shared/instanceTypes'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import {generateSequenceSubSequenceId} from '@tomorrowevening/theatre-shared/utils/ids'

export type IPlaybackRange = [from: number, to: number]

export type IPlaybackDirection =
  | 'normal'
  | 'reverse'
  | 'alternate'
  | 'alternateReverse'

export type SequenceEventListener = (event: {
  name: string
  position: number
  value?: any
}) => void

const possibleDirections = [
  'normal',
  'reverse',
  'alternate',
  'alternateReverse',
]

export default class Sequence implements PointerToPrismProvider {
  get type(): 'Theatre_Sequence' {
    return 'Theatre_Sequence'
  }
  public readonly address: SequenceAddress
  publicApi: TheatreSequence

  private _playbackControllerBox: Atom<IPlaybackController>
  private _prismOfStatePointer: Prism<Pointer<IPlaybackState>>
  private _positionD: Prism<number>
  private _positionFormatterD: Prism<ISequencePositionFormatter>
  _playableRangeD: undefined | Prism<{start: number; end: number}>

  // Event system
  private _eventListeners: Map<string, Set<SequenceEventListener>> = new Map()
  private _lastProcessedPosition: number = -1
  private _processedEvents: Set<string> = new Set() // Track processed events to avoid duplicates

  readonly pointer: ISequence['pointer'] = pointer({root: this, path: []})
  readonly $$isPointerToPrismProvider = true
  readonly _logger: ILogger

  constructor(
    readonly _project: Project,
    readonly _sheet: Sheet,
    readonly _lengthD: Prism<number>,
    readonly _subUnitsPerUnitD: Prism<number>,
    playbackController?: IPlaybackController,
  ) {
    this._logger = _project._logger
      .named('Sheet', _sheet.address.sheetId)
      .named('Instance', _sheet.address.sheetInstanceId)

    this.address = {...this._sheet.address, sequenceName: 'default'}

    this.publicApi = new TheatreSequence(this)

    this._playbackControllerBox = new Atom(
      playbackController ?? new DefaultPlaybackController(),
    )

    this._prismOfStatePointer = prism(
      () => this._playbackControllerBox.prism.getValue().statePointer,
    )

    this._positionD = prism(() => {
      const statePointer = this._prismOfStatePointer.getValue()
      return val(statePointer.position)
    })

    this._positionFormatterD = prism(() => {
      const subUnitsPerUnit = val(this._subUnitsPerUnitD)
      return new TimeBasedPositionFormatter(subUnitsPerUnit)
    })

    // Monitor position changes for event processing
    this._positionD.onStale(() => {
      const currentPosition = this._positionD.getValue()
      this._processEventsForPositionChange(
        this._lastProcessedPosition,
        currentPosition,
      )
      this._processSubSequencesForPositionChange(
        this._lastProcessedPosition,
        currentPosition,
      )
      this._lastProcessedPosition = currentPosition
    })
  }

  // Event system methods
  listen(eventName: string, listener: SequenceEventListener): void {
    if (!this._eventListeners.has(eventName)) {
      this._eventListeners.set(eventName, new Set())
    }
    this._eventListeners.get(eventName)!.add(listener)
  }

  unlisten(eventName: string, listener: SequenceEventListener): void {
    const listeners = this._eventListeners.get(eventName)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this._eventListeners.delete(eventName)
      }
    }
  }

  private _processEventsForPositionChange(
    fromPosition: number,
    toPosition: number,
  ): void {
    const events = this._getEvents()

    if (!events || events.length === 0) return

    // Detect if this is a loop (sequence went from near end back to near beginning)
    const sequenceLength = this.length
    const isLoop =
      fromPosition > toPosition &&
      fromPosition > sequenceLength * 0.8 &&
      toPosition < sequenceLength * 0.2

    if (isLoop) {
      // Clear processed events on loop to allow fresh processing
      this._processedEvents.clear()
      return
    }

    // Process events between from and to positions
    const minPos = Math.min(fromPosition, toPosition)
    const maxPos = Math.max(fromPosition, toPosition)

    // Clear processed events when moving to a new position range
    if (Math.abs(toPosition - fromPosition) > 0.1) {
      this._processedEvents.clear()
    }

    for (const event of events) {
      // Check if event is within the range we need to process
      if (event.position > minPos && event.position <= maxPos) {
        const eventKey = `${event.id}-${event.position}`

        // Skip if we've already processed this event at this position
        if (this._processedEvents.has(eventKey)) {
          continue
        }

        // Handle special events that shouldn't be cached (so they can retrigger)
        const isSpecialEvent = event.name === 'goTo'

        if (!isSpecialEvent) {
          this._processedEvents.add(eventKey)
        }

        this._triggerEvent(event)

        // Handle special events
        if (event.name === 'stop') {
          // Use requestAnimationFrame to defer the pause completely outside current execution
          requestAnimationFrame(() => {
            this.pause()
            this._playbackControllerBox.get().gotoPosition(event.position)
          })
          return // Exit early to prevent further processing
        } else if (event.name === 'goTo' && event.value !== undefined) {
          // Use requestAnimationFrame to defer the position change
          requestAnimationFrame(() => {
            // Clear processed events to allow retriggering after position change
            this._processedEvents.clear()

            if (typeof event.value === 'string') {
              // Try to find marker with this name
              const markerPosition = this.getMarkerPosition(event.value)
              if (markerPosition !== undefined) {
                this._gotoPositionWithoutPausing(markerPosition)
              }
            } else if (typeof event.value === 'number') {
              this._gotoPositionWithoutPausing(event.value)
            }
          })
          return // Exit early to prevent further processing
        }
      }
    }
  }

  private _triggerEvent(event: {
    name: string
    position: number
    value?: any
  }): void {
    const listeners = this._eventListeners.get(event.name)
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event)
        } catch (error) {
          // Log error to console for now
          console.error('Error in sequence event listener:', error)
        }
      })
    }
  }

  private _processSubSequencesForPositionChange(
    fromPosition: number,
    toPosition: number,
  ): void {
    const subSequences = this._getSubSequences()

    if (!subSequences || subSequences.length === 0) return

    // Process each sub-sequence to see if it should be playing at the current position
    for (const subSequence of subSequences) {
      const subSeqStart = subSequence.position
      const subSeqDuration =
        subSequence.duration ??
        this._getSubSequenceDuration(subSequence.sheetId)
      const timeScale = subSequence.timeScale ?? 1.0
      // Calculate visual end position accounting for time scale
      // Visual width = duration / timeScale
      const subSeqEnd = subSeqStart + subSeqDuration / timeScale

      // Check if current position is within this sub-sequence's range
      if (toPosition >= subSeqStart && toPosition <= subSeqEnd) {
        // Calculate the position within the sub-sequence
        const relativePosition = toPosition - subSeqStart
        const scaledPosition = relativePosition * timeScale

        // Get the referenced sheet and its sequence
        try {
          const referencedSheet = this._project.getOrCreateSheet(
            subSequence.sheetId,
            'default', // Use default instance for now
          )
          const referencedSequence = referencedSheet.getSequence()

          // Set the position of the referenced sequence
          // Use the private method to avoid pausing
          if (
            referencedSequence &&
            '_gotoPositionWithoutPausing' in referencedSequence
          ) {
            ;(referencedSequence as any)._gotoPositionWithoutPausing(
              scaledPosition,
            )
          }
        } catch (error) {
          // Log error if sheet not found
          this._logger.error(
            `Sub-sequence references non-existent sheet: ${subSequence.sheetId}`,
          )
        }
      }
    }
  }

  private _getSubSequenceDuration(sheetId: string): number {
    try {
      const referencedSheet = this._project.getOrCreateSheet(sheetId, 'default')
      const referencedSequence = referencedSheet.getSequence()
      return referencedSequence?.length ?? 0
    } catch (error) {
      return 0
    }
  }

  private _getEvents() {
    const sheetState =
      this._project.pointers.historic.sheetsById[this._sheet.address.sheetId]
    const sequenceState = val(sheetState.sequence)

    const events = sequenceState?.events || []
    return events
  }

  private _getSubSequences() {
    const sheetState =
      this._project.pointers.historic.sheetsById[this._sheet.address.sheetId]
    const sequenceState = val(sheetState.sequence)

    const subSequences = sequenceState?.subSequences || []
    return subSequences
  }

  pointerToPrism<V>(pointer: Pointer<V>): Prism<V> {
    const {path} = getPointerParts(pointer)
    if (path.length === 0) {
      return prism((): ISequence['pointer']['$$__pointer_type'] => ({
        length: val(this.pointer.length),
        playing: val(this.pointer.playing),
        position: val(this.pointer.position),
        subUnitsPerUnit: val(this.pointer.subUnitsPerUnit),
      })) as $IntentionalAny as Prism<V>
    }
    if (path.length > 1) {
      return prism(() => undefined) as $IntentionalAny as Prism<V>
    }
    const [prop] = path
    if (prop === 'length') {
      return this._lengthD as $IntentionalAny as Prism<V>
    } else if (prop === 'subUnitsPerUnit') {
      return this._subUnitsPerUnitD as $IntentionalAny as Prism<V>
    } else if (prop === 'position') {
      return this._positionD as $IntentionalAny as Prism<V>
    } else if (prop === 'playing') {
      return prism(() => {
        return val(this._prismOfStatePointer.getValue().playing)
      }) as $IntentionalAny as Prism<V>
    } else {
      return prism(() => undefined) as $IntentionalAny as Prism<V>
    }
  }

  /**
   * Takes a pointer to a property of a SheetObject and returns the keyframes of that property.
   *
   * Theoretically, this method can be called from inside a prism so it can be reactive.
   */
  getKeyframesOfSimpleProp<V>(prop: Pointer<any>): Keyframe[] {
    const {path, root} = getPointerParts(prop)

    if (!isSheetObject(root)) {
      throw new InvalidArgumentError(
        'Argument prop must be a pointer to a SheetObject property',
      )
    }

    const trackP = val(
      this._project.pointers.historic.sheetsById[this._sheet.address.sheetId]
        .sequence.tracksByObject[root.address.objectKey],
    )

    if (!trackP) {
      return []
    }

    const {trackData, trackIdByPropPath} = trackP
    const objectAddress = encodePathToProp(path)
    const id = trackIdByPropPath[objectAddress]

    if (!id) {
      return []
    }

    const track = trackData[id]

    if (!track) {
      return []
    }

    return track.keyframes
  }

  get positionFormatter(): ISequencePositionFormatter {
    return this._positionFormatterD.getValue()
  }

  get prismOfStatePointer() {
    return this._prismOfStatePointer
  }

  get length() {
    return this._lengthD.getValue()
  }

  get positionPrism() {
    return this._positionD
  }

  get position() {
    return this._playbackControllerBox.get().getCurrentPosition()
  }

  get subUnitsPerUnit(): number {
    return this._subUnitsPerUnitD.getValue()
  }

  get positionSnappedToGrid(): number {
    return this.closestGridPosition(this.position)
  }

  closestGridPosition = (posInUnitSpace: number): number => {
    const subUnitsPerUnit = this.subUnitsPerUnit
    const gridLength = 1 / subUnitsPerUnit

    return parseFloat(
      (Math.round(posInUnitSpace / gridLength) * gridLength).toFixed(3),
    )
  }

  set position(requestedPosition: number) {
    let position = requestedPosition
    this.pause()
    if (process.env.NODE_ENV !== 'production') {
      if (typeof position !== 'number') {
        console.error(
          `value t in sequence.position = t must be a number. ${typeof position} given`,
        )
        position = 0
      }
      if (position < 0) {
        console.error(
          `sequence.position must be a positive number. ${position} given`,
        )
        position = 0
      }
    }
    if (position > this.length) {
      position = this.length
    }
    const dur = this.length
    this._playbackControllerBox
      .get()
      .gotoPosition(position > dur ? dur : position)
  }

  // Private method to change position without pausing (for goTo events)
  private _gotoPositionWithoutPausing(requestedPosition: number) {
    let position = requestedPosition
    if (process.env.NODE_ENV !== 'production') {
      if (typeof position !== 'number') {
        console.error(
          `value t in sequence.position = t must be a number. ${typeof position} given`,
        )
        position = 0
      }
      if (position < 0) {
        console.error(
          `sequence.position must be a positive number. ${position} given`,
        )
        position = 0
      }
    }
    if (position > this.length) {
      position = this.length
    }
    const dur = this.length
    this._playbackControllerBox
      .get()
      .gotoPosition(position > dur ? dur : position)
  }

  getDurationCold() {
    return this._lengthD.getValue()
  }

  get playing() {
    return val(this._playbackControllerBox.get().statePointer.playing)
  }

  _makeRangeFromSequenceTemplate(): Prism<IPlaybackRange> {
    return prism(() => {
      return [0, val(this._lengthD)]
    })
  }

  /**
   * Controls the playback within a range. Repeats infinitely unless stopped.
   *
   * @remarks
   *   One use case for this is to play the playback within the focus range.
   *
   * @param rangeD - The prism that contains the range that will be used for the playback
   *
   * @returns  a promise that gets rejected if the playback stopped for whatever reason
   *
   */
  playDynamicRange(
    rangeD: Prism<IPlaybackRange>,
    ticker: Ticker,
  ): Promise<unknown> {
    return this._playbackControllerBox.get().playDynamicRange(rangeD, ticker)
  }

  async play(
    conf: Partial<{
      iterationCount: number
      range: IPlaybackRange
      rate: number
      direction: IPlaybackDirection
    }>,
    ticker: Ticker,
  ): Promise<boolean> {
    const sequenceDuration = this.length
    const range: IPlaybackRange =
      conf && conf.range ? conf.range : [0, sequenceDuration]

    if (process.env.NODE_ENV !== 'production') {
      if (typeof range[0] !== 'number' || range[0] < 0) {
        throw new InvalidArgumentError(
          `Argument conf.range[0] in sequence.play(conf) must be a positive number. ${JSON.stringify(
            range[0],
          )} given.`,
        )
      }
      if (range[0] >= sequenceDuration) {
        throw new InvalidArgumentError(
          `Argument conf.range[0] in sequence.play(conf) cannot be longer than the duration of the sequence, which is ${sequenceDuration}s. ${JSON.stringify(
            range[0],
          )} given.`,
        )
      }
      if (typeof range[1] !== 'number' || range[1] <= 0) {
        throw new InvalidArgumentError(
          `Argument conf.range[1] in sequence.play(conf) must be a number larger than zero. ${JSON.stringify(
            range[1],
          )} given.`,
        )
      }

      if (range[1] > sequenceDuration) {
        notify.warning(
          "Couldn't play sequence in given range",
          `Your animation will still play until the end of the sequence, however the argument \`conf.range[1]\` given in \`sequence.play(conf)\` (${JSON.stringify(
            range[1],
          )}s) is longer than the duration of the sequence (${sequenceDuration}s).

To fix this, either set \`conf.range[1]\` to be less the duration of the sequence, or adjust the sequence duration in the UI.`,
          [
            {
              url: 'https://www.theatrejs.com/docs/latest/manual/sequences',
              title: 'Sequences',
            },
            {
              url: 'https://www.theatrejs.com/docs/latest/manual/sequences',
              title: 'Playback API',
            },
          ],
        )
        range[1] = sequenceDuration
      }

      if (range[1] <= range[0]) {
        throw new InvalidArgumentError(
          `Argument conf.range[1] in sequence.play(conf) must be larger than conf.range[0]. ${JSON.stringify(
            range,
          )} given.`,
        )
      }
    }

    const iterationCount =
      conf && typeof conf.iterationCount === 'number' ? conf.iterationCount : 1
    if (process.env.NODE_ENV !== 'production') {
      if (
        !(Number.isInteger(iterationCount) && iterationCount > 0) &&
        iterationCount !== Infinity
      ) {
        throw new InvalidArgumentError(
          `Argument conf.iterationCount in sequence.play(conf) must be an integer larger than 0. ${JSON.stringify(
            iterationCount,
          )} given.`,
        )
      }
    }

    const rate = conf && typeof conf.rate !== 'undefined' ? conf.rate : 1

    if (process.env.NODE_ENV !== 'production') {
      if (typeof rate !== 'number' || rate === 0) {
        throw new InvalidArgumentError(
          `Argument conf.rate in sequence.play(conf) must be a number larger than 0. ${JSON.stringify(
            rate,
          )} given.`,
        )
      }

      if (rate < 0) {
        throw new InvalidArgumentError(
          `Argument conf.rate in sequence.play(conf) must be a number larger than 0. ${JSON.stringify(
            rate,
          )} given. If you want the animation to play backwards, try setting conf.direction to 'reverse' or 'alternateReverse'.`,
        )
      }
    }

    const direction = conf && conf.direction ? conf.direction : 'normal'

    if (process.env.NODE_ENV !== 'production') {
      if (possibleDirections.indexOf(direction) === -1) {
        throw new InvalidArgumentError(
          `Argument conf.direction in sequence.play(conf) must be one of ${JSON.stringify(
            possibleDirections,
          )}. ${JSON.stringify(direction)} given. ${didYouMean(
            direction,
            possibleDirections,
          )}`,
        )
      }
    }

    return await this._play(
      iterationCount,
      [range[0], range[1]],
      rate,
      direction,
      ticker,
    )
  }

  protected _play(
    iterationCount: number,
    range: IPlaybackRange,
    rate: number,
    direction: IPlaybackDirection,
    ticker: Ticker,
  ): Promise<boolean> {
    return this._playbackControllerBox
      .get()
      .play(iterationCount, range, rate, direction, ticker)
  }

  pause() {
    this._playbackControllerBox.get().pause()
  }

  replacePlaybackController(playbackController: IPlaybackController) {
    this.pause()
    const oldController = this._playbackControllerBox.get()
    this._playbackControllerBox.set(playbackController)

    const time = oldController.getCurrentPosition()
    oldController.destroy()
    playbackController.gotoPosition(time)
  }

  getMarkerPosition(markerName: string): number | undefined {
    const sheetState =
      this._project.pointers.historic.sheetsById[this._sheet.address.sheetId]
    const markers = val(sheetState.sequence.markers)

    if (!markers) return undefined

    // First try exact label match
    let marker = markers.find((m) => m.label === markerName)

    // If not found, try case-insensitive match
    if (!marker) {
      marker = markers.find(
        (m) => m.label?.toLowerCase() === markerName.toLowerCase(),
      )
    }

    // If still not found, try partial match
    if (!marker) {
      marker = markers.find((m) => m.label?.includes(markerName))
    }

    return marker?.position
  }

  async goToAndPlay(
    markerName: string,
    conf: Partial<{
      iterationCount: number
      range: IPlaybackRange
      rate: number
      direction: IPlaybackDirection
    }>,
    ticker: Ticker,
  ): Promise<boolean> {
    const position = this.getMarkerPosition(markerName)

    if (position === undefined) {
      throw new Error(
        `Marker "${markerName}" not found in sequence "${this._sheet.address.sheetId}"`,
      )
    }

    this.position = position
    return this.play(conf, ticker)
  }

  goToAndStop(markerName: string): void {
    const position = this.getMarkerPosition(markerName)

    if (position === undefined) {
      throw new Error(
        `Marker "${markerName}" not found in sequence "${this._sheet.address.sheetId}"`,
      )
    }

    this.position = position
  }

  /**
   * Adds a sub-sequence to this sequence.
   *
   * @param sheetId - The ID of the sheet/sequence to reference
   * @param position - The position in this sequence where the sub-sequence should start
   * @param options - Optional configuration for the sub-sequence
   * @returns The ID of the created sub-sequence
   */
  addSubSequence(
    sheetId: string,
    position: number,
    options?: {
      duration?: number
      timeScale?: number
      label?: string
    },
  ): string {
    const studio = getStudio()
    if (!studio) {
      throw new Error(
        'addSubSequence() can only be called when Theatre.js Studio is loaded.',
      )
    }

    // Check if a subsequence with the same sheetId and label already exists
    const existingSubSequences = this._getSubSequences()
    if (existingSubSequences) {
      const label = options?.label
      const duplicate = existingSubSequences.find(
        (subSeq) => subSeq.sheetId === sheetId && subSeq.label === label,
      )
      if (duplicate) {
        // Return the existing subsequence ID instead of creating a duplicate
        this._logger._warn(
          `Sub-sequence with sheetId "${sheetId}" and label "${label}" already exists. Returning existing ID.`,
        )
        return duplicate.id
      }
    }

    // Generate a unique ID for the sub-sequence
    const subSequenceId = generateSequenceSubSequenceId()

    // Validate position
    if (typeof position !== 'number' || position < 0) {
      throw new InvalidArgumentError(
        `Position must be a non-negative number. ${JSON.stringify(
          position,
        )} given.`,
      )
    }

    // Validate optional parameters
    if (
      options?.duration !== undefined &&
      (typeof options.duration !== 'number' || options.duration <= 0)
    ) {
      throw new InvalidArgumentError(
        `Duration must be a positive number. ${JSON.stringify(
          options.duration,
        )} given.`,
      )
    }

    if (
      options?.timeScale !== undefined &&
      (typeof options.timeScale !== 'number' || options.timeScale <= 0)
    ) {
      throw new InvalidArgumentError(
        `Time scale must be a positive number. ${JSON.stringify(
          options.timeScale,
        )} given.`,
      )
    }

    // Create the sub-sequence using the state editor
    studio.transaction(({stateEditors}) => {
      const subSequence = {
        id: subSequenceId,
        sheetId: sheetId as $IntentionalAny, // Cast to handle SheetId nominal type
        position,
        duration: options?.duration,
        timeScale: options?.timeScale,
        label: options?.label,
      }

      stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.replaceSubSequences(
        {
          sheetAddress: this._sheet.address,
          subSequences: [subSequence],
          snappingFunction: this.closestGridPosition,
        },
      )
    })

    return subSequenceId
  }

  /**
   * Removes a sub-sequence from this sequence.
   *
   * @param subSequenceId - The ID of the sub-sequence to remove
   */
  removeSubSequence(subSequenceId: string): void {
    const studio = getStudio()
    if (!studio) {
      throw new Error(
        'removeSubSequence() can only be called when Theatre.js Studio is loaded.',
      )
    }

    // Remove the sub-sequence using the state editor
    studio.transaction(({stateEditors}) => {
      stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.removeSubSequence(
        {
          sheetAddress: this._sheet.address,
          subSequenceId: subSequenceId as $IntentionalAny, // Cast to handle SequenceSubSequenceId nominal type
        },
      )
    })
  }

  /**
   * Updates properties of a sub-sequence.
   *
   * @param subSequenceId - The ID of the sub-sequence to update
   * @param updates - The properties to update
   */
  updateSubSequence(
    subSequenceId: string,
    updates: {
      position?: number
      duration?: number
      timeScale?: number
      label?: string
    },
  ): void {
    const studio = getStudio()
    if (!studio) {
      throw new Error(
        'updateSubSequence() can only be called when Theatre.js Studio is loaded.',
      )
    }

    // Validate position if provided
    if (
      updates.position !== undefined &&
      (typeof updates.position !== 'number' || updates.position < 0)
    ) {
      throw new InvalidArgumentError(
        `Position must be a non-negative number. ${JSON.stringify(
          updates.position,
        )} given.`,
      )
    }

    // Validate duration if provided
    if (
      updates.duration !== undefined &&
      (typeof updates.duration !== 'number' || updates.duration <= 0)
    ) {
      throw new InvalidArgumentError(
        `Duration must be a positive number. ${JSON.stringify(
          updates.duration,
        )} given.`,
      )
    }

    // Validate timeScale if provided
    if (
      updates.timeScale !== undefined &&
      (typeof updates.timeScale !== 'number' || updates.timeScale <= 0)
    ) {
      throw new InvalidArgumentError(
        `Time scale must be a positive number. ${JSON.stringify(
          updates.timeScale,
        )} given.`,
      )
    }

    // Update the sub-sequence using the state editor
    studio.transaction(({stateEditors}) => {
      stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateSubSequence(
        {
          sheetAddress: this._sheet.address,
          subSequenceId: subSequenceId as $IntentionalAny, // Cast to handle SequenceSubSequenceId nominal type
          updates,
        },
      )
    })
  }
}

export interface ISequencePositionFormatter {
  formatSubUnitForGrid(posInUnitSpace: number): string
  formatFullUnitForGrid(posInUnitSpace: number): string
  formatForPlayhead(posInUnitSpace: number): string
  formatBasic(posInUnitSpace: number): string
}

class TimeBasedPositionFormatter implements ISequencePositionFormatter {
  constructor(private readonly _fps: number) {}
  formatSubUnitForGrid(posInUnitSpace: number): string {
    const subSecondPos = posInUnitSpace % 1
    const frame = 1 / this._fps

    const frames = Math.round(subSecondPos / frame)
    return frames + 'f'
  }

  formatFullUnitForGrid(posInUnitSpace: number): string {
    let p = posInUnitSpace

    let s = ''

    if (p >= hour) {
      const hours = Math.floor(p / hour)
      s += hours + 'h'
      p = p % hour
    }

    if (p >= minute) {
      const minutes = Math.floor(p / minute)
      s += minutes + 'm'
      p = p % minute
    }

    if (p >= second) {
      const seconds = Math.floor(p / second)
      s += seconds + 's'
      p = p % second
    }

    const frame = 1 / this._fps

    if (p >= frame) {
      const frames = Math.floor(p / frame)
      s += frames + 'f'
      p = p % frame
    }

    return s.length === 0 ? '0s' : s
  }

  formatForPlayhead(posInUnitSpace: number): string {
    let p = posInUnitSpace

    let s = ''

    if (p >= hour) {
      const hours = Math.floor(p / hour)
      s += padStart(hours.toString(), 2, '0') + 'h'
      p = p % hour
    }

    if (p >= minute) {
      const minutes = Math.floor(p / minute)
      s += padStart(minutes.toString(), 2, '0') + 'm'
      p = p % minute
    } else if (s.length > 0) {
      s += '00m'
    }

    if (p >= second) {
      const seconds = Math.floor(p / second)
      s += padStart(seconds.toString(), 2, '0') + 's'
      p = p % second
    } else {
      s += '00s'
    }

    const frameLength = 1 / this._fps

    if (p >= frameLength) {
      const frames = Math.round(p / frameLength)
      s += padStart(frames.toString(), 2, '0') + 'f'
      p = p % frameLength
    } else if (p / frameLength > 0.98) {
      const frames = 1
      s += padStart(frames.toString(), 2, '0') + 'f'
      p = p % frameLength
    } else {
      s += '00f'
    }

    return s.length === 0 ? '00s00f' : s
  }

  formatBasic(posInUnitSpace: number): string {
    return posInUnitSpace.toFixed(2) + 's'
  }
}

const second = 1
const minute = second * 60
const hour = minute * 60
