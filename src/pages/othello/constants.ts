import { Board, Difficulty, OthelloState, Player, PossibleMoves } from './types'

const BOARDSIZE = 8

const INITIALBOARD: Board = [
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', 'white', 'black', '', '', ''],
  ['', '', '', 'black', 'white', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
]

const PLAYER: { [key: string]: Player } = {
  black: 'black',
  white: 'white',
}

const DIRECTIONS = [
  [1, 0], // Right
  [0, 1], // Down
  [-1, 0], // Left
  [0, -1], // Up
  [1, 1], // Diagonal Down-Right
  [-1, -1], // Diagonal Up-Left
  [1, -1], // Diagonal Up-Right
  [-1, 1], // Diagonal Down-Left
]

const INITIALPOSSIBLEMOVES: PossibleMoves = {
  '2,2': [2, 2],
  '3,2': [3, 2],
  '4,2': [4, 2],
  '5,2': [5, 2],
  '2,3': [2, 3],
  '2,4': [2, 4],
  '2,5': [2, 5],
  '3,5': [3, 5],
  '4,5': [4, 5],
  '5,5': [5, 5],
  '5,3': [5, 3],
  '5,4': [5, 4],
}

// search depth and chance of a random (sub-optimal) move for each of the 10 difficulty levels
const DIFFICULTY_LEVELS: { [key in Difficulty]: { depth: number; randomness: number } } = {
  1: { depth: 1, randomness: 0.9 },
  2: { depth: 1, randomness: 0.7 },
  3: { depth: 2, randomness: 0.55 },
  4: { depth: 2, randomness: 0.4 },
  5: { depth: 3, randomness: 0.3 },
  6: { depth: 3, randomness: 0.2 },
  7: { depth: 4, randomness: 0.12 },
  8: { depth: 4, randomness: 0.06 },
  9: { depth: 5, randomness: 0.02 },
  10: { depth: 6, randomness: 0 },
}

const DEFAULTGAMESTATE: OthelloState = {
  board: INITIALBOARD,
  player: PLAYER.black,
  chipCounts: { black: 2, white: 2 },
  validMoves: {
    black: { '2,3': [2, 3], '3,2': [3, 2], '5,4': [5, 4], '4,5': [4, 5] },
    white: { '2,4': [2, 4], '4,2': [4, 2], '5,4': [3, 5], '5,3': [5, 3] },
  },
  possibleMoves: INITIALPOSSIBLEMOVES,
  openModal: false,
  vsAI: false,
  aiPlayer: PLAYER.white,
  aiDifficulty: 5,
}

export { DIRECTIONS, DEFAULTGAMESTATE, BOARDSIZE, PLAYER, DIFFICULTY_LEVELS }
