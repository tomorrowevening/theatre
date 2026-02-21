import type {
  IPlaybackController,
  IPlaybackState,
} from '@tomorrowevening/theatre-core/sequences/playbackControllers/DefaultPlaybackController'
import type {
  IPlaybackDirection,
  IPlaybackRange,
} from '@tomorrowevening/theatre-core/sequences/Sequence'
import {defer} from '@tomorrowevening/theatre-shared/utils/defer'
import noop from '@tomorrowevening/theatre-shared/utils/noop'
import type {Prism, Pointer, Ticker} from '@tomorrowevening/theatre-dataverse'
import {Atom} from '@tomorrowevening/theatre-dataverse'
import type {SheetAudioEntry} from './audioStore'

/**
 * A playback controller that synchronises multiple audio buffers with the
 * sequence timeline.  Position is tracked via the ticker (like
 * DefaultPlaybackController) and each audio buffer is scheduled into its own
 * AudioContext with the correct start-time offset.
 *
 * Mirrors the structure of AudioPlaybackController to share the same loop-
 * detection and cleanup patterns that are known to be correct.
 */
export class MultiAudioPlaybackController implements IPlaybackController {
  private _state: Atom<IPlaybackState> = new Atom<IPlaybackState>({
    position: 0,
    playing: false,
  })
  readonly statePointer: Pointer<IPlaybackState>
  _stopPlayCallback: () => void = noop

  constructor(private readonly _entries: SheetAudioEntry[]) {
    this.statePointer = this._state.pointer
  }

  private get _playing() {
    return this._state.get().playing
  }

  private set _playing(v: boolean) {
    this._state.reduce((s) => ({...s, playing: v}))
  }

  destroy() {}

  pause() {
    this._stopPlayCallback()
    this._playing = false
    this._stopPlayCallback = noop
  }

  gotoPosition(time: number) {
    this._state.reduce((s) => ({...s, position: time}))
  }

  getCurrentPosition() {
    return this._state.get().position
  }

  play(
    iterationCount: number,
    range: IPlaybackRange,
    rate: number,
    direction: IPlaybackDirection,
    ticker: Ticker,
  ): Promise<boolean> {
    if (this._playing) this.pause()
    this._playing = true

    let startPos = this.getCurrentPosition()
    const iterationLength = range[1] - range[0]

    if (startPos < range[0] || startPos > range[1]) {
      startPos = range[0]
    } else if (startPos === range[1]) {
      startPos = range[0]
    }
    this.gotoPosition(startPos)

    const deferred = defer<boolean>()
    const initialTickerTime = ticker.time
    const initialElapsedPos = startPos - range[0]
    const totalPlaybackLength = iterationLength * iterationCount

    // Schedule every audio buffer into its own context
    const sources = this._entries.map((entry) =>
      startSource(
        entry,
        startPos,
        rate,
        initialElapsedPos,
        totalPlaybackLength,
      ),
    )

    const tick = (currentTickerTime: number) => {
      const elapsed = Math.max(currentTickerTime - initialTickerTime, 0) / 1000
      const elapsedPos = Math.min(
        elapsed * rate + initialElapsedPos,
        totalPlaybackLength,
      )

      if (elapsedPos !== totalPlaybackLength) {
        const iterPos = ((elapsedPos / iterationLength) % 1) * iterationLength
        this.gotoPosition(iterPos + range[0])
        ticker.onNextTick(tick)
      } else {
        this.gotoPosition(range[1])
        this._playing = false
        sources.forEach((s) => s())
        ticker.offThisOrNextTick(tick)
        ticker.offNextTick(tick)
        deferred.resolve(true)
      }
    }

    this._stopPlayCallback = () => {
      sources.forEach((s) => s())
      ticker.offThisOrNextTick(tick)
      ticker.offNextTick(tick)
      if (this._playing) deferred.resolve(false)
    }

    ticker.onThisOrNextTick(tick)
    return deferred.promise
  }

  playDynamicRange(
    rangeD: Prism<IPlaybackRange>,
    ticker: Ticker,
  ): Promise<unknown> {
    const deferred = defer<boolean>()
    if (this._playing) this.pause()
    this._playing = true

    let stopFn: (() => void) | undefined = undefined

    const play = () => {
      stopFn?.()
      stopFn = this._loopInRange(rangeD.getValue(), ticker)
    }

    const untap = rangeD.onStale(play)
    play()

    this._stopPlayCallback = () => {
      stopFn?.()
      untap()
      deferred.resolve(false)
    }

    return deferred.promise
  }

  /**
   * Loops all entries within the given range.  Returns a stop function that
   * tears down both the audio sources and the ticker subscription.
   *
   * Mirrors AudioPlaybackController._loopInRange exactly so loop detection and
   * cleanup follow the same proven pattern.
   */
  private _loopInRange(range: IPlaybackRange, ticker: Ticker): () => void {
    let startPos = this.getCurrentPosition()
    const iterationLength = range[1] - range[0]

    if (startPos < range[0] || startPos > range[1]) {
      startPos = range[0]
    } else if (startPos === range[1]) {
      startPos = range[0]
    }
    this.gotoPosition(startPos)

    const initialTickerTime = ticker.time
    const initialElapsedPos = startPos - range[0]
    let lastIteration = 0

    // `activeSources` is a `let` so both the tick closure and the returned stop
    // function always reference the currently-playing set of sources.
    let activeSources = this._entries.map((entry) =>
      startSource(entry, startPos, 1, initialElapsedPos, Infinity),
    )

    const tick = (currentTickerTime: number) => {
      const elapsed = Math.max(currentTickerTime - initialTickerTime, 0) / 1000
      const elapsedPos = elapsed + initialElapsedPos
      const currentIteration = Math.floor(elapsedPos / iterationLength)

      // Only restart when we actually cross a loop boundary
      if (currentIteration > lastIteration) {
        lastIteration = currentIteration
        const loopElapsed = elapsedPos % iterationLength
        activeSources.forEach((s) => s())
        activeSources = this._entries.map((entry) =>
          startSource(entry, range[0], 1, loopElapsed, Infinity),
        )
      }

      const iterPos = elapsedPos % iterationLength
      this.gotoPosition(Math.min(iterPos + range[0], range[1]))
      ticker.onNextTick(tick)
    }

    ticker.onThisOrNextTick(tick)

    // Ticker cleanup lives here, NOT mixed into activeSources, so it is never
    // accidentally lost when activeSources is rebuilt on a loop.
    return () => {
      activeSources.forEach((s) => s())
      ticker.offThisOrNextTick(tick)
      ticker.offNextTick(tick)
    }
  }
}

/** Schedules one AudioBufferSourceNode and returns a stop function. */
function startSource(
  entry: SheetAudioEntry,
  startPos: number,
  rate: number,
  initialElapsedPos: number,
  totalLength: number,
): () => void {
  const {decodedBuffer, audioContext, gainNode, startTime} = entry
  try {
    const source = audioContext.createBufferSource()
    source.buffer = decodedBuffer
    source.connect(gainNode)
    source.playbackRate.value = rate

    const bufferOffset = Math.max(0, startPos - startTime)
    const startDelay = Math.max(0, startTime - startPos) / rate
    const duration = Math.min(
      decodedBuffer.duration - bufferOffset,
      (totalLength - initialElapsedPos) / rate,
    )

    source.start(
      startDelay > 0 ? audioContext.currentTime + startDelay : 0,
      bufferOffset,
      Math.max(0, duration),
    )

    return () => {
      try {
        source.stop()
        source.disconnect()
      } catch {}
    }
  } catch {
    return noop
  }
}
