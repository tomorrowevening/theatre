import {prism, val} from '@tomorrowevening/theatre-dataverse'
import {usePrism} from '@tomorrowevening/theatre-react'
import type {UIPanelId} from '@tomorrowevening/theatre-shared/utils/ids'
import type {
  $IntentionalAny,
  VoidFn,
} from '@tomorrowevening/theatre-shared/utils/types'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import type {PanelPosition} from '@tomorrowevening/theatre-studio/store/types'
import useLockSet from '@tomorrowevening/theatre-studio/uiComponents/useLockSet'
import React, {useContext} from 'react'
import useWindowSize from 'react-use/esm/useWindowSize'

type PanelStuff = {
  panelId: UIPanelId
  dims: {
    width: number
    height: number
    top: number
    left: number
  }
  minDims: {
    width: number
    height: number
  }
  boundsHighlighted: boolean
  addBoundsHighlightLock: () => VoidFn
}

export const panelDimsToPanelPosition = (
  dims: PanelStuff['dims'],
  windowDims: {height: number; width: number},
  /** When set to 'px', distances are stored as absolute pixels rather than 0-1 ratios. */
  unit?: 'px' | '%',
): PanelPosition => {
  if (unit === 'px') {
    const rightPx = dims.left + dims.width
    const bottomPx = dims.top + dims.height
    return {
      edges: {
        left:
          dims.left <= windowDims.width / 2
            ? {from: 'screenLeft', distance: dims.left, unit: 'px'}
            : {
                from: 'screenRight',
                distance: windowDims.width - dims.left,
                unit: 'px',
              },
        right:
          rightPx <= windowDims.width / 2
            ? {from: 'screenLeft', distance: rightPx, unit: 'px'}
            : {
                from: 'screenRight',
                distance: windowDims.width - rightPx,
                unit: 'px',
              },
        top:
          dims.top <= windowDims.height / 2
            ? {from: 'screenTop', distance: dims.top, unit: 'px'}
            : {
                from: 'screenBottom',
                distance: windowDims.height - dims.top,
                unit: 'px',
              },
        bottom:
          bottomPx <= windowDims.height / 2
            ? {from: 'screenTop', distance: bottomPx, unit: 'px'}
            : {
                from: 'screenBottom',
                distance: windowDims.height - bottomPx,
                unit: 'px',
              },
      },
    }
  }

  const left = dims.left / windowDims.width
  const right = (dims.left + dims.width) / windowDims.width
  const top = dims.top / windowDims.height
  const bottom = (dims.height + dims.top) / windowDims.height

  const position: PanelPosition = {
    edges: {
      left:
        left <= 0.5
          ? {from: 'screenLeft', distance: left}
          : {from: 'screenRight', distance: 1 - left},

      right:
        right <= 0.5
          ? {from: 'screenLeft', distance: right}
          : {from: 'screenRight', distance: 1 - right},

      top:
        top <= 0.5
          ? {from: 'screenTop', distance: top}
          : {from: 'screenBottom', distance: 1 - top},

      bottom:
        bottom <= 0.5
          ? {from: 'screenTop', distance: bottom}
          : {from: 'screenBottom', distance: 1 - bottom},
    },
  }

  return position
}

const PanelContext = React.createContext<PanelStuff>(null as $IntentionalAny)

export const usePanel = () => useContext(PanelContext)

const BasePanel: React.FC<{
  panelId: UIPanelId
  defaultPosition: PanelPosition
  minDims: {width: number; height: number}
  children: React.ReactNode
}> = ({panelId, children, defaultPosition, minDims}) => {
  const windowSize = useWindowSize(800, 200)
  const [boundsHighlighted, addBoundsHighlightLock] = useLockSet()

  const {stuff} = usePrism(() => {
    const {edges} =
      val(getStudio()!.atomP.historic.panelPositions[panelId]) ??
      defaultPosition

    const resolveH = (edge: typeof edges.left) =>
      edge.unit === 'px'
        ? Math.floor(
            edge.from === 'screenLeft'
              ? edge.distance
              : windowSize.width - edge.distance,
          )
        : Math.floor(
            windowSize.width *
              (edge.from === 'screenLeft' ? edge.distance : 1 - edge.distance),
          )

    const resolveV = (edge: typeof edges.top) =>
      edge.unit === 'px'
        ? Math.floor(
            edge.from === 'screenTop'
              ? edge.distance
              : windowSize.height - edge.distance,
          )
        : Math.floor(
            windowSize.height *
              (edge.from === 'screenTop' ? edge.distance : 1 - edge.distance),
          )

    const left = resolveH(edges.left)
    const right = resolveH(edges.right)
    const top = resolveV(edges.top)
    const bottom = resolveV(edges.bottom)

    const width = Math.max(right - left, minDims.width)
    const height = Math.max(bottom - top, minDims.height)

    // memo-ing dims so its ref can be used as a cache key
    const dims = prism.memo(
      'dims',
      () => ({
        width,
        left,
        top,
        height,
      }),
      [width, left, top, height],
    )

    const stuff: PanelStuff = {
      dims: dims,
      panelId,
      minDims,
      boundsHighlighted,
      addBoundsHighlightLock,
    }
    return {stuff}
  }, [panelId, windowSize, boundsHighlighted, addBoundsHighlightLock])

  return <PanelContext.Provider value={stuff}>{children}</PanelContext.Provider>
}

export default BasePanel
