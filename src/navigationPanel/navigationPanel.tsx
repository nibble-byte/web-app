import {
  Box,
  Button,
  FormControlLabel,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import styles from './navigationPanel.module.css'
import { PageEnum } from '../constants/mapped-enums'
import { useTheme } from '../contexts/ThemeProvider'
import { useNavigation } from '../contexts/NavigationProvider'

type NavigationLayout = 'top' | 'sidebar'

interface NavigationPanelProps {
  layout: NavigationLayout
  onLayoutChange: (layout: NavigationLayout) => void
}

const NavigationPanel = ({ layout, onLayoutChange }: NavigationPanelProps) => {
  const { isDarkMode, handleThemeChange } = useTheme()
  const { currentPage, handleChangePage } = useNavigation()

  const layoutSelector = (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={layout}
      aria-label="Navigation layout"
      onChange={(_, value: NavigationLayout | null) => {
        if (value) onLayoutChange(value)
      }}
    >
      <ToggleButton value="sidebar" aria-label="Sidebar menu">
        Sidebar
      </ToggleButton>
      <ToggleButton value="top" aria-label="Top bar menu">
        Top bar
      </ToggleButton>
    </ToggleButtonGroup>
  )

  const themeToggle = (
    <FormControlLabel
      className={styles.themeControl}
      control={<Switch checked={isDarkMode} onChange={handleThemeChange} size="small" />}
      label="Dark"
    />
  )

  const pageLinks = Object.entries(PageEnum).map(([key, value]) => (
    <Button
      key={key}
      className={`${styles.menuLink} ${currentPage === value ? styles.active : ''}`}
      aria-current={currentPage === value ? 'page' : undefined}
      onClick={() => handleChangePage(value)}
    >
      {value}
    </Button>
  ))

  if (layout === 'sidebar') {
    return (
      <Box
        component="aside"
        className={styles.sidebar}
        sx={{ backgroundColor: 'background.paper', borderColor: 'divider' }}
      >
        <Typography className={styles.brand} variant="h6">
          Nibble Byte
        </Typography>
        <Box component="nav" className={styles.sidebarLinks} aria-label="Main navigation">
          {pageLinks}
        </Box>
        <Box className={styles.sidebarTools}>
          {layoutSelector}
          {themeToggle}
        </Box>
      </Box>
    )
  }

  return (
    <Box
      component="header"
      className={styles.menuBar}
      sx={{ backgroundColor: 'background.paper', borderColor: 'divider' }}
    >
      <Typography className={styles.brand} variant="h6">
        Nibble Byte
      </Typography>
      <Box component="nav" className={styles.menuLinks} aria-label="Main navigation">
        {pageLinks}
      </Box>
      <Box className={styles.menuTools}>
        {layoutSelector}
        {themeToggle}
      </Box>
    </Box>
  )
}

export default NavigationPanel