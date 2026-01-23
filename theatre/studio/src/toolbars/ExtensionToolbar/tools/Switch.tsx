import React from 'react'
import styled from 'styled-components'
import {pointerEventsAutoInNormalMode} from '@tomorrowevening/theatre-studio/css'
import type {ToolConfigSwitch} from '@tomorrowevening/theatre-studio/TheatreStudio'
import ToolbarSwitchSelect from '@tomorrowevening/theatre-studio/uiComponents/toolbar/ToolbarSwitchSelect'

const IconContainer = styled.div`
  ${pointerEventsAutoInNormalMode};
  & > svg {
    width: 1em;
    height: 1em;
    pointer-events: none;
  }
`

const Switch: React.FC<{
  config: ToolConfigSwitch
}> = ({config}) => {
  return (
    <ToolbarSwitchSelect
      onChange={config.onChange}
      options={config.options.map(({label, value, svgSource}) => ({
        label,
        value,
        icon: <IconContainer dangerouslySetInnerHTML={{__html: svgSource}} />,
      }))}
      value={config.value}
    />
  )
}

export default Switch
