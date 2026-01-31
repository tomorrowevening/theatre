import React, {createContext, useContext} from 'react'

interface SearchContextType {
  searchTerm: string
  searchTrigger: number
}

const SearchContext = createContext<SearchContextType>({
  searchTerm: '',
  searchTrigger: 0,
})

export const SearchProvider: React.FC<{
  searchTerm: string
  searchTrigger: number
  children: React.ReactNode
}> = ({searchTerm, searchTrigger, children}) => {
  return (
    <SearchContext.Provider value={{searchTerm, searchTrigger}}>
      {children}
    </SearchContext.Provider>
  )
}

export const useSearch = () => {
  return useContext(SearchContext)
}
