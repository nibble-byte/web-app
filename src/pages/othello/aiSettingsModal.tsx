import * as React from 'react'
import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Modal from '@mui/material/Modal'
import Slider from '@mui/material/Slider'
import styles from './aiSettingsModal.module.css'
import { Difficulty, Player } from './types'

interface AISettingsModalProps {
  navigationLayout: 'top' | 'sidebar'
  open: boolean
  vsAI: boolean
  difficulty: Difficulty
  aiPlayer: Player
  onClose: () => void
  onConfirm: (vsAI: boolean, difficulty: Difficulty, aiPlayer: Player) => void
}

const DIFFICULTY_MARKS = Array.from({ length: 10 }, (_, index) => ({
  value: index + 1,
  label: `${index + 1}`,
}))

const AISettingsModal: React.FC<AISettingsModalProps> = ({
  navigationLayout,
  open,
  vsAI,
  difficulty,
  aiPlayer,
  onClose,
  onConfirm,
}) => {
  const [pendingVsAI, setPendingVsAI] = useState(vsAI)
  const [pendingDifficulty, setPendingDifficulty] = useState(difficulty)
  const [pendingHumanColor, setPendingHumanColor] = useState<Player>(
    aiPlayer === 'black' ? 'white' : 'black'
  )

  useEffect(() => {
    if (open) {
      setPendingVsAI(vsAI)
      setPendingDifficulty(difficulty)
      setPendingHumanColor(aiPlayer === 'black' ? 'white' : 'black')
    }
  }, [open, vsAI, difficulty, aiPlayer])

  const handleStart = () => {
    const nextAiPlayer: Player = pendingHumanColor === 'black' ? 'white' : 'black'
    onConfirm(pendingVsAI, pendingDifficulty, nextAiPlayer)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="ai-settings-modal-title"
      disableEnforceFocus
      className={styles.settingsModalRoot}
      BackdropProps={{
        className: `${styles.settingsBackdrop} ${navigationLayout === 'top' ? styles.topBarBackdrop : styles.sidebarBackdrop}`,
      }}
    >
      <Box className={styles.settingsModal}>
        <Typography id="ai-settings-modal-title" variant="h6" component="h2">
          Game Settings
        </Typography>
        <Box className={styles.modeButtons}>
          <Button
            variant={pendingVsAI ? 'outlined' : 'contained'}
            onClick={() => setPendingVsAI(false)}
          >
            Play vs Human
          </Button>
          <Button
            variant={pendingVsAI ? 'contained' : 'outlined'}
            onClick={() => setPendingVsAI(true)}
          >
            Play vs Bot
          </Button>
        </Box>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Play as
          </Typography>
          <Box className={styles.modeButtons}>
            <Button
              disabled={!pendingVsAI}
              variant={pendingHumanColor === 'black' ? 'contained' : 'outlined'}
              onClick={() => setPendingHumanColor('black')}
            >
              Black
            </Button>
            <Button
              disabled={!pendingVsAI}
              variant={pendingHumanColor === 'white' ? 'contained' : 'outlined'}
              onClick={() => setPendingHumanColor('white')}
            >
              White
            </Button>
          </Box>
        </Box>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Bot Difficulty: {pendingDifficulty} / 10
          </Typography>
          <Slider
            disabled={!pendingVsAI}
            value={pendingDifficulty}
            onChange={(_, value) => setPendingDifficulty(value as Difficulty)}
            min={1}
            max={10}
            step={1}
            marks={DIFFICULTY_MARKS}
            valueLabelDisplay="auto"
          />
        </Box>
        <Box className={styles.actions}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleStart}>
            Continue
          </Button>
        </Box>
      </Box>
    </Modal>
  )
}

export default AISettingsModal
