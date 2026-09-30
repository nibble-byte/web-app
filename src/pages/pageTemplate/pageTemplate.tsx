import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface PageProps {
  title: string
  children: JSX.Element
}

const PageTemplate = ({ title, children }: PageProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        minWidth: 0,
      }}>
      {/* Title Area */}
      <Box
        sx={{
          padding: 2,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          minWidth: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
        <Typography variant="h4">{title}</Typography>
      </Box>

      {/* Body Area */}
      <Box
        sx={{
          flexGrow: 1,
          padding: 2,
          minWidth: 0,
          overflowY: 'auto', // Allows scrolling if content overflows
          overflowX: 'auto',
        }}>
        {children}
      </Box>
    </Box>
  )
}

export default PageTemplate
