import type {Studio} from '@theatre/studio/Studio'
import delay from '@theatre/shared/utils/delay'
import {original} from 'immer'
import type Project from './Project'
import type {OnDiskState} from './store/storeTypes'
import globals from '@theatre/shared/globals'

/**
 * @remarks
 * TODO this could be turned into a simple prism, like:
 * `editor.isReady: Prism<{isReady: true} | {isReady: false, reason: 'conflictBetweenDiskStateAndBrowserState'}>`
 */
export default async function initialiseProjectState(
  studio: Studio,
  project: Project,
  onDiskState: OnDiskState | undefined,
) {
  /*
   * If in the future we move to IndexedDB to store the state, we'll have
   * to deal with it being async (as opposed to localStorage that is synchronous.)
   * so here we're artifically delaying the loading of the state to make sure users
   * don't count on the state always being already loaded synchronously
   */
  await delay(0)

  studio.transaction(({drafts}) => {
    const projectId = project.address.projectId

    drafts.ephemeral.coreByProject[projectId] = {
      lastExportedObject: null,
      loadingState: {type: 'loading'},
    }

    drafts.ahistoric.coreByProject[projectId] = {
      ahistoricStuff: '',
    }

    function useInitialState() {
      drafts.ephemeral.coreByProject[projectId].loadingState = {
        type: 'loaded',
      }

      drafts.historic.coreByProject[projectId] = {
        sheetsById: {},
        definitionVersion: globals.currentProjectStateDefinitionVersion,
        revisionHistory: [],
      }
    }

    function useOnDiskState(state: OnDiskState) {
      drafts.ephemeral.coreByProject[projectId].loadingState = {
        type: 'loaded',
      }

      drafts.historic.coreByProject[projectId] = state
    }

    function useBrowserState() {
      drafts.ephemeral.coreByProject[projectId].loadingState = {
        type: 'loaded',
      }
    }

    function browserStateIsNotBasedOnDiskState(onDiskState: OnDiskState) {
      drafts.ephemeral.coreByProject[projectId].loadingState = {
        type: 'browserStateIsNotBasedOnDiskState',
        onDiskState,
      }
    }

    const browserState = original(drafts.historic)?.coreByProject[
      project.address.projectId
    ]

    if (!browserState) {
      if (!onDiskState) {
        useInitialState()
      } else {
        useOnDiskState(onDiskState)
      }
    } else {
      if (!onDiskState) {
        useBrowserState()
      } else {
        if (
          browserState.revisionHistory.indexOf(
            onDiskState.revisionHistory[0],
          ) == -1
        ) {
          browserStateIsNotBasedOnDiskState(onDiskState)
        } else {
          useBrowserState()
        }
      }
    }
  })

  // Load markers from disk state into studio state (if studio is available)
  if (onDiskState?.sheetsById) {
    const projectId = project.address.projectId
    studio.transaction(({stateEditors}: any) => {
      for (const [sheetId, sheetState] of Object.entries(
        onDiskState.sheetsById,
      )) {
        if (sheetState?.sequence?.markers) {
          const markers = sheetState.sequence.markers

          // Use the replaceMarkers state editor to load markers
          if (
            stateEditors?.studio?.historic?.projects?.stateByProjectId
              ?.stateBySheetId?.sequenceEditor?.replaceMarkers
          ) {
            stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.replaceMarkers(
              {
                sheetAddress: {projectId, sheetId},
                markers: markers,
                snappingFunction: (p: number) => p,
              },
            )
          }
        }
      }
    })
  }
}
