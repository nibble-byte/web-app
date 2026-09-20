import { cloneDeep } from 'lodash'
import { DIFFICULTY_LEVELS, DIRECTIONS, PLAYER } from './constants'
import {
  Board,
  ChipCounts,
  Coordinate,
  Difficulty,
  OthelloState,
  Player,
  PossibleMoves,
  ValidMoves,
} from './types'

const validCoordinates = (row: number, col: number) => {
  return row >= 0 && row < 8 && col >= 0 && col < 8
}

const handleFlip = (board: Board, player: Player, row: number, col: number) => {
  const newBoard: Board = cloneDeep(board)
  newBoard[row][col] = player
  for (const direction of DIRECTIONS) {
    if (validCoordinates(row, col) && newBoard[row][col] !== '') {
      flip(player, newBoard, row + direction[0], col + direction[1], direction)
    }
  }
  return newBoard
}

const flip = (
  player: Player,
  board: Board,
  row: number,
  col: number,
  direction: number[]
): boolean => {
  if (!validCoordinates(row, col) || board[row][col] === '') {
    return false
  }

  if (board[row][col] === player) {
    return true
  }

  const shouldFlip = flip(
    player,
    board,
    row + direction[0],
    col + direction[1],
    direction
  )

  if (shouldFlip) {
    board[row][col] = player
    return shouldFlip
  }

  return false
}

const handleChipCount = (board: Board) => {
  const counts: ChipCounts = {black: 0, white: 0}

  for (const row of board) {
    for (const cell of row) {
      if (cell === PLAYER.black || cell === PLAYER.white) {
        counts[cell] += 1
      }
    }
  }
  return counts
}

const handlePossibleMoves = (
  board: Board,
  possibleMoves: PossibleMoves,
  row: number,
  col: number
): PossibleMoves => {
  const newPossibleMoves = { ...possibleMoves }
  delete newPossibleMoves[`${row},${col}`]
  for (const direction of DIRECTIONS) {
    const newRow = row + direction[0]
    const newCol = col + direction[1]
    if (validCoordinates(newRow, newCol) && board[newRow][newCol] === '') {
      newPossibleMoves[`${newRow},${newCol}`] = [newRow, newCol]
    }
  }

  return newPossibleMoves
}

const hasValidMoves = (
  board: Board,
  row: number,
  col: number,
  direction: number[],
  player: Player
): boolean => {
  if (!validCoordinates(row, col)) {
    return false
  }
  if (board[row][col] === player) {
    return true
  }
  if (board[row][col] === '') {
    return false
  }

  return hasValidMoves(
    board,
    row + direction[0],
    col + direction[1],
    direction,
    player
  )
}

const handleValidMoves = (
  board: Board,
  possibleMoves: PossibleMoves
): ValidMoves => {
  const newValidMoves: ValidMoves = {
    black: {},
    white: {},
  }
  for (const coords of Object.values(possibleMoves)) {
    for (const direction of DIRECTIONS) {
      const row = coords[0]
      const col = coords[1]
      const nextRow = coords[0] + direction[0]
      const nextCol = coords[1] + direction[1]
      if (validCoordinates(nextRow, nextCol)) {
        if (
          board[nextRow][nextCol] === PLAYER.white &&
          hasValidMoves(board, nextRow, nextCol, direction, PLAYER.black)
        ) {
          newValidMoves.black[`${row},${col}`] = [row, col]
        }
        if (
          board[nextRow][nextCol] === PLAYER.black &&
          hasValidMoves(board, nextRow, nextCol, direction, PLAYER.white)
        ) {
          newValidMoves.white[`${row},${col}`] = [row, col]
        }
      }
    }
  }

  return newValidMoves
}

const handlePlayerTurn = (
  validMoves: ValidMoves,
  currentPlayer: Player,
  nextPlayer: Player
) => {
  if (Object.keys(validMoves[nextPlayer]).length === 0) {
    return currentPlayer
  }
  return nextPlayer
}

const handleWinningCondition = (chipCounts: ChipCounts): boolean => {
  return chipCounts.black === 0 || chipCounts.white === 0 || chipCounts.black + chipCounts.white === 64
}

const getOpponent = (player: Player): Player =>
  player === PLAYER.black ? PLAYER.white : PLAYER.black

// applies a move and derives the full resulting game state, shared by human clicks and AI turns
const applyMove = (
  gameState: OthelloState,
  player: Player,
  row: number,
  col: number
): OthelloState => {
  const newBoard = handleFlip(gameState.board, player, row, col)
  const newChipCount = handleChipCount(newBoard)
  const newPossibleMoves = handlePossibleMoves(
    gameState.board,
    gameState.possibleMoves,
    row,
    col
  )
  const newValidMoves = handleValidMoves(newBoard, newPossibleMoves)
  const nextPlayer = handlePlayerTurn(
    newValidMoves,
    player,
    getOpponent(player)
  )
  const newWinningCondition = handleWinningCondition(newChipCount)

  return {
    ...gameState,
    board: newBoard,
    player: nextPlayer,
    chipCounts: newChipCount,
    possibleMoves: newPossibleMoves,
    validMoves: newValidMoves,
    openModal: newWinningCondition,
  }
}

// scans the whole board for legal moves, independent of the incremental possibleMoves tracking above
const isValidMove = (
  board: Board,
  player: Player,
  row: number,
  col: number
): boolean => {
  if (board[row][col] !== '') {
    return false
  }
  const opponent = getOpponent(player)
  for (const direction of DIRECTIONS) {
    const nextRow = row + direction[0]
    const nextCol = col + direction[1]
    if (
      validCoordinates(nextRow, nextCol) &&
      board[nextRow][nextCol] === opponent &&
      hasValidMoves(board, nextRow, nextCol, direction, player)
    ) {
      return true
    }
  }
  return false
}

const getAllValidMoves = (board: Board, player: Player): Coordinate[] => {
  const moves: Coordinate[] = []
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (isValidMove(board, player, row, col)) {
        moves.push([row, col])
      }
    }
  }
  return moves
}

// classic Othello positional weights, favoring corners and penalizing cells adjacent to them
const POSITION_WEIGHTS = [
  [100, -20, 10, 5, 5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [10, -2, -1, -1, -1, -1, -2, 10],
  [5, -2, -1, -1, -1, -1, -2, 5],
  [5, -2, -1, -1, -1, -1, -2, 5],
  [10, -2, -1, -1, -1, -1, -2, 10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10, 5, 5, 10, -20, 100],
]

const evaluateBoard = (board: Board, aiPlayer: Player): number => {
  const opponent = getOpponent(aiPlayer)
  let positionalScore = 0
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (board[row][col] === aiPlayer) {
        positionalScore += POSITION_WEIGHTS[row][col]
      } else if (board[row][col] === opponent) {
        positionalScore -= POSITION_WEIGHTS[row][col]
      }
    }
  }
  const mobilityScore =
    getAllValidMoves(board, aiPlayer).length -
    getAllValidMoves(board, opponent).length

  return positionalScore + mobilityScore * 10
}

const minimax = (
  board: Board,
  player: Player,
  depth: number,
  alpha: number,
  beta: number,
  aiPlayer: Player
): number => {
  const opponent = getOpponent(player)
  const moves = getAllValidMoves(board, player)

  if (moves.length === 0) {
    const opponentMoves = getAllValidMoves(board, opponent)
    if (opponentMoves.length === 0 || depth === 0) {
      return evaluateBoard(board, aiPlayer)
    }
    return minimax(board, opponent, depth - 1, alpha, beta, aiPlayer)
  }

  if (depth === 0) {
    return evaluateBoard(board, aiPlayer)
  }

  const isMaximizing = player === aiPlayer
  let bestValue = isMaximizing ? -Infinity : Infinity
  let currentAlpha = alpha
  let currentBeta = beta

  for (const [row, col] of moves) {
    const newBoard = handleFlip(board, player, row, col)
    const value = minimax(newBoard, opponent, depth - 1, currentAlpha, currentBeta, aiPlayer)

    if (isMaximizing) {
      bestValue = Math.max(bestValue, value)
      currentAlpha = Math.max(currentAlpha, bestValue)
    } else {
      bestValue = Math.min(bestValue, value)
      currentBeta = Math.min(currentBeta, bestValue)
    }
    if (currentBeta <= currentAlpha) {
      break
    }
  }

  return bestValue
}

const getBestMove = (
  board: Board,
  aiPlayer: Player,
  difficulty: Difficulty
): Coordinate | null => {
  const moves = getAllValidMoves(board, aiPlayer)
  if (moves.length === 0) {
    return null
  }

  const { depth, randomness } = DIFFICULTY_LEVELS[difficulty]

  // weaker levels occasionally play a random legal move instead of the best one
  if (Math.random() < randomness) {
    return moves[Math.floor(Math.random() * moves.length)]
  }

  const opponent = getOpponent(aiPlayer)
  let bestMove = moves[0]
  let bestScore = -Infinity

  for (const [row, col] of moves) {
    const newBoard = handleFlip(board, aiPlayer, row, col)
    const score = minimax(newBoard, opponent, depth - 1, -Infinity, Infinity, aiPlayer)
    if (score > bestScore) {
      bestScore = score
      bestMove = [row, col]
    }
  }

  return bestMove
}

export {
  handleFlip,
  handleChipCount,
  handleValidMoves,
  handlePossibleMoves,
  handlePlayerTurn,
  handleWinningCondition,
  applyMove,
  getBestMove,
}
