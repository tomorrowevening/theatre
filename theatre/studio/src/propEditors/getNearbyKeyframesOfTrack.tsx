import type {
  TrackData,
  Keyframe,
} from '@tomorrowevening/theatre-core/projects/store/types/SheetState_Historic'
import type SheetObject from '@tomorrowevening/theatre-core/sheetObjects/SheetObject'
import {createStudioSheetItemKey} from '@tomorrowevening/theatre-shared/utils/ids'
import type {
  KeyframeWithTrack,
  TrackWithId,
} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/collectAggregateKeyframes'

const cache = new WeakMap<
  TrackData,
  [seqPosition: number, nearbyKeyframes: NearbyKeyframes]
>()

const noKeyframes: NearbyKeyframes = {}

export function getNearbyKeyframesOfTrack(
  obj: SheetObject,
  track: TrackWithId | undefined,
  sequencePosition: number,
): NearbyKeyframes {
  if (!track || track.data.keyframes.length === 0) return noKeyframes

  const cachedItem = cache.get(track.data)
  if (cachedItem && cachedItem[0] === sequencePosition) {
    return cachedItem[1]
  }

  function getKeyframeWithTrackId(idx: number): KeyframeWithTrack | undefined {
    if (!track) return
    const found = track.data.keyframes[idx]
    return (
      found && {
        kf: found,
        track,
        itemKey: createStudioSheetItemKey.forTrackKeyframe(
          obj,
          track.id,
          found.id,
        ),
      }
    )
  }

  const calculate = (): NearbyKeyframes => {
    const nextOrCurIdx = track.data.keyframes.findIndex(
      (kf) => kf.position >= sequencePosition,
    )

    if (nextOrCurIdx === -1) {
      return {
        prev: getKeyframeWithTrackId(track.data.keyframes.length - 1),
      }
    }

    const nextOrCur = getKeyframeWithTrackId(nextOrCurIdx)!
    if (nextOrCur.kf.position === sequencePosition) {
      return {
        prev: getKeyframeWithTrackId(nextOrCurIdx - 1),
        cur: nextOrCur,
        next: getKeyframeWithTrackId(nextOrCurIdx + 1),
      }
    } else {
      return {
        next: nextOrCur,
        prev: getKeyframeWithTrackId(nextOrCurIdx - 1),
      }
    }
  }

  const result = calculate()
  cache.set(track.data, [sequencePosition, result])

  return result
}

export type NearbyKeyframes = {
  prev?: KeyframeWithTrack
  cur?: KeyframeWithTrack
  next?: KeyframeWithTrack
}
