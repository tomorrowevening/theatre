import type {FullStudioState} from '@tomorrowevening/theatre-studio/store'
import {
  studioActions,
  studioReducer,
  tempActionGroup,
} from '@tomorrowevening/theatre-studio/store'
import type {IStateEditors} from '@tomorrowevening/theatre-studio/store/stateEditors'
import {setDrafts__onlyMeantToBeCalledByTransaction} from '@tomorrowevening/theatre-studio/store/stateEditors'
import type {
  StudioAhistoricState,
  StudioEphemeralState,
  StudioHistoricState,
} from '@tomorrowevening/theatre-studio/store/types'
import type {Deferred} from '@tomorrowevening/theatre-shared/utils/defer'
import {defer} from '@tomorrowevening/theatre-shared/utils/defer'
import atomFromReduxStore from '@tomorrowevening/theatre-studio/utils/redux/atomFromReduxStore'
import configureStore from '@tomorrowevening/theatre-studio/utils/redux/configureStore'
import type {VoidFn} from '@tomorrowevening/theatre-shared/utils/types'
import type {Atom, Pointer} from '@tomorrowevening/theatre-dataverse'
import type {Draft} from 'immer'
import {createDraft, finishDraft} from 'immer'
import type {Store} from 'redux'
import {
  __experimental_clearPersistentStorage,
  persistStateOfStudio,
} from './persistStateOfStudio'
import type {OnDiskState} from '@tomorrowevening/theatre-core/projects/store/storeTypes'
import {generateDiskStateRevision} from './generateDiskStateRevision'
import cloneDeep from 'lodash-es/cloneDeep'

import createTransactionPrivateApi from './createTransactionPrivateApi'
import type {ProjectId} from '@tomorrowevening/theatre-shared/utils/ids'

export type Drafts = {
  historic: Draft<StudioHistoricState>
  ahistoric: Draft<StudioAhistoricState>
  ephemeral: Draft<StudioEphemeralState>
}

export interface ITransactionPrivateApi {
  set<T>(pointer: Pointer<T>, value: T): void
  unset<T>(pointer: Pointer<T>): void
  drafts: Drafts
  stateEditors: IStateEditors
}

export type CommitOrDiscard = {
  commit: VoidFn
  discard: VoidFn
}

export default class StudioStore {
  private readonly _reduxStore: Store<FullStudioState>
  private readonly _atom: Atom<FullStudioState>
  readonly atomP: Pointer<FullStudioState>

  constructor() {
    this._reduxStore = configureStore({
      rootReducer: studioReducer,
      devtoolsOptions: {name: 'Theatre.js Studio'},
    })
    this._atom = atomFromReduxStore(this._reduxStore)
    this.atomP = this._atom.pointer
  }

  initialize(opts: {
    persistenceKey: string
    usePersistentStorage: boolean
  }): Promise<void> {
    const d: Deferred<void> = defer<void>()
    if (opts.usePersistentStorage === true) {
      persistStateOfStudio(
        this._reduxStore,
        () => {
          this.tempTransaction(({drafts}) => {
            drafts.ephemeral.initialised = true
          }).commit()
          d.resolve()
        },
        opts.persistenceKey,
      )
    } else {
      this.tempTransaction(({drafts}) => {
        drafts.ephemeral.initialised = true
      }).commit()

      d.resolve()
    }
    return d.promise
  }

  getState(): FullStudioState {
    return this._reduxStore.getState()
  }

  __experimental_clearPersistentStorage(
    persistenceKey: string,
  ): FullStudioState {
    __experimental_clearPersistentStorage(this._reduxStore, persistenceKey)
    return this.getState()
  }

  /**
   * This method causes the store to start the history from scratch. This is useful
   * for testing and development where you want to explicitly provide a state to the
   * store.
   */
  __dev_startHistoryFromScratch(newHistoricPart: StudioHistoricState) {
    this._reduxStore.dispatch(
      studioActions.historic.startHistoryFromScratch(
        studioActions.reduceParts((s) => ({...s, historic: newHistoricPart})),
      ),
    )
  }

  tempTransaction(fn: (api: ITransactionPrivateApi) => void): CommitOrDiscard {
    const group = tempActionGroup()
    let errorDuringTransaction: Error | undefined = undefined

    const action = group.push(
      studioActions.reduceParts((wholeState) => {
        const drafts = {
          historic: createDraft(wholeState.historic),
          ahistoric: createDraft(wholeState.ahistoric),
          ephemeral: createDraft(wholeState.ephemeral),
        }

        let running = true

        let ensureRunning = () => {
          if (!running) {
            throw new Error(
              `You seem to have called the transaction api after studio.transaction() has finished running`,
            )
          }
        }

        const stateEditors = setDrafts__onlyMeantToBeCalledByTransaction(drafts)

        const api: ITransactionPrivateApi = createTransactionPrivateApi(
          ensureRunning,
          stateEditors,
          drafts,
        )

        try {
          fn(api)
          running = false
          return {
            historic: finishDraft(drafts.historic),
            ahistoric: finishDraft(drafts.ahistoric),
            ephemeral: finishDraft(drafts.ephemeral),
          }
        } catch (err: unknown) {
          errorDuringTransaction = err as Error
          return wholeState
        } finally {
          setDrafts__onlyMeantToBeCalledByTransaction(undefined)
        }
      }),
    )

    this._reduxStore.dispatch(action)

    if (errorDuringTransaction) {
      this._reduxStore.dispatch(group.discard())
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw errorDuringTransaction
    }

    return {
      commit: () => {
        this._reduxStore.dispatch(group.commit())
      },
      discard: () => {
        this._reduxStore.dispatch(group.discard())
      },
    }
  }

  undo() {
    this._reduxStore.dispatch(studioActions.historic.undo())
  }

  redo() {
    this._reduxStore.dispatch(studioActions.historic.redo())
  }

  createContentOfSaveFile(projectId: ProjectId): OnDiskState {
    const projectState =
      this._reduxStore.getState().$persistent.historic.innerState.coreByProject[
        projectId
      ]

    if (!projectState) {
      throw new Error(`Project ${projectId} has not been initialized.`)
    }

    const revision = generateDiskStateRevision()

    this.tempTransaction(({stateEditors}) => {
      stateEditors.coreByProject.historic.revisionHistory.add({
        projectId,
        revision,
      })
    }).commit()

    const projectHistoricState =
      this._reduxStore.getState().$persistent.historic.innerState.coreByProject[
        projectId
      ]

    const studioState =
      this._reduxStore.getState().$persistent.historic.innerState.projects
        ?.stateByProjectId[projectId]

    const generatedOnDiskState: OnDiskState = cloneDeep(projectHistoricState)

    // Copy markers from studio state to the exported state
    if (studioState?.stateBySheetId) {
      for (const [sheetId, sheetState] of Object.entries(
        studioState.stateBySheetId,
      )) {
        if (sheetState?.sequenceEditor?.markerSet) {
          const markerSet = sheetState.sequenceEditor.markerSet
          if (markerSet.allIds && Object.keys(markerSet.allIds).length > 0) {
            // Ensure the sheet exists in the generated state
            if (!generatedOnDiskState.sheetsById[sheetId]) {
              generatedOnDiskState.sheetsById[sheetId] = {
                staticOverrides: {byObject: {}},
              }
            }

            const sheet = generatedOnDiskState.sheetsById[sheetId]

            // Ensure the sequence exists
            if (sheet && !sheet.sequence) {
              sheet.sequence = {
                type: 'PositionalSequence',
                length: 10,
                subUnitsPerUnit: 30,
                tracksByObject: {},
              }
            }

            // Convert PointableSet to array
            const markers = Object.entries(markerSet.byId)
              .map(([id, marker]) => marker)
              .filter(
                (marker): marker is NonNullable<typeof marker> =>
                  marker !== undefined,
              )
              .sort((a, b) => a.position - b.position)

            if (sheet?.sequence) {
              sheet.sequence.markers = markers
            }
          }
        }

        // Copy events from studio state to the exported state
        if (sheetState?.sequenceEditor?.eventSet) {
          const eventSet = sheetState.sequenceEditor.eventSet
          if (eventSet.allIds && Object.keys(eventSet.allIds).length > 0) {
            // Ensure the sheet exists in the generated state
            if (!generatedOnDiskState.sheetsById[sheetId]) {
              generatedOnDiskState.sheetsById[sheetId] = {
                staticOverrides: {byObject: {}},
              }
            }

            const sheet = generatedOnDiskState.sheetsById[sheetId]

            // Ensure the sequence exists
            if (sheet && !sheet.sequence) {
              sheet.sequence = {
                type: 'PositionalSequence',
                length: 10,
                subUnitsPerUnit: 30,
                tracksByObject: {},
              }
            }

            // Convert PointableSet to array
            const events = Object.entries(eventSet.byId)
              .map(([id, event]) => event)
              .filter(
                (event): event is NonNullable<typeof event> =>
                  event !== undefined,
              )
              .sort((a, b) => a.position - b.position)

            if (sheet?.sequence) {
              sheet.sequence.events = events
            }
          }
        }

        // Copy sub-sequences from studio state to the exported state
        if (sheetState?.sequenceEditor?.subSequenceSet) {
          const subSequenceSet = sheetState.sequenceEditor.subSequenceSet
          if (
            subSequenceSet.allIds &&
            Object.keys(subSequenceSet.allIds).length > 0
          ) {
            // Ensure the sheet exists in the generated state
            if (!generatedOnDiskState.sheetsById[sheetId]) {
              generatedOnDiskState.sheetsById[sheetId] = {
                staticOverrides: {byObject: {}},
              }
            }

            const sheet = generatedOnDiskState.sheetsById[sheetId]

            // Ensure the sequence exists
            if (sheet && !sheet.sequence) {
              sheet.sequence = {
                type: 'PositionalSequence',
                length: 10,
                subUnitsPerUnit: 30,
                tracksByObject: {},
              }
            }

            // Convert PointableSet to array
            const subSequences = Object.entries(subSequenceSet.byId)
              .map(([id, subSequence]) => subSequence)
              .filter(
                (subSequence): subSequence is NonNullable<typeof subSequence> =>
                  subSequence !== undefined,
              )
              .sort((a, b) => a.position - b.position)

            if (sheet?.sequence) {
              sheet.sequence.subSequences = subSequences
            }
          }
        }
      }
    }

    return generatedOnDiskState
  }
}
