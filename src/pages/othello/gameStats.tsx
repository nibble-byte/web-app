import { AppBar, Box, Button, IconButton, Toolbar, Typography } from "@mui/material";
import SwapVertIcon from '@mui/icons-material/SwapVert'
import React from "react";
import styles from './gameStats.module.css'
import { OthelloState } from "./types";
import cellStyles from './cell.module.css'

interface GameStatsProps {
  gameState: OthelloState
  handleReset: () => void
  handleOpenSettings: () => void
  handleUndo: () => void
  canUndo: boolean
  layout: 'top' | 'bottom'
  onToggleLayout: () => void
}

const GameStats = ({
  gameState,
  handleReset,
  handleOpenSettings,
  handleUndo,
  canUndo,
  layout,
  onToggleLayout,
}: GameStatsProps) => {
  const layoutToggle = (
    <IconButton
      size="small"
      onClick={onToggleLayout}
      title={layout === 'top' ? 'Move controls below the board' : 'Move controls to a top bar'}
    >
      <SwapVertIcon fontSize="small" />
    </IconButton>
  )

  if (layout === 'top') {
    return (
      <AppBar position="fixed" className={styles.topBar}>
        <Toolbar className={styles.topBarToolbar}>
          <Button variant="outlined" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="outlined" onClick={handleUndo} disabled={!canUndo}>
            Undo
          </Button>
          <Box className={styles.turn}>
            <Typography variant="subtitle2">Turn:</Typography>
            <Box className={cellStyles[gameState.player]} />
          </Box>
          <Typography variant="subtitle2">
            Black: {gameState.chipCounts.black}
          </Typography>
          <Typography variant="subtitle2">
            White: {gameState.chipCounts.white}
          </Typography>
          <Button variant="outlined" onClick={handleOpenSettings}>
            {gameState.vsAI ? `Bot: Level ${gameState.aiDifficulty}` : 'Play vs Bot'}
          </Button>
          {layoutToggle}
        </Toolbar>
      </AppBar>
    )
  }

  return (
  <Box className={styles.gameUI}>
    <Box className={styles.scorePanel}>
      <Box className={`${styles.playerScore} ${gameState.player === 'black' ? styles.activePlayer : ''}`}>
        <Box className={`${styles.scoreDisc} ${cellStyles.black}`} />
        <Typography variant="overline">Black</Typography>
        <Typography className={styles.scoreValue}>{gameState.chipCounts.black}</Typography>
      </Box>
      <Box className={styles.turnStatus}>
        <Typography variant="caption">NOW PLAYING</Typography>
        <Box className={`${styles.turnDisc} ${cellStyles[gameState.player]}`} />
      </Box>
      <Box className={`${styles.playerScore} ${gameState.player === 'white' ? styles.activePlayer : ''}`}>
        <Box className={`${styles.scoreDisc} ${cellStyles.white}`} />
        <Typography variant="overline">White</Typography>
        <Typography className={styles.scoreValue}>{gameState.chipCounts.white}</Typography>
      </Box>
    </Box>
    <Box className={styles.controlsRow}>
      <Box className={styles.actionGroup}>
        <Button variant="outlined" onClick={handleReset}>
          New game
        </Button>
        <Button variant="outlined" onClick={handleUndo} disabled={!canUndo}>
          Undo
        </Button>
        <Button variant="outlined" onClick={handleOpenSettings}>
          {gameState.vsAI ? `Bot: Level ${gameState.aiDifficulty}` : 'Play vs Bot'}
        </Button>
      </Box>
      {layoutToggle}
    </Box>
  </Box>
)}

export default GameStats