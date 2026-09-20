import { Box, Button, Typography } from "@mui/material";
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
}

const GameStats = ({
  gameState,
  handleReset,
  handleOpenSettings,
  handleUndo,
  canUndo,
}: GameStatsProps) => {
  return (
  <Box className={styles.gameUI}>
    <Box className={styles.controlsRow}>
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
    </Box>
    <Box className={styles.botRow}>
      <Button variant="outlined" onClick={handleOpenSettings}>
        {gameState.vsAI ? `Bot: Level ${gameState.aiDifficulty}` : 'Play vs Bot'}
      </Button>
    </Box>
  </Box>
)}

export default GameStats