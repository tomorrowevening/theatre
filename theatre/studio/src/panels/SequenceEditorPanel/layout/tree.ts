import type {
  PropTypeConfig,
  PropTypeConfig_AllSimples,
  PropTypeConfig_Compound,
} from '@tomorrowevening/theatre-core/propTypes'
import type SheetObject from '@tomorrowevening/theatre-core/sheetObjects/SheetObject'
import type {IPropPathToTrackIdTree} from '@tomorrowevening/theatre-core/sheetObjects/SheetObjectTemplate'
import type Sheet from '@tomorrowevening/theatre-core/sheets/Sheet'
import type {PathToProp} from '@tomorrowevening/theatre-shared/utils/addresses'
import type {
  SequenceTrackId,
  StudioSheetItemKey,
  SequenceSubSequenceId,
} from '@tomorrowevening/theatre-shared/utils/ids'
import {createStudioSheetItemKey} from '@tomorrowevening/theatre-shared/utils/ids'
import type {
  $FixMe,
  $IntentionalAny,
} from '@tomorrowevening/theatre-shared/utils/types'
import {prism, val} from '@tomorrowevening/theatre-dataverse'
import logger from '@tomorrowevening/theatre-shared/logger'
import type {Studio} from '@tomorrowevening/theatre-studio/Studio'
import type {UnknownValidCompoundProps} from '@tomorrowevening/theatre-core/propTypes/internals'
import {
  audioStore,
  sheetAudioKey,
} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/audioStore'

/**
 * Base "view model" for each row with common
 * required information such as row heights & depth.
 */
export type SequenceEditorTree_Row<TypeName extends string> = {
  /** type of this row, e.g. `"sheet"` or `"sheetObject"` */
  type: TypeName
  /** Height of just the row in pixels */
  nodeHeight: number
  /** Height of the row + height with children in pixels */
  heightIncludingChildren: number

  /** Visual indentation */
  depth: number
  /** A convenient studio sheet localized identifier for managing presence and ephemeral visual effects. */
  sheetItemKey: StudioSheetItemKey
  /** Parent's sheetItemKey, for reordering (sheet has no parent) */
  parentSheetItemKey?: StudioSheetItemKey
  /**
   * This is a part of the tree, but it is not rendered at all,
   * and it doesn't contribute to height.
   *
   * In the future, if we have a filtering mechanism like "show only position props",
   * this would not be the place to make false, that node should just not be included
   * in the tree at all, so it doesn't affect aggregate keyframes.
   */
  shouldRender: boolean
  /**
   * Distance in pixels from the top of this row to the row container's top
   * This can be used to help figure out what's being box selected (marquee).
   */
  top: number
  /** Row number (e.g. for correctly styling even / odd alternating styles) */
  n: number
}

export type SequenceEditorTree = SequenceEditorTree_Sheet

export type SequenceEditorTree_AttachedAudio =
  SequenceEditorTree_Row<'attachedAudio'> & {
    sheet: Sheet
    audioId: string
    audio: {
      label: string
      color: string
      startTime: number
      duration: number
    }
  }

export type SequenceEditorTree_Sheet = SequenceEditorTree_Row<'sheet'> & {
  sheet: Sheet
  isCollapsed: boolean
  children: Array<
    | SequenceEditorTree_AttachedAudio
    | SequenceEditorTree_SheetObject
    | SequenceEditorTree_SubSequence
  >
}

export type SequenceEditorTree_SheetObject =
  SequenceEditorTree_Row<'sheetObject'> & {
    isCollapsed: boolean
    sheetObject: SheetObject
    children: Array<
      SequenceEditorTree_PropWithChildren | SequenceEditorTree_PrimitiveProp
    >
  }

export type SequenceEditorTree_PropWithChildren =
  SequenceEditorTree_Row<'propWithChildren'> & {
    isCollapsed: boolean
    sheetObject: SheetObject
    propConf: PropTypeConfig_Compound<UnknownValidCompoundProps>
    pathToProp: PathToProp
    children: Array<
      SequenceEditorTree_PropWithChildren | SequenceEditorTree_PrimitiveProp
    >
    trackMapping: IPropPathToTrackIdTree
  }

export type SequenceEditorTree_PrimitiveProp =
  SequenceEditorTree_Row<'primitiveProp'> & {
    sheetObject: SheetObject
    pathToProp: PathToProp
    trackId?: SequenceTrackId
    propConf: PropTypeConfig_AllSimples
  }

export type SequenceEditorTree_SubSequence =
  SequenceEditorTree_Row<'subSequence'> & {
    subSequence: {
      id: SequenceSubSequenceId
      sheetId: string
      position: number
      duration: number
      timeScale: number
      label: string
    }
    sheet: Sheet
  }

export type SequenceEditorTree_AllRowTypes =
  | SequenceEditorTree_Sheet
  | SequenceEditorTree_AttachedAudio
  | SequenceEditorTree_SheetObject
  | SequenceEditorTree_PropWithChildren
  | SequenceEditorTree_PrimitiveProp
  | SequenceEditorTree_SubSequence

const HEIGHT_OF_ANY_TITLE = 28

/**
 * Must run inside prism()
 */
export const calculateSequenceEditorTree = (
  sheet: Sheet,
  studio: Studio,
): SequenceEditorTree => {
  prism.ensurePrism()
  // The sheet row is redundant in the sequence editor; keep it in the view model
  // for positioning but don't render it.
  const rootShouldRender = false
  let topSoFar = 30 + (rootShouldRender ? HEIGHT_OF_ANY_TITLE : 0)
  let nSoFar = 0

  const ahistoricSheetState = val(
    studio.atomP.ahistoric.projects.stateByProjectId[sheet.address.projectId]
      .stateBySheetId[sheet.address.sheetId].sequence,
  )
  const collapsableItemSetP =
    studio.atomP.ahistoric.projects.stateByProjectId[sheet.address.projectId]
      .stateBySheetId[sheet.address.sheetId].sequence.collapsableItems
  const sheetItemDisplayOrder = ahistoricSheetState?.sheetItemDisplayOrder

  // Since we no longer render the root sheet row, ignore its collapsed state.
  const isCollapsed = false

  const tree: SequenceEditorTree = {
    type: 'sheet',
    isCollapsed,
    sheet,
    children: [],
    sheetItemKey: createStudioSheetItemKey.forSheet(),
    shouldRender: rootShouldRender,
    top: 60,
    depth: 0,
    n: nSoFar,
    nodeHeight: rootShouldRender ? HEIGHT_OF_ANY_TITLE : 0,
    heightIncludingChildren: -1, // calculated below
  }

  if (rootShouldRender) {
    nSoFar += 1
  }

  // Add one row per attached audio (top of the list)
  const allAudio = val(audioStore.pointer)
  const audioEntries =
    allAudio[sheetAudioKey(sheet.address.projectId, sheet.address.sheetId)] ??
    []
  for (const audioEntry of audioEntries) {
    const audioRow: SequenceEditorTree_AttachedAudio = {
      type: 'attachedAudio',
      sheet,
      audioId: audioEntry.id,
      audio: {
        label: audioEntry.label,
        color: audioEntry.color,
        startTime: audioEntry.startTime,
        duration: audioEntry.duration,
      },
      sheetItemKey:
        `sheet/attachedAudio/${audioEntry.id}` as StudioSheetItemKey,
      parentSheetItemKey: tree.sheetItemKey,
      shouldRender: true,
      top: topSoFar,
      depth: tree.depth + 1,
      n: nSoFar,
      nodeHeight: HEIGHT_OF_ANY_TITLE,
      heightIncludingChildren: HEIGHT_OF_ANY_TITLE,
    }
    tree.children.push(audioRow)
    topSoFar += HEIGHT_OF_ANY_TITLE
    nSoFar += 1
  }

  for (const sheetObject of Object.values(val(sheet.objectsP))) {
    if (sheetObject) {
      addObject(
        sheetObject,
        tree.children as Array<SequenceEditorTree_SheetObject>,
        tree.depth + 1,
        true,
      )
    }
  }

  // Add sub-sequences to the tree
  const sheetState = val(
    studio.atomP.historic.projects.stateByProjectId[sheet.address.projectId]
      .stateBySheetId[sheet.address.sheetId],
  )
  // @ts-ignore
  const sequenceEditor = val(sheetState.sequenceEditor)
  if (sequenceEditor) {
    const subSequenceSet = sequenceEditor.subSequenceSet
    if (subSequenceSet) {
      // Convert PointableSet to array
      const subSequences: Array<SequenceEditorTree_SubSequence['subSequence']> =
        Object.values(subSequenceSet.byId || {})
          .filter((val): val is any => val !== undefined)
          .map((subSequence: any) => subSequence)
          .sort((a, b) => a.position - b.position)

      for (const subSequence of subSequences) {
        const subSequenceRow: SequenceEditorTree_SubSequence = {
          type: 'subSequence',
          subSequence,
          sheet,
          sheetItemKey: createStudioSheetItemKey.forSubSequence(subSequence.id),
          parentSheetItemKey: tree.sheetItemKey,
          shouldRender: true,
          top: topSoFar,
          depth: tree.depth + 1,
          n: nSoFar,
          nodeHeight: HEIGHT_OF_ANY_TITLE,
          heightIncludingChildren: HEIGHT_OF_ANY_TITLE,
        }
        tree.children.push(subSequenceRow)
        topSoFar += HEIGHT_OF_ANY_TITLE
        nSoFar += 1
      }
    }
  }

  tree.heightIncludingChildren = topSoFar - tree.top

  // Apply display order if present, then recompute layout
  if (sheetItemDisplayOrder) {
    const orderByKey =
      (order: StudioSheetItemKey[]) =>
      (
        a: {sheetItemKey: StudioSheetItemKey},
        b: {sheetItemKey: StudioSheetItemKey},
      ) => {
        const ia = order.indexOf(a.sheetItemKey)
        const ib = order.indexOf(b.sheetItemKey)
        if (ia === -1 && ib === -1) return 0
        if (ia === -1) return 1
        if (ib === -1) return -1
        return ia - ib
      }
    const applyOrderAndRelayout = (
      node: SequenceEditorTree_AllRowTypes,
      parentTop: number,
      parentN: number,
    ): {top: number; n: number} => {
      let topSoFar = parentTop
      let nSoFar = parentN
      if (node.shouldRender) {
        ;(node as SequenceEditorTree_Row<string>).top = topSoFar
        ;(node as SequenceEditorTree_Row<string>).n = nSoFar
        nSoFar += 1
        topSoFar += (node as SequenceEditorTree_Row<string>).nodeHeight
      }
      if ('children' in node && Array.isArray(node.children)) {
        const children = node.children as Array<{
          sheetItemKey: StudioSheetItemKey
          parentSheetItemKey?: StudioSheetItemKey
        }>
        const parentKey = (node as SequenceEditorTree_Row<string>).sheetItemKey
        const childOrder =
          parentKey === createStudioSheetItemKey.forSheet()
            ? sheetItemDisplayOrder.sheetLevelOrder
            : sheetItemDisplayOrder.childrenOrderByParentKey?.[parentKey]
        if (childOrder && childOrder.length > 0) {
          const isAudio = (k: StudioSheetItemKey) =>
            k.startsWith('sheet/attachedAudio/')
          const baseSort = orderByKey(childOrder)
          children.sort((a, b) => {
            // const aAudio = isAudio(a.sheetItemKey)
            // const bAudio = isAudio(b.sheetItemKey)
            // if (aAudio && !bAudio) return -1
            // if (!aAudio && bAudio) return 1
            return baseSort(a, b)
          })
        }
        const isCollapsed = 'isCollapsed' in node ? node.isCollapsed : false
        const shouldRecurse = node.type === 'sheet' || !isCollapsed
        if (shouldRecurse) {
          for (const child of children) {
            const result = applyOrderAndRelayout(
              child as SequenceEditorTree_AllRowTypes,
              topSoFar,
              nSoFar,
            )
            topSoFar = result.top
            nSoFar = result.n
          }
        }
        if (node.type !== 'sheet') {
          ;(node as SequenceEditorTree_Row<string>).heightIncludingChildren =
            topSoFar - (node as SequenceEditorTree_Row<string>).top
        }
      }
      return {top: topSoFar, n: nSoFar}
    }
    if (
      sheetItemDisplayOrder.sheetLevelOrder &&
      sheetItemDisplayOrder.sheetLevelOrder.length > 0
    ) {
      const isAudio = (k: StudioSheetItemKey) =>
        k.startsWith('sheet/attachedAudio/')
      const baseSort = orderByKey(sheetItemDisplayOrder.sheetLevelOrder)
      tree.children.sort((a, b) => {
        const aAudio = isAudio(a.sheetItemKey)
        const bAudio = isAudio(b.sheetItemKey)
        if (aAudio && !bAudio) return -1
        if (!aAudio && bAudio) return 1
        return baseSort(a, b)
      })
    }
    // Use same initial top as natural layout (30), not tree.top (60)
    const initialTop = 30 + (rootShouldRender ? HEIGHT_OF_ANY_TITLE : 0)
    const {top: finalTop} = applyOrderAndRelayout(tree, initialTop, 0)
    tree.heightIncludingChildren = finalTop - tree.top
  }

  function addObject(
    sheetObject: SheetObject,
    arrayOfChildren: Array<SequenceEditorTree_SheetObject>,
    level: number,
    shouldRender: boolean,
  ) {
    const trackSetups = val(
      sheetObject.template.getMapOfValidSequenceTracks_forStudio(),
    )
    const objectConfig = val(sheetObject.template.configPointer)

    // Always show the object if it has any properties, not just if it has sequenced tracks
    if (Object.keys(objectConfig.props).length === 0) return

    const isCollapsed =
      val(
        collapsableItemSetP.byId[
          createStudioSheetItemKey.forSheetObject(sheetObject)
        ].isCollapsed,
      ) ?? true

    const row: SequenceEditorTree_SheetObject = {
      type: 'sheetObject',
      isCollapsed,
      sheetItemKey: createStudioSheetItemKey.forSheetObject(sheetObject),
      parentSheetItemKey: tree.sheetItemKey,
      shouldRender,
      top: topSoFar,
      children: [],
      depth: level,
      n: nSoFar,
      sheetObject: sheetObject,
      nodeHeight: shouldRender ? HEIGHT_OF_ANY_TITLE : 0,
      heightIncludingChildren: -1, // calculated below
    }
    arrayOfChildren.push(row)

    if (shouldRender) {
      nSoFar += 1
      // As we add rows to the tree, top to bottom, we accumulate the pixel
      // distance to the top of the tree from the bottom of the current row:
      topSoFar += row.nodeHeight
    }

    addProps(
      sheetObject,
      objectConfig.props,
      trackSetups,
      [],
      objectConfig,
      row.children,
      level + 1,
      shouldRender && !isCollapsed,
      row.sheetItemKey,
    )

    row.heightIncludingChildren = topSoFar - row.top
  }

  function addProps(
    sheetObject: SheetObject,
    propsConfig: PropTypeConfig_Compound<$IntentionalAny>['props'],
    trackSetups: IPropPathToTrackIdTree,
    pathSoFar: PathToProp,
    parentPropConfig: PropTypeConfig_Compound<$IntentionalAny>,
    arrayOfChildren: Array<
      SequenceEditorTree_PrimitiveProp | SequenceEditorTree_PropWithChildren
    >,
    level: number,
    shouldRender: boolean,
    parentSheetItemKey: StudioSheetItemKey,
  ) {
    for (const [propKey, propConfig] of Object.entries(propsConfig)) {
      const trackOrMapping = trackSetups[propKey]
      addProp(
        sheetObject,
        trackOrMapping,
        [...pathSoFar, propKey],
        propConfig,
        arrayOfChildren,
        level,
        shouldRender,
        parentSheetItemKey,
      )
    }
  }

  function addProp(
    sheetObject: SheetObject,
    trackIdOrMapping: SequenceTrackId | IPropPathToTrackIdTree | undefined,
    pathToProp: PathToProp,
    conf: PropTypeConfig,
    arrayOfChildren: Array<
      SequenceEditorTree_PrimitiveProp | SequenceEditorTree_PropWithChildren
    >,
    level: number,
    shouldRender: boolean,
    parentSheetItemKey: StudioSheetItemKey,
  ) {
    if (conf.type === 'compound') {
      const trackMapping =
        (trackIdOrMapping as $IntentionalAny as IPropPathToTrackIdTree) || {}
      addProp_compound(
        sheetObject,
        trackMapping,
        conf,
        pathToProp,
        conf,
        arrayOfChildren,
        level,
        shouldRender,
        parentSheetItemKey,
      )
    } else if (conf.type === 'enum') {
      logger.warn('Prop type enum is not yet supported in the sequence editor')
    } else {
      const trackId = trackIdOrMapping as $IntentionalAny as
        | SequenceTrackId
        | undefined

      addProp_primitive(
        sheetObject,
        trackId,
        pathToProp,
        conf,
        arrayOfChildren,
        level,
        shouldRender,
        parentSheetItemKey,
      )
    }
  }

  function addProp_compound(
    sheetObject: SheetObject,
    trackMapping: IPropPathToTrackIdTree,
    propConf: PropTypeConfig_Compound<UnknownValidCompoundProps>,
    pathToProp: PathToProp,
    conf: PropTypeConfig_Compound<$FixMe>,
    arrayOfChildren: Array<
      SequenceEditorTree_PrimitiveProp | SequenceEditorTree_PropWithChildren
    >,
    level: number,
    shouldRender: boolean,
    parentSheetItemKey: StudioSheetItemKey,
  ) {
    const isCollapsed =
      val(
        collapsableItemSetP.byId[
          createStudioSheetItemKey.forSheetObjectProp(sheetObject, pathToProp)
        ].isCollapsed,
      ) ?? false

    const row: SequenceEditorTree_PropWithChildren = {
      type: 'propWithChildren',
      isCollapsed,
      propConf,
      pathToProp,
      sheetItemKey: createStudioSheetItemKey.forSheetObjectProp(
        sheetObject,
        pathToProp,
      ),
      parentSheetItemKey: parentSheetItemKey,
      sheetObject: sheetObject,
      shouldRender,
      top: topSoFar,
      children: [],
      nodeHeight: shouldRender ? HEIGHT_OF_ANY_TITLE : 0,
      heightIncludingChildren: -1,
      depth: level,
      trackMapping,
      n: nSoFar,
    }
    arrayOfChildren.push(row)

    if (shouldRender) {
      topSoFar += row.nodeHeight
      nSoFar += 1
    }

    addProps(
      sheetObject,
      conf.props,
      trackMapping,
      pathToProp,
      conf,
      row.children,
      level + 1,
      // collapsed shouldn't render child props
      shouldRender && !isCollapsed,
      row.sheetItemKey,
    )
    // }
    row.heightIncludingChildren = topSoFar - row.top
  }

  function addProp_primitive(
    sheetObject: SheetObject,
    trackId: SequenceTrackId | undefined,
    pathToProp: PathToProp,
    propConf: PropTypeConfig_AllSimples,
    arrayOfChildren: Array<
      SequenceEditorTree_PrimitiveProp | SequenceEditorTree_PropWithChildren
    >,
    level: number,
    shouldRender: boolean,
    parentSheetItemKey: StudioSheetItemKey,
  ) {
    const row: SequenceEditorTree_PrimitiveProp = {
      type: 'primitiveProp',
      propConf: propConf,
      depth: level,
      sheetItemKey: createStudioSheetItemKey.forSheetObjectProp(
        sheetObject,
        pathToProp,
      ),
      parentSheetItemKey,
      sheetObject: sheetObject,
      pathToProp,
      shouldRender,
      top: topSoFar,
      nodeHeight: shouldRender ? HEIGHT_OF_ANY_TITLE : 0,
      heightIncludingChildren: shouldRender ? HEIGHT_OF_ANY_TITLE : 0,
      trackId,
      n: nSoFar,
    }
    arrayOfChildren.push(row)
    nSoFar += 1
    topSoFar += row.nodeHeight
  }

  return tree
}
