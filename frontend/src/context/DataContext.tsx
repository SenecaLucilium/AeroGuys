import React, { createContext, useContext, useState } from 'react'

export interface InitInfo {
  mode: 'realtime' | 'csv'
  states_loaded?: number
  flights_loaded?: number
  message?: string
}

interface DataContextType {
  initInfo: InitInfo | null
  setInitialized: (info: InitInfo) => void
  reset: () => void
}

const STORAGE_KEY = 'aeroguys_init'

const DataContext = createContext<DataContextType>({
  initInfo: null,
  setInitialized: () => {},
  reset: () => {},
})

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [initInfo, setInitInfo] = useState<InitInfo | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? (JSON.parse(stored) as InitInfo) : null
    } catch {
      return null
    }
  })

  function setInitialized(info: InitInfo) {
    setInitInfo(info)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info))
  }

  function reset() {
    setInitInfo(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <DataContext.Provider value={{ initInfo, setInitialized, reset }}>
      {children}
    </DataContext.Provider>
  )
}

export function useDataContext() {
  return useContext(DataContext)
}
