import useRefAndState from '@tomorrowevening/theatre-studio/utils/useRefAndState'
import type {$IntentionalAny} from '@tomorrowevening/theatre-shared/utils/types'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import type {CommitOrDiscard} from '@tomorrowevening/theatre-studio/StudioStore/StudioStore'
import useDrag from '@tomorrowevening/theatre-studio/uiComponents/useDrag'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val} from '@tomorrowevening/theatre-dataverse'
import React, {useMemo, useRef} from 'react'
import styled from 'styled-components'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {useVal} from '@tomorrowevening/theatre-react'

const Handle = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 11px;
  margin-left: -5px;
  cursor: ew-resize;
  z-index: 1;
  pointer-events: auto;

  &:hover,
  &.isDragging {
    background: linear-gradient(
      to right,
      transparent 5px,
      #478698 5px,
      #478698 6px,
      transparent 6px
    );
  }
`

const DopesheetSplitter: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({layoutP}) => {
  const leftWidth = useVal(layoutP.leftDims.width)
  const [ref, node] = useRefAndState<HTMLDivElement>(null as $IntentionalAny)
  const widthBeforeDrag = useRef(0)

  const dragOpts: Parameters<typeof useDrag>[1] = useMemo(() => {
    return {
      debugName: 'DopesheetSplitter',
      lockCursorTo: 'ew-resize',
      onDragStart() {
        let tempTransaction: CommitOrDiscard | undefined
        widthBeforeDrag.current =
          val(
            getStudio()!.atomP.historic.panels.sequenceEditor
              .dopesheetLeftWidth,
          ) ?? val(layoutP.leftDims.width)

        return {
          onDrag(dx) {
            const newWidth = Math.max(100, widthBeforeDrag.current + dx)

            tempTransaction?.discard()
            tempTransaction = getStudio()!.tempTransaction(({stateEditors}) => {
              stateEditors.studio.historic.panels.sequenceEditor.setDopesheetLeftWidth(
                newWidth,
              )
            })
          },
          onDragEnd(dragHappened) {
            if (dragHappened) {
              tempTransaction?.commit()
            } else {
              tempTransaction?.discard()
            }
          },
        }
      },
    }
  }, [])

  const [isDragging] = useDrag(node, dragOpts)

  return (
    <Handle
      ref={ref}
      className={isDragging ? 'isDragging' : ''}
      style={{left: `${leftWidth}px`}}
    />
  )
}

export default DopesheetSplitter
