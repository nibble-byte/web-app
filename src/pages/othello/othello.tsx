import { useEffect, useState } from 'react'
import React from 'react'
import Cell from './cell'
import styles from './othello.module.css'
import { applyMove, getBestMove, handleWinningCondition } from './gamelogic'

import { DEFAULTGAMESTATE, PLAYER } from './constants'
import { Difficulty, OthelloState, Player } from './types'
import { cloneDeep } from 'lodash'
import { Box } from '@mui/material'
import GameModal from './gameModal'
import GameStats from './gameStats'
import AISettingsModal from './aiSettingsModal'

const Othello = ({
  navigationLayout,
  isActive = true,
}: {
  navigationLayout: 'top' | 'sidebar'
  isActive?: boolean
}) => {
  const [gameState, setGameState] = useState<OthelloState>(
    cloneDeep(DEFAULTGAMESTATE)
  )
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [history, setHistory] = useState<OthelloState[]>([])
  const [statsLayout, setStatsLayout] = useState<'top' | 'bottom'>('bottom')

  const handleClick = (player: Player, row: number, col: number): void => {
    if (gameState.vsAI && gameState.player === gameState.aiPlayer) {
      return
    }
    if (
      gameState.board[row][col] === '' &&
      `${row},${col}` in gameState.validMoves[player]
    ) {
      setHistory([...history, gameState])
      setGameState(applyMove(gameState, player, row, col))
    }
  }

  const handleReset = () => {
    setGameState({
      ...cloneDeep(DEFAULTGAMESTATE),
      vsAI: gameState.vsAI,
      aiDifficulty: gameState.aiDifficulty,
      aiPlayer: gameState.aiPlayer,
    })
    setHistory([])
  }

  const handleConfirmSettings = (
    vsAI: boolean,
    aiDifficulty: Difficulty,
    aiPlayer: Player
  ) => {
    setGameState({ ...gameState, vsAI, aiDifficulty, aiPlayer })
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
      !isActive ||
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
        return
      }

      if (handleWinningCondition(gameState.chipCounts, gameState.validMoves)) {
        setGameState({ ...gameState, openModal: true })
        return
      }

      const opponent =
        gameState.aiPlayer === PLAYER.black ? PLAYER.white : PLAYER.black
      setGameState({ ...gameState, player: opponent })
    }, 400)

    return () => clearTimeout(timeoutId)
  }, [gameState, isActive])

  return (
    <Box
      className={
        statsLayout === 'top'
          ? `${styles.board} ${styles.boardWithTopBar}`
          : styles.board
      }
    >
      <AISettingsModal
        navigationLayout={navigationLayout}
        open={settingsOpen && isActive}
        vsAI={gameState.vsAI}
        difficulty={gameState.aiDifficulty}
        aiPlayer={gameState.aiPlayer}
        onClose={() => setSettingsOpen(false)}
        onConfirm={handleConfirmSettings}
      />
      <GameModal
        navigationLayout={navigationLayout}
        handleReset={handleReset}
        setGameState={setGameState}
        gameState={gameState}
        isActive={isActive}
      />
      {statsLayout === 'top' && (
        <GameStats
          gameState={gameState}
          handleReset={handleReset}
          handleOpenSettings={() => setSettingsOpen(true)}
          handleUndo={handleUndo}
          canUndo={history.length > 0}
          layout={statsLayout}
          onToggleLayout={() =>
            setStatsLayout((layout) => (layout === 'top' ? 'bottom' : 'top'))
          }
        />
      )}
      <Box className={styles.boardFrame}>
        <Box className={styles.grid}>
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
                validMoves={
                  gameState.vsAI && gameState.player === gameState.aiPlayer
                    ? { black: {}, white: {} }
                    : gameState.validMoves
                }
              />
            ))}
          </Box>
        ))}
        </Box>
      </Box>
      {statsLayout === 'bottom' && (
        <GameStats
          gameState={gameState}
          handleReset={handleReset}
          handleOpenSettings={() => setSettingsOpen(true)}
          handleUndo={handleUndo}
          canUndo={history.length > 0}
          layout={statsLayout}
          onToggleLayout={() =>
            setStatsLayout((layout) => (layout === 'top' ? 'bottom' : 'top'))
          }
        />
      )}
    </Box>
  )
}

export default Othello
