import React, {useState, useCallback} from 'react'
import styled from 'styled-components'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val} from '@tomorrowevening/theatre-dataverse'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {usePrism} from '@tomorrowevening/theatre-react'

type MenuItem = {
  label: string
  action?: () => void
  submenu?: MenuItem[]
}

type StartMenuProps = {
  layoutP: Pointer<SequenceEditorPanelLayout>
  onSVGViewerClear?: () => void
  onSVGViewerLoad?: () => void
  onSVGViewerShow?: () => void
  onSVGViewerHide?: () => void
  onFileSave?: () => void
  onMarkersAdd?: () => void
  onMarkersClear?: () => void
  onSheetCreate?: () => void
  onSheetDuplicate?: () => void
  onSheetObjectCreate?: () => void
}

const MenuContainer = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 100;
`

const MenuButton = styled.button<{isOpen: boolean}>`
  background: ${(props) => (props.isOpen ? '#0078d4' : '#2d2d30')};
  color: white;
  border: 1px solid #3e3e42;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: ${(props) => (props.isOpen ? '#106ebe' : '#3e3e42')};
  }

  &:active {
    background: #005a9e;
  }
`

const MenuPanel = styled.div<{isOpen: boolean}>`
  position: absolute;
  bottom: 100%;
  left: 0;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 200px;
  opacity: ${(props) => (props.isOpen ? 1 : 0)};
  visibility: ${(props) => (props.isOpen ? 'visible' : 'hidden')};
  transform: ${(props) =>
    props.isOpen ? 'translateY(0)' : 'translateY(10px)'};
  transition: all 0.15s ease-out;
  z-index: 1000;
`

const MenuSection = styled.div`
  padding: 4px 0;

  &:not(:last-child) {
    border-bottom: 1px solid #3e3e42;
  }
`

const MenuItemContainer = styled.div<{
  hasSubmenu?: boolean
  isActive?: boolean
}>`
  position: relative;

  &:hover > div:last-child {
    opacity: ${(props) => (props.hasSubmenu ? 1 : 0)};
    visibility: ${(props) => (props.hasSubmenu ? 'visible' : 'hidden')};
  }
`

const MenuItemButton = styled.button<{hasSubmenu?: boolean}>`
  width: 100%;
  background: transparent;
  color: #cccccc;
  border: none;
  padding: 8px 16px;
  text-align: left;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &:hover {
    background: #3e3e42;
    color: white;
  }

  &:active {
    background: #0078d4;
  }
`

const SubmenuPanel = styled.div`
  position: absolute;
  left: 100%;
  top: 0;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 150px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.15s ease-out;
  z-index: 1001;
`

const StartMenu: React.FC<StartMenuProps> = ({
  layoutP,
  onSVGViewerClear,
  onSVGViewerLoad,
  onSVGViewerShow,
  onSVGViewerHide,
  onFileSave,
  onMarkersAdd,
  onMarkersClear,
  onSheetCreate,
  onSheetDuplicate,
  onSheetObjectCreate,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const closeMenu = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleMenuItemClick = useCallback(
    (action?: () => void) => {
      if (action) {
        action()
      }
      closeMenu()
    },
    [closeMenu],
  )

  const menuItems: MenuItem[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Save',
          action: onFileSave,
        },
      ],
    },
    {
      label: 'Sheets',
      submenu: [
        {
          label: 'Create Sheet',
          action: onSheetCreate,
        },
        {
          label: 'Duplicate Sheet',
          action: onSheetDuplicate,
        },
        {
          label: 'Create Sheet Object',
          action: onSheetObjectCreate,
        },
      ],
    },
    {
      label: 'Markers',
      submenu: [
        {
          label: 'Add',
          action: onMarkersAdd,
        },
        {
          label: 'Clear',
          action: onMarkersClear,
        },
      ],
    },
    {
      label: 'SVG Viewer',
      submenu: [
        {
          label: 'Show',
          action: onSVGViewerShow,
        },
        {
          label: 'Hide',
          action: onSVGViewerHide,
        },
        {
          label: 'Load',
          action: onSVGViewerLoad,
        },
        {
          label: 'Clear',
          action: onSVGViewerClear,
        },
      ],
    },
  ]

  const renderMenuItem = (item: MenuItem, index: number) => (
    <MenuItemContainer key={index} hasSubmenu={!!item.submenu}>
      <MenuItemButton
        hasSubmenu={!!item.submenu}
        onClick={() => !item.submenu && handleMenuItemClick(item.action)}
      >
        {item.label}
        {item.submenu && <span>▶</span>}
      </MenuItemButton>
      {item.submenu && (
        <SubmenuPanel>
          {item.submenu.map((subItem, subIndex) => (
            <MenuItemButton
              key={subIndex}
              onClick={() => handleMenuItemClick(subItem.action)}
            >
              {subItem.label}
            </MenuItemButton>
          ))}
        </SubmenuPanel>
      )}
    </MenuItemContainer>
  )

  return usePrism(() => {
    const leftWidth = val(layoutP.leftDims.width)

    return (
      <MenuContainer>
        <MenuButton isOpen={isOpen} onClick={toggleMenu}>
          <span>☰</span>
        </MenuButton>

        <MenuPanel isOpen={isOpen}>
          <MenuSection>{menuItems.map(renderMenuItem)}</MenuSection>
        </MenuPanel>

        {/* Invisible overlay to close menu when clicking outside */}
        {isOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99,
            }}
            onClick={closeMenu}
          />
        )}
      </MenuContainer>
    )
  }, [layoutP, isOpen, menuItems])
}

export default StartMenu
