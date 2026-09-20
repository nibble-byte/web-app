export interface OthelloState {
  board: string[][]
  player: Player
  chipCounts: ChipCounts
  validMoves: ValidMoves
  possibleMoves: PossibleMoves
  openModal: boolean
  vsAI: boolean
  aiPlayer: Player
  aiDifficulty: Difficulty
}

// 1 (weakest) through 10 (strongest)
export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type ValidMoves = {
  black: { [key: string]: Coordinate }
  white: { [key: string]: Coordinate }
}

export type ChipCounts = { black: number; white: number }

export type PossibleMoves = { [key: string]: Coordinate }

export type Coordinate = [number, number]

export type Player = 'black' | 'white'

export type Board = string[][]
