import { createContext, ReactNode, useState, useContext } from 'react';
import { PageEnum } from '../constants/mapped-enums';

interface NavigationContextType {
  currentPage: PageEnum;
  handleChangePage: (page: PageEnum) => void;
}

const DEFAULT_PAGE = PageEnum.Weather;

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageEnum>(DEFAULT_PAGE);

  const handleChangePage = (page: PageEnum) => {
    setCurrentPage(page);
  };

  const contextValue: NavigationContextType = {
    currentPage,
    handleChangePage,
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
