import { useEffect, useState } from 'react'
import React from 'react'
import Cell from './cell'
import styles from './othello.module.css'
import { applyMove, getBestMove } from './gamelogic'

import { DEFAULTGAMESTATE } from './constants'
import { Difficulty, OthelloState, Player } from './types'
import { cloneDeep } from 'lodash'
import { Box } from '@mui/material'
import GameModal from './gameModal'
import GameStats from './gameStats'
import AISettingsModal from './aiSettingsModal'

const Othello = () => {
  const [gameState, setGameState] = useState<OthelloState>(
    cloneDeep(DEFAULTGAMESTATE)
  )
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [history, setHistory] = useState<OthelloState[]>([])

  const handleClick = (player: Player, row: number, col: number): void => {
    if (
      gameState.board[row][col] === '' &&
      `${row},${col}` in gameState.validMoves[player]
    ) {
      setHistory([...history, gameState])
      setGameState(applyMove(gameState, player, row, col))
    }
  }

  const handleReset = () => {
    setGameState({ ...cloneDeep(DEFAULTGAMESTATE), vsAI: gameState.vsAI, aiDifficulty: gameState.aiDifficulty })
    setHistory([])
  }

  const handleConfirmSettings = (vsAI: boolean, aiDifficulty: Difficulty) => {
    setGameState({ ...cloneDeep(DEFAULTGAMESTATE), vsAI, aiDifficulty })
    setHistory([])
    setSettingsOpen(false)
  }

  const handleUndo = () => {
    if (history.length === 0) {
      return
    }
    const newHistory = [...history]
    let previousState = newHistory.pop() as OthelloState
    // vs a bot, one undo should return control to the human by also undoing the bot's move
    if (gameState.vsAI && previousState.player === gameState.aiPlayer && newHistory.length > 0) {
      previousState = newHistory.pop() as OthelloState
    }
    setHistory(newHistory)
    setGameState(previousState)
  }

  useEffect(() => {
    if (
      !gameState.vsAI ||
      gameState.openModal ||
      gameState.player !== gameState.aiPlayer
    ) {
      return
    }

    const timeoutId = setTimeout(() => {
      const bestMove = getBestMove(
        gameState.board,
        gameState.aiPlayer,
        gameState.aiDifficulty
      )
      if (bestMove) {
        const [row, col] = bestMove
        setHistory((prevHistory) => [...prevHistory, gameState])
        setGameState(applyMove(gameState, gameState.aiPlayer, row, col))
      }
    }, 400)

    return () => clearTimeout(timeoutId)
  }, [gameState])

  return (
    <Box className={styles.board}>
      <AISettingsModal
        open={settingsOpen}
        vsAI={gameState.vsAI}
        difficulty={gameState.aiDifficulty}
        onClose={() => setSettingsOpen(false)}
        onConfirm={handleConfirmSettings}
      />
      <GameModal
        handleReset={handleReset}
        setGameState={setGameState}
        gameState={gameState}
      />
      <Box>
        {gameState.board.map((rowArray, row: number) => (
          <Box key={row} className={styles.rowStyle}>
            {rowArray.map((value, col: number) => (
              <Cell
                key={`${row}-${col}`}
                player={gameState.player}
                value={value}
                row={row}
                col={col}
                onClick={handleClick}
                validMoves={gameState.validMoves}
              />
            ))}
          </Box>
        ))}
      </Box>
      {/* TODO: implement ui component for game statistics */}
      <GameStats
        gameState={gameState}
        handleReset={handleReset}
        handleOpenSettings={() => setSettingsOpen(true)}
        handleUndo={handleUndo}
        canUndo={history.length > 0}
      />
    </Box>
  )
}

export default Othello
