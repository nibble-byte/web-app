import * as React from 'react'
import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Modal from '@mui/material/Modal'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Slider from '@mui/material/Slider'
import styles from './aiSettingsModal.module.css'
import { Difficulty } from './types'

interface AISettingsModalProps {
  open: boolean
  vsAI: boolean
  difficulty: Difficulty
  onClose: () => void
  onConfirm: (vsAI: boolean, difficulty: Difficulty) => void
}

const DIFFICULTY_MARKS = Array.from({ length: 10 }, (_, index) => ({
  value: index + 1,
  label: `${index + 1}`,
}))

const AISettingsModal: React.FC<AISettingsModalProps> = ({
  open,
  vsAI,
  difficulty,
  onClose,
  onConfirm,
}) => {
  const [pendingVsAI, setPendingVsAI] = useState(vsAI)
  const [pendingDifficulty, setPendingDifficulty] = useState(difficulty)

  useEffect(() => {
    if (open) {
      setPendingVsAI(vsAI)
      setPendingDifficulty(difficulty)
    }
  }, [open, vsAI, difficulty])

  const handleStart = () => {
    onConfirm(pendingVsAI, pendingDifficulty)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="ai-settings-modal-title"
    >
      <Box className={styles.settingsModal}>
        <Typography id="ai-settings-modal-title" variant="h6" component="h2">
          Game Settings
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={pendingVsAI}
              onChange={(event) => setPendingVsAI(event.target.checked)}
            />
          }
          label={pendingVsAI ? 'Playing Against Bot' : 'Playing Against Human'}
        />
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
            Start Game
          </Button>
        </Box>
      </Box>
    </Modal>
  )
}

export default AISettingsModal
