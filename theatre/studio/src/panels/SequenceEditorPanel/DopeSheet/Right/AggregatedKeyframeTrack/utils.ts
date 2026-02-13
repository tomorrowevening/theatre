import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val, pointerToPrism} from '@tomorrowevening/theatre-dataverse'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {
  SequenceEditorTree_PropWithChildren,
  SequenceEditorTree_Sheet,
  SequenceEditorTree_SheetObject,
} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import type {AggregatedKeyframes} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/collectAggregateKeyframes'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import {keyframesWithPaths} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/selections'
import {
  commonRootOfPathsToProps,
  encodePathToProp,
} from '@tomorrowevening/theatre-shared/utils/addresses'
import type {KeyframeWithPathToPropFromCommonRoot} from '@tomorrowevening/theatre-studio/store/types'
import type Sequence from '@tomorrowevening/theatre-core/sequences/Sequence'
import type {
  PropAddress,
} from '@tomorrowevening/theatre-shared/utils/addresses'
import type SheetObject from '@tomorrowevening/theatre-core/sheetObjects/SheetObject'
import {
  getPropConfigByPath,
  iteratePropType,
  isPropConfigComposite,
} from '@tomorrowevening/theatre-shared/propTypes/utils'
import type {SequenceTrackId} from '@tomorrowevening/theatre-shared/utils/ids'

/**
 * Paste keyframes at the current sequence position
 */
export function pasteKeyframesAtCurrent(
  viewModel:
    | SequenceEditorTree_PropWithChildren
    | SequenceEditorTree_SheetObject
    | SequenceEditorTree_Sheet,
  layoutP: Pointer<SequenceEditorPanelLayout>,
  keyframes: KeyframeWithPathToPropFromCommonRoot[],
): void {
  const sheet = val(layoutP.sheet)
  const sequence = sheet.getSequence()

  if (viewModel.type === 'sheet') {
    pasteKeyframesSheet(viewModel, keyframes, sequence)
  } else {
    pasteKeyframesObjectOrCompound(viewModel, keyframes, sequence)
  }
}

interface PlaceableKeyframe {
  keyframe: KeyframeWithPathToPropFromCommonRoot['keyframe']
  trackId?: string
  address: PropAddress
  sheetObject: SheetObject
}

/**
 * Given a list of keyframes that contain paths relative to a common root,
 * this function pastes those keyframes into tracks on either the object or compound prop.
 */
function pasteKeyframesSheet(
  viewModel: SequenceEditorTree_Sheet,
  keyframes: KeyframeWithPathToPropFromCommonRoot[],
  sequence: Sequence,
) {
  const {projectId, sheetId} = viewModel.sheet.address

  const areKeyframesAllOnSingleTrack = keyframes.every(
    ({pathToProp}) => pathToProp.length === 0,
  )

  const placeableKeyframes: PlaceableKeyframe[] = []

  const objectMap = new Map<string, SheetObject>()
  for (const child of viewModel.children) {
    if (child.type === 'sheetObject') {
      objectMap.set(child.sheetObject.address.objectKey, child.sheetObject)
    }
  }

  if (areKeyframesAllOnSingleTrack) {
    // Broadcast mode: existing behavior - paste to all existing tracks
    for (const object of viewModel.children
      .filter(
        (child): child is SequenceEditorTree_SheetObject =>
          child.type === 'sheetObject',
      )
      .map((child) => child.sheetObject)) {
      const tracksByObject = pointerToPrism(
        getStudio().atomP.historic.coreByProject[projectId].sheetsById[sheetId]
          .sequence.tracksByObject[object.address.objectKey],
      ).getValue()

      const trackIdsOnObject = Object.keys(tracksByObject?.trackData ?? {})

      for (const trackId of trackIdsOnObject) {
        for (const {keyframe} of keyframes) {
          placeableKeyframes.push({
            keyframe,
            trackId,
            address: {...object.address, pathToProp: []}, // Path doesn't matter for existing trackId
            sheetObject: object,
          })
        }
      }
    }
  } else {
    // Relative paths mode
    const tracksByObjectPrism = pointerToPrism(
      getStudio().atomP.historic.coreByProject[projectId].sheetsById[sheetId]
        .sequence.tracksByObject,
    ).getValue()

    for (const {keyframe, pathToProp} of keyframes) {
      if (pathToProp.length === 0) continue
      const objectKey = pathToProp[0] as string
      const relativePathToProp = pathToProp.slice(1)
      const sheetObject = objectMap.get(objectKey)

      if (!sheetObject) continue

      const tracksByObject = (tracksByObjectPrism as any)?.[objectKey]
      const pathToPropEncoded = encodePathToProp(relativePathToProp)
      const maybeTrackId = (tracksByObject?.trackIdByPropPath as any)?.[
        pathToPropEncoded
      ]

      placeableKeyframes.push({
        keyframe,
        trackId: maybeTrackId,
        address: {
          ...sheetObject.address,
          pathToProp: relativePathToProp,
        },
        sheetObject,
      })
    }
  }

  pasteKeyframesToTargets(placeableKeyframes, sequence)
}

function pasteKeyframesObjectOrCompound(
  viewModel:
    | SequenceEditorTree_PropWithChildren
    | SequenceEditorTree_SheetObject,
  keyframes: KeyframeWithPathToPropFromCommonRoot[],
  sequence: Sequence,
) {
  const {projectId, sheetId, objectKey} = viewModel.sheetObject.address
  const sheetObject = viewModel.sheetObject

  const trackRecords = pointerToPrism(
    getStudio().atomP.historic.coreByProject[projectId].sheetsById[sheetId]
      .sequence.tracksByObject[objectKey],
  ).getValue()

  const areKeyframesAllOnSingleTrack = keyframes.every(
    ({pathToProp}) => pathToProp.length === 0,
  )

  const placeableKeyframes: PlaceableKeyframe[] = []

  if (areKeyframesAllOnSingleTrack) {
    if (viewModel.type === 'sheetObject') {
      // Pasting single curve to Sheet Object -> Broadcast to all existing tracks
      const trackIdsOnObject = Object.keys(trackRecords?.trackData ?? {})
      for (const trackId of trackIdsOnObject) {
        for (const {keyframe} of keyframes) {
          placeableKeyframes.push({
            keyframe,
            trackId,
            address: {...sheetObject.address, pathToProp: []},
            sheetObject,
          })
        }
      }
    } else {
      // Pasting single curve to a Compound/Simple Prop
      // We want to target ALL sequencable props under this root
      const rootPath = viewModel.pathToProp
      const propConfig = getPropConfigByPath(
        sheetObject.template.staticConfig,
        rootPath,
      )

      if (propConfig) {
        for (const {path, conf} of iteratePropType(propConfig, rootPath)) {
          if (isPropConfigComposite(conf)) continue // Skip compounds, only simple props are sequencable
          const fullPath = path
          const fullPathEncoded = encodePathToProp(fullPath)
          const maybeTrackId = (trackRecords?.trackIdByPropPath as any)?.[
            fullPathEncoded
          ]

          // Add to targets (even if trackId is missing)
          for (const {keyframe} of keyframes) {
            placeableKeyframes.push({
              keyframe,
              trackId: maybeTrackId,
              address: {...sheetObject.address, pathToProp: fullPath},
              sheetObject,
            })
          }
        }
      }
    }
  } else {
    // Relative paths mode
    const trackIdByPropPathAny = (trackRecords?.trackIdByPropPath || {}) as any
    const rootPath =
      viewModel.type === 'propWithChildren' ? viewModel.pathToProp : []

    for (const {keyframe, pathToProp: relativePathToProp} of keyframes) {
      const fullPath = [...rootPath, ...relativePathToProp]
      const pathToPropEncoded = encodePathToProp(fullPath)
      const maybeTrackId = trackIdByPropPathAny[pathToPropEncoded]

      placeableKeyframes.push({
        keyframe,
        trackId: maybeTrackId,
        address: {...sheetObject.address, pathToProp: fullPath},
        sheetObject,
      })
    }
  }

  pasteKeyframesToTargets(placeableKeyframes, sequence)
}

function pasteKeyframesToTargets(
  targets: PlaceableKeyframe[],
  sequence: Sequence,
) {
  if (targets.length === 0) return

  sequence.position = sequence.closestGridPosition(sequence.position)
  const keyframeOffset = earliestKeyframe(targets.map(({keyframe}) => keyframe))
    ?.position!

  getStudio()!.transaction(({stateEditors, drafts}) => {
    for (const target of targets) {
      const {keyframe, address, sheetObject} = target
      let trackId = target.trackId

      // If track doesn't exist, try to create it
      if (!trackId) {
        // Resolve prop config. We're in a transaction now, but sheetObject.template is stable.
        const propConfig = getPropConfigByPath(
          sheetObject.template.staticConfig,
          address.pathToProp,
        )

        // Only sequence if it's a simple prop (sequencable)
        if (propConfig && !isPropConfigComposite(propConfig)) {
          stateEditors.coreByProject.historic.sheetsById.sequence.setPrimitivePropAsSequenced(
            address,
            propConfig,
          )

          // Read back the new trackId
          // The stateEditors proxy should reflect the change in the same transaction
          // We need to look up tracksByObject again
          const tracks =
            drafts.historic.coreByProject[address.projectId]?.sheetsById[
              address.sheetId
            ]?.sequence?.tracksByObject[address.objectKey]

          if (tracks) {
            const encodedPath = encodePathToProp(address.pathToProp)
            trackId = tracks.trackIdByPropPath[encodedPath]
          }
        }
      }

      if (trackId) {
        stateEditors.coreByProject.historic.sheetsById.sequence.setKeyframeAtPosition(
          {
            ...address,
            trackId: trackId as SequenceTrackId,
            position: sequence.position + keyframe.position - keyframeOffset,
            handles: keyframe.handles,
            value: keyframe.value,
            snappingFunction: sequence.closestGridPosition,
            type: keyframe.type,
          },
        )
      }
    }
  })
}

function earliestKeyframe(keyframes: any[]) {
  let curEarliest: any = null
  for (const keyframe of keyframes) {
    if (curEarliest === null || keyframe.position < curEarliest.position) {
      curEarliest = keyframe
    }
  }
  return curEarliest
}

export function copyKeyframes(
  viewModel:
    | SequenceEditorTree_PropWithChildren
    | SequenceEditorTree_SheetObject
    | SequenceEditorTree_Sheet,
  aggregatedKeyframes: AggregatedKeyframes,
): void {
  const positions = Array.from(aggregatedKeyframes.byPosition.keys())
  if (positions.length === 0) return

  const keyframeRange = {
    first: Math.min(...positions),
    last: Math.max(...positions),
  }

  const kfs: KeyframeWithPathToPropFromCommonRoot[] =
    aggregatedKeyframes.tracks.flatMap(
      (track) =>
        keyframesWithPaths({
          ...track.sheetObject.address,
          trackId: track.id,
          keyframeIds: track.data.keyframes
            .filter(
              (kf) =>
                kf.position >= keyframeRange!.first &&
                kf.position <= keyframeRange!.last,
            )
            .map((kf) => kf.id),
        }) ?? [],
    )

  const basePathRelativeToSheet =
    viewModel.type === 'sheet'
      ? []
      : viewModel.type === 'sheetObject'
      ? [viewModel.sheetObject.address.objectKey]
      : viewModel.type === 'propWithChildren'
      ? [viewModel.sheetObject.address.objectKey, ...viewModel.pathToProp]
      : []

  const commonPath = commonRootOfPathsToProps([
    basePathRelativeToSheet,
    ...kfs.map((kf) => kf.pathToProp),
  ])

  const keyframesWithCommonRootPath = kfs.map(({keyframe, pathToProp}) => ({
    keyframe,
    pathToProp: pathToProp.slice(commonPath.length),
  }))
  getStudio().transaction((api) => {
    api.stateEditors.studio.ahistoric.setClipboardKeyframes(
      keyframesWithCommonRootPath,
    )
  })
}
