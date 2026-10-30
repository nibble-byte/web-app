import { createContext, ReactNode, useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageEnum } from '../constants/mapped-enums'
import { PAGE_ROUTES, getPageFromPath } from '../constants/routes'

interface NavigationContextType {
  currentPage: PageEnum
  handleChangePage: (page: PageEnum) => void
}

const NavigationContext = createContext<
  NavigationContextType | undefined
>(undefined)

interface NavigationProviderProps {
  children: ReactNode
}

export const NavigationProvider = ({
  children,
}: NavigationProviderProps) => {
  const location = useLocation()
  const navigate = useNavigate()

  const currentPage = getPageFromPath(location.pathname)

  const handleChangePage = (page: PageEnum) => {
    navigate(PAGE_ROUTES[page])
  }

  return (
    <NavigationContext.Provider
      value={{ currentPage, handleChangePage }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export const useNavigation = () => {
  const context = useContext(NavigationContext)

  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }

  return context
}