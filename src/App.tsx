import React from 'react'
import styles from './App.module.css'
import { Box, CssBaseline, ThemeProvider } from '@mui/material'
import Weather from './pages/weather/weather'
import Othello from './pages/othello/othello'
import Fractal from './pages/fractal/fractal'

import NavigationPanel from './navigationPanel/navigationPanel'
import { darkTheme } from './themes/darkTheme'
import { lightTheme } from './themes/lightTheme'
import { PageEnum } from './constants/mapped-enums'
import PageTemplate from './pages/pageTemplate/pageTemplate'
import { AppProviders } from './contexts/AppProviders'
import { useTheme } from './contexts/ThemeProvider'
import { useNavigation } from './contexts/NavigationProvider'

const AppContent = () => {
  const { isDarkMode } = useTheme();
  const { currentPage } = useNavigation();

  const handlePageLoad = (currentPage: string) => {
    switch (currentPage) {
      case PageEnum.Othello: {
        return <Othello />
      }
      case PageEnum.Fractal: {
        return <Fractal />
      }
      default: {
        return <Weather />
      }
    }
  }

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box
        className={styles.pageBox}
      >
        <NavigationPanel />
        <Box className={styles.appWrapper}>
          <Box className={styles.appBox}>
            {
              <PageTemplate
                title={currentPage}
                children={handlePageLoad(currentPage)}
              />
            }
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

const App = () => {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  )
}

export default App
