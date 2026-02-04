import React, {useState, useCallback} from 'react'
import styled from 'styled-components'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val} from '@tomorrowevening/theatre-dataverse'
import type {SequenceEditorPanelLayout} from './layout/layout'
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
  onMarkersLog?: () => void
  onEventsAdd?: () => void
  onEventsClear?: () => void
  onEventsLog?: () => void
  onSheetCreate?: () => void
  onSheetDuplicate?: () => void
  onSheetObjectCreate?: () => void
  onSearchChange?: (searchTerm: string) => void
  onSearchTrigger?: (trigger: number) => void
}

const MenuContainer = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
`

const SearchInput = styled.input<{hasValue: boolean}>`
  background: ${(props) => (props.hasValue ? '#1e1e1e' : '#2d2d30')};
  color: #cccccc;
  border: 1px solid ${(props) => (props.hasValue ? '#0078d4' : '#3e3e42')};
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
  width: 200px;
  transition: all 0.15s ease-out;

  &:focus {
    outline: none;
    border-color: #0078d4;
    background: #1e1e1e;
  }

  &::placeholder {
    color: #6a6a6a;
  }
`

const ToggleButton = styled.button<{isActive: boolean}>`
  background: ${(props) => (props.isActive ? '#0078d4' : '#2d2d30')};
  color: white;
  border: 1px solid #3e3e42;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: ${(props) => (props.isActive ? '#106ebe' : '#3e3e42')};
  }

  &:active {
    background: ${(props) => (props.isActive ? '#005a9e' : '#1e1e1e')};
  }
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

function ToggleSVGIcon() {
  return (
    <svg
      fill="#FFFFFF"
      width="800px"
      height="800px"
      viewBox="0 0 1920 1920"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: '15px',
        height: '15px',
      }}
    >
      <path d="M1637.718 0c93.4 0 169.406 76.007 169.406 169.407v1581.13c0 93.512-76.007 169.407-169.406 169.407H451.87V0h1185.848zM1158.7 581l-79.861 79.861 242.422 242.423H667v112.94h654.262l-242.422 242.423 79.861 79.862 378.755-378.755L1158.7 581zM225.938 1920h112.938V.056H225.938z" />
    </svg>
  )
}

const StartMenu: React.FC<StartMenuProps> = ({
  layoutP,
  onSVGViewerClear,
  onSVGViewerLoad,
  onSVGViewerShow,
  onSVGViewerHide,
  onFileSave,
  onMarkersAdd,
  onMarkersClear,
  onMarkersLog,
  onEventsAdd,
  onEventsClear,
  onEventsLog,
  onSheetCreate,
  onSheetDuplicate,
  onSheetObjectCreate,
  onSearchChange,
  onSearchTrigger,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTrigger, setSearchTrigger] = useState(0) // Used to force re-renders on Enter

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const closeMenu = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchTerm(value)
      if (onSearchChange) {
        onSearchChange(value)
      }
    },
    [onSearchChange],
  )

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        // Force a re-render by updating the search trigger
        const newTrigger = searchTrigger + 1
        setSearchTrigger(newTrigger)
        if (onSearchTrigger) {
          onSearchTrigger(newTrigger)
        }
        if (onSearchChange) {
          onSearchChange(searchTerm)
        }
      }
    },
    [onSearchChange, onSearchTrigger, searchTerm, searchTrigger],
  )

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
          label: 'Log',
          action: onMarkersLog,
        },
        {
          label: 'Clear',
          action: onMarkersClear,
        },
      ],
    },
    {
      label: 'Events',
      submenu: [
        {
          label: 'Add',
          action: onEventsAdd,
        },
        {
          label: 'Log',
          action: onEventsLog,
        },
        {
          label: 'Clear',
          action: onEventsClear,
        },
      ],
    },
    {
      label: 'Data Viewer',
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
    const layout = val(layoutP)
    const rightPanelOpen = layout.rightPanelOpen

    return (
      <MenuContainer>
        <MenuButton isOpen={isOpen} onClick={toggleMenu}>
          <span>☰</span>
        </MenuButton>

        <MenuPanel isOpen={isOpen}>
          <MenuSection>{menuItems.map(renderMenuItem)}</MenuSection>
        </MenuPanel>

        <SearchInput
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          hasValue={searchTerm.length > 0}
        />

        <ToggleButton
          isActive={rightPanelOpen}
          onClick={() => {
            layout.setRightPanelOpen(!rightPanelOpen)
          }}
          title={
            rightPanelOpen ? 'Hide timeline editor' : 'Show timeline editor'
          }
          style={{
            transform: `scale(${rightPanelOpen ? -1 : 1}, 1)`,
          }}
        >
          <ToggleSVGIcon />
        </ToggleButton>

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
