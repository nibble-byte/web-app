import React from 'react'
import styles from './cell.module.css'
import { Player, ValidMoves } from './types'

interface CellProps {
  player: Player // 'B' for black, 'W' for white, or empty string
  value: string
  row: number
  col: number
  onClick: (player: Player, row: number, col: number) => void
  validMoves: ValidMoves
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
        aria-label={`Place ${player === 'black' ? 'black' : 'white'} disc at row ${row + 1}, column ${col + 1}`}
        className={styles.cell}
        onClick={() => handleFlip(player, row, col)}>
        <div className={styles.valid} />
      </button>
    )
  }
  return (
    <button
      type="button"
      aria-label={`${value === '' ? 'Empty' : value === 'B' ? 'Black' : 'White'} square at row ${row + 1}, column ${col + 1}`}
      className={styles.cell}
      onClick={() => handleFlip(player, row, col)}>
      <div className={styles[value]} />
    </button>
  )
}

export default Cell
