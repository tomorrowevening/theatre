import type {
  IBasePropType,
  PropTypeConfig_AllSimples,
} from '@tomorrowevening/theatre-core/propTypes'
import React, {useMemo} from 'react'
import {useEditingToolsForSimplePropInDetailsPanel} from '@tomorrowevening/theatre-studio/propEditors/useEditingToolsForSimpleProp'
import {SingleRowPropEditor} from '@tomorrowevening/theatre-studio/panels/DetailPanel/DeterminePropEditorForDetail/SingleRowPropEditor'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {getPointerParts} from '@tomorrowevening/theatre-dataverse'
import type SheetObject from '@tomorrowevening/theatre-core/sheetObjects/SheetObject'
import type {ISimplePropEditorReactProps} from '@tomorrowevening/theatre-studio/propEditors/simpleEditors/ISimplePropEditorReactProps'
import {whatPropIsHighlighted} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/whatPropIsHighlighted'

export type IDetailSimplePropEditorProps<
  TPropTypeConfig extends IBasePropType<string, any>,
> = {
  propConfig: TPropTypeConfig
  pointerToProp: Pointer<TPropTypeConfig['valueType']>
  obj: SheetObject
  visualIndentation: number
  SimpleEditorComponent: React.VFC<ISimplePropEditorReactProps<TPropTypeConfig>>
}

/**
 * Shown in the Object details panel, changes to this editor are usually reflected at either
 * the playhead position (the `sequence.position`) or if static, the static override value.
 */
function DetailSimplePropEditor<
  TPropTypeConfig extends PropTypeConfig_AllSimples,
>({
  propConfig,
  pointerToProp,
  obj,
  SimpleEditorComponent: EditorComponent,
}: IDetailSimplePropEditorProps<TPropTypeConfig>) {
  const editingTools = useEditingToolsForSimplePropInDetailsPanel(
    pointerToProp,
    obj,
    propConfig,
  )

  const isPropHighlightedD = useMemo(
    () =>
      whatPropIsHighlighted.getIsPropHighlightedD({
        ...obj.address,
        pathToProp: getPointerParts(pointerToProp).path,
      }),
    [pointerToProp],
  )

  return (
    <SingleRowPropEditor
      {...{
        editingTools: editingTools,
        propConfig,
        pointerToProp,
        isPropHighlightedD,
      }}
    >
      <EditorComponent
        editingTools={editingTools}
        propConfig={propConfig}
        value={editingTools.value}
      />
    </SingleRowPropEditor>
  )
}

export default React.memo(DetailSimplePropEditor)
