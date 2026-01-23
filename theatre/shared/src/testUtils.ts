/* eslint-disable no-restricted-syntax */
import '@tomorrowevening/theatre-studio'
import {getProject} from '@tomorrowevening/theatre-core'
import {privateAPI} from '@tomorrowevening/theatre-core/privateAPIs'
import type {ProjectState_Historic} from '@tomorrowevening/theatre-core/projects/store/storeTypes'
import type {SheetState_Historic} from '@tomorrowevening/theatre-core/projects/store/types/SheetState_Historic'
import * as t from '@tomorrowevening/theatre-core/propTypes'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import {getCoreTicker} from '@tomorrowevening/theatre-core/coreTicker'
import globals from './globals'
import type {SheetId} from './utils/ids'
/* eslint-enable no-restricted-syntax */

const defaultProps = {
  position: {
    x: 0,
    y: 0,
    z: 0,
  },
  color: t.rgba(),
  deeply: {
    nested: {
      checkbox: true,
    },
  },
}

let lastProjectN = 0

const studio = getStudio()!
void studio.initialize({usePersistentStorage: false})

export async function setupTestSheet(sheetState: SheetState_Historic) {
  const projectState: ProjectState_Historic = {
    definitionVersion: globals.currentProjectStateDefinitionVersion,
    sheetsById: {
      ['Sheet' as SheetId]: sheetState,
    },
    revisionHistory: [],
  }
  const project = getProject('Test Project ' + lastProjectN++, {
    state: projectState,
  })

  const ticker = getCoreTicker()

  ticker.tick()
  await project.ready
  const sheetPublicAPI = project.sheet('Sheet')
  const objPublicAPI = sheetPublicAPI.object('obj', defaultProps)

  const obj = privateAPI(objPublicAPI)

  return {
    obj,
    objPublicAPI,
    sheet: privateAPI(sheetPublicAPI),
    project,
    ticker,
    studio,
  }
}
