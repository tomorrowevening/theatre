import React from 'react'
import usePopover from '@tomorrowevening/theatre-studio/uiComponents/Popover/usePopover'
import BasicPopover from '@tomorrowevening/theatre-studio/uiComponents/Popover/BasicPopover'
import {DeterminePropEditorForKeyframeTree} from './DeterminePropEditorForSingleKeyframe'
import type {SequenceTrackId} from '@tomorrowevening/theatre-shared/utils/ids'
import type {Keyframe} from '@tomorrowevening/theatre-core/projects/store/types/SheetState_Historic'
import type SheetObject from '@tomorrowevening/theatre-core/sheetObjects/SheetObject'
import type {
  PropTypeConfig_AllSimples,
  PropTypeConfig_Compound,
  PropTypeConfig_Enum,
} from '@tomorrowevening/theatre-core/propTypes'
import type {PathToProp} from '@tomorrowevening/theatre-shared/utils/addresses'
import type {UnknownValidCompoundProps} from '@tomorrowevening/theatre-core/propTypes/internals'

/** The editor that pops up when directly clicking a Keyframe. */
export function useKeyframeInlineEditorPopover(
  props: EditingOptionsTree[] | null,
) {
  return usePopover({debugName: 'useKeyframeInlineEditorPopover'}, () => (
    <BasicPopover showPopoverEdgeTriangle>
      <div style={{margin: '1px 2px 1px 10px'}}>
        {!Array.isArray(props)
          ? undefined
          : props.map((prop, i) => (
              <DeterminePropEditorForKeyframeTree
                key={i}
                {...prop}
                autoFocusInput={i === 0}
                indent={0}
              />
            ))}
      </div>
    </BasicPopover>
  ))
}

export type EditingOptionsTree =
  | SheetObjectEditingOptionsTree
  | PropWithChildrenEditingOptionsTree
  | PrimitivePropEditingOptions
export type SheetObjectEditingOptionsTree = {
  type: 'sheetObject'
  sheetObject: SheetObject
  children: EditingOptionsTree[]
}
export type PropWithChildrenEditingOptionsTree = {
  type: 'propWithChildren'
  propConfig: PropTypeConfig_Compound<UnknownValidCompoundProps>
  pathToProp: PathToProp
  children: EditingOptionsTree[]
}
export type PrimitivePropEditingOptions = {
  type: 'primitiveProp'
  keyframe: Keyframe
  propConfig: PropTypeConfig_AllSimples | PropTypeConfig_Enum // note: enums are not implemented yet
  sheetObject: SheetObject
  trackId: SequenceTrackId
  pathToProp: PathToProp
}
