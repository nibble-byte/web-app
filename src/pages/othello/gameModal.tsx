import * as React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Modal from '@mui/material/Modal'
import styles from './gameModal.module.css'
import { OthelloState } from './types'
import { PLAYER } from './constants'
import { upperFirst } from 'lodash'

interface GameModalProps {
  navigationLayout: 'top' | 'sidebar'
  gameState: OthelloState
  handleReset: () => void
  setGameState: (gameState: OthelloState) => void
}

const GameModal: React.FC<GameModalProps> = ({navigationLayout, gameState, handleReset, setGameState}) => {

  const handleClose = () => {
    const newGameState: OthelloState = {
      ...gameState,
      openModal: false
    }
    setGameState(newGameState)
  }

  return (
    <Box>
      <Modal
        open={gameState.openModal}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
        disableEnforceFocus
        className={styles.gameModalRoot}
        BackdropProps={{
          className: `${styles.gameBackdrop} ${navigationLayout === 'top' ? styles.topBarBackdrop : styles.sidebarBackdrop}`,
        }}
      >
        <Box className={styles.gameModal}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            {upperFirst(gameState.chipCounts.black > gameState.chipCounts.white ? PLAYER.black : PLAYER.white)} Wins!
          </Typography>
          <Button onClick={handleReset}>Reset</Button>
        </Box>
      </Modal>
    </Box>
  )
}

export default GameModal