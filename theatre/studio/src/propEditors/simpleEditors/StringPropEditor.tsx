import React from 'react'
import type {PropTypeConfig_String} from '@tomorrowevening/theatre-core/propTypes'
import BasicStringInput from '@tomorrowevening/theatre-studio/uiComponents/form/BasicStringInput'
import type {ISimplePropEditorReactProps} from './ISimplePropEditorReactProps'

function StringPropEditor({
  editingTools,
  value,
  autoFocus,
}: ISimplePropEditorReactProps<PropTypeConfig_String>) {
  return (
    <BasicStringInput
      value={value}
      temporarilySetValue={editingTools.temporarilySetValue}
      discardTemporaryValue={editingTools.discardTemporaryValue}
      permanentlySetValue={editingTools.permanentlySetValue}
      autoFocus={autoFocus}
    />
  )
}

export default StringPropEditor
