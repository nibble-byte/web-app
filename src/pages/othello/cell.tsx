import React from 'react'
import styles from './cell.module.css'
import { PLAYER } from './constants'
import { Player, ValidMoves } from './types'

interface CellProps {
  player: Player // the player whose turn it is
  value: string // 'black', 'white', or empty string
  row: number
  col: number
  onClick: (player: Player, row: number, col: number) => void
  validMoves: ValidMoves
}

const describeSquare = (value: string) => {
  if (value === PLAYER.black) return 'Black piece'
  if (value === PLAYER.white) return 'White piece'
  return 'Empty square'
}

const Cell: React.FC<CellProps> = ({
  player,
  value,
  row,
  col,
  onClick: handleFlip,
  validMoves,
}) => {
  if (`${row},${col}` in validMoves[player]) {
    return (
      <button
        type="button"
        aria-label={`Place ${player} disc at row ${row + 1}, column ${col + 1}`}
        className={styles.cell}
        onClick={() => handleFlip(player, row, col)}>
        <div className={styles.valid} />
      </button>
    )
  }
  return (
    <button
      type="button"
      aria-label={`Row ${row + 1}, Column ${col + 1}, ${describeSquare(value)}`}
      className={styles.cell}
      onClick={() => handleFlip(player, row, col)}>
      <div className={styles[value]} />
    </button>
  )
}

export default Cell
