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
import { useEffect, useState } from 'react'

type NavigationLayout = 'top' | 'sidebar'

const AppContent = () => {
  const { isDarkMode } = useTheme();
  const { currentPage } = useNavigation();
  const [navigationLayout, setNavigationLayout] = useState<NavigationLayout>('top')
  const [mountedPages, setMountedPages] = useState<PageEnum[]>([currentPage])

  useEffect(() => {
    setMountedPages((pages) =>
      pages.includes(currentPage) ? pages : [...pages, currentPage]
    )
  }, [currentPage])

  const pageStyle = (page: PageEnum) => ({
    display: currentPage === page ? 'block' : 'none',
    height: '100%',
  })

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box
        className={`${styles.pageBox} ${navigationLayout === 'sidebar' ? styles.withSidebar : ''}`}
      >
        <NavigationPanel layout={navigationLayout} onLayoutChange={setNavigationLayout} />
        <Box className={styles.appWrapper}>
          <Box className={styles.appBox}>
            <PageTemplate title={currentPage}>
              {mountedPages.includes(PageEnum.Weather) && (
                <Box sx={pageStyle(PageEnum.Weather)}>
                  <Weather />
                </Box>
              )}
              {mountedPages.includes(PageEnum.Othello) && (
                <Box sx={pageStyle(PageEnum.Othello)}>
                  <Othello
                    navigationLayout={navigationLayout}
                    isActive={currentPage === PageEnum.Othello}
                  />
                </Box>
              )}
              {mountedPages.includes(PageEnum.Fractal) && (
                <Box sx={pageStyle(PageEnum.Fractal)}>
                  <Fractal />
                </Box>
              )}
            </PageTemplate>
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
