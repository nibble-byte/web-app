import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Typography,
} from '@mui/material'
import { SelectChangeEvent } from '@mui/material/Select'
import { useState } from 'react'
import { PageEnum } from '../constants/mapped-enums'
import styles from './navigationPanel.module.css'
import { useTheme } from '../contexts/ThemeProvider'
import { useNavigation } from '../contexts/NavigationProvider'

type MenuStyle = 'pills' | 'underline' | 'minimal'

const NavigationPanel = () => {
  const { isDarkMode, handleThemeChange } = useTheme()
  const { currentPage, handleChangePage } = useNavigation()
  const [menuStyle, setMenuStyle] = useState<MenuStyle>('pills')

  const handleMenuStyleChange = (event: SelectChangeEvent<MenuStyle>) => {
    setMenuStyle(event.target.value as MenuStyle)
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
        {Object.entries(PageEnum).map(([key, value]) => (
          <Button
            key={key}
            className={`${styles.menuLink} ${styles[menuStyle]} ${currentPage === value ? styles.active : ''}`}
            aria-current={currentPage === value ? 'page' : undefined}
            onClick={() => handleChangePage(value)}
          >
            {value}
          </Button>
        ))}
      </Box>
      <Box className={styles.menuTools}>
        <FormControl size="small" className={styles.styleSelector}>
          <InputLabel id="menu-style-label">Menu style</InputLabel>
          <Select
            labelId="menu-style-label"
            id="menu-style"
            value={menuStyle}
            label="Menu style"
            onChange={handleMenuStyleChange}
          >
            <MenuItem value="pills">Pills</MenuItem>
            <MenuItem value="underline">Underline</MenuItem>
            <MenuItem value="minimal">Minimal</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          className={styles.themeControl}
          control={<Switch checked={isDarkMode} onChange={handleThemeChange} size="small" />}
          label="Dark"
        />
      </Box>
    </Box>
  )
}

export default NavigationPanel