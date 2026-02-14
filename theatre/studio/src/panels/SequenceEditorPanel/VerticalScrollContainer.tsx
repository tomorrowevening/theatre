import noop from '@tomorrowevening/theatre-shared/utils/noop'
import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import styled from 'styled-components'
import {zIndexes} from './SequenceEditorPanel'
import {Atom} from '@tomorrowevening/theatre-dataverse'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'

const Container = styled.div`
  position: absolute;
  top: 30px;
  right: 0;
  left: 0;
  bottom: 0;
  overflow-x: hidden;
  overflow-y: scroll;
  z-index: ${() => zIndexes.scrollableArea};

  &::-webkit-scrollbar {
    display: none;
  }

  scrollbar-width: none;
`

type ReceiveVerticalWheelEventFn = (ev: Pick<WheelEvent, 'deltaY'>) => void

const ctx = createContext<ReceiveVerticalWheelEventFn>(noop)

export const ScrollStateContext = createContext<
  Pointer<{scrollTop: number; clientHeight: number}>
>(null!)

export const useVerticalScrollState = () => useContext(ScrollStateContext)

/**
 * See {@link VerticalScrollContainer} and references for how to use this.
 */
export const useReceiveVerticalWheelEvent = (): ReceiveVerticalWheelEventFn =>
  useContext(ctx)

/**
 * This is used in the sequence editor where we block wheel events to handle
 * pan/zoom on the time axis. The issue this solves, is that when blocking those
 * wheel events, we prevent the vertical scroll events from being fired. This container
 * comes with a context and a hook (see {@link useReceiveVerticalWheelEvent}) that allows
 * the code that traps the wheel events to pass them to the vertical scroller root, which
 * we then use to manually dispatch scroll events.
 */
const VerticalScrollContainer: React.FC<{
  children: React.ReactNode
}> = (props) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const receiveVerticalWheelEvent = useCallback<ReceiveVerticalWheelEventFn>(
    (event) => {
      ref.current!.scrollBy(0, event.deltaY)
    },
    [],
  )

  const scrollState = useMemo(
    () => new Atom({scrollTop: 0, clientHeight: 0}),
    [],
  )

  const handleScroll = useCallback(() => {
    if (ref.current) {
      scrollState.set({
        scrollTop: ref.current.scrollTop,
        clientHeight: ref.current.clientHeight,
      })
    }
  }, [scrollState])

  useLayoutEffect(() => {
    if (ref.current) {
      scrollState.set({
        scrollTop: ref.current.scrollTop,
        clientHeight: ref.current.clientHeight,
      })
    }
    const nodes = ref.current
    if (!nodes) return
    const obs = new ResizeObserver(() => {
      scrollState.set({
        scrollTop: nodes.scrollTop,
        clientHeight: nodes.clientHeight,
      })
    })
    obs.observe(nodes)
    return () => obs.disconnect()
  }, [scrollState])

  return (
    <ScrollStateContext.Provider value={scrollState.pointer}>
      <ctx.Provider value={receiveVerticalWheelEvent}>
        <Container
          ref={ref}
          onScroll={handleScroll}
          id="VerticalScrollContainer"
        >
          {props.children}
        </Container>
      </ctx.Provider>
    </ScrollStateContext.Provider>
  )
}

export default VerticalScrollContainer
