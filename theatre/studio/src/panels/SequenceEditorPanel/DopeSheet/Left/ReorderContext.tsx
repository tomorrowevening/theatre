import type {StudioSheetItemKey} from '@tomorrowevening/theatre-shared/utils/ids'
import React, {createContext, useCallback, useContext, useState} from 'react'

export type ReorderState = {
  activeItemKey: StudioSheetItemKey | null
  swapTargetKey: StudioSheetItemKey | null
}

const defaultState: ReorderState = {
  activeItemKey: null,
  swapTargetKey: null,
}

const ReorderContext = createContext<{
  state: ReorderState
  setReorderState: (update: Partial<ReorderState>) => void
}>({
  state: defaultState,
  setReorderState: () => {},
})

export const ReorderProvider: React.VFC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [state, setState] = useState<ReorderState>(defaultState)
  const setReorderState = useCallback((update: Partial<ReorderState>) => {
    setState((prev) => ({...prev, ...update}))
  }, [])
  return (
    <ReorderContext.Provider value={{state, setReorderState}}>
      {children}
    </ReorderContext.Provider>
  )
}

export const useReorderContext = () => useContext(ReorderContext)
