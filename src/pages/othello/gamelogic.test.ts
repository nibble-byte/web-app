import { cloneDeep } from 'lodash'
import { DEFAULTGAMESTATE } from './constants'
import {
  applyMove,
  getBestMove,
  handleChipCount,
  handleFlip,
  handlePlayerTurn,
  handlePossibleMoves,
  handleValidMoves,
  handleWinningCondition,
} from './gamelogic'
import { Board, Difficulty, OthelloState, Player } from './types'

const emptyBoard = (): Board =>
  Array.from({ length: 8 }, () => Array<string>(8).fill(''))

const boardWith = (pieces: Record<string, Player>): Board => {
  const board = emptyBoard()
  for (const [key, player] of Object.entries(pieces)) {
    const [row, col] = key.split(',').map(Number)
    board[row][col] = player
  }
  return board
}

// Builds a full game state; every empty square is a candidate so move discovery is exhaustive.
const stateFromBoard = (board: Board, player: Player): OthelloState => {
  const possibleMoves: OthelloState['possibleMoves'] = {}
  board.forEach((cells, row) =>
    cells.forEach((cell, col) => {
      if (cell === '') possibleMoves[`${row},${col}`] = [row, col]
    })
  )
  return {
    ...cloneDeep(DEFAULTGAMESTATE),
    board,
    player,
    chipCounts: handleChipCount(board),
    possibleMoves,
    validMoves: handleValidMoves(board, possibleMoves),
  }
}

const initialState = () => cloneDeep(DEFAULTGAMESTATE)

describe('initial state', () => {
  it('starts with the four center discs and black to move', () => {
    const { board, player, chipCounts } = initialState()
    expect(board[3][3]).toBe('white')
    expect(board[3][4]).toBe('black')
    expect(board[4][3]).toBe('black')
    expect(board[4][4]).toBe('white')
    expect(board.flat().filter(Boolean)).toHaveLength(4)
    expect(player).toBe('black')
    expect(chipCounts).toEqual({ black: 2, white: 2 })
  })

  it('computes the opening valid moves for both players', () => {
    const { board, possibleMoves } = initialState()
    const validMoves = handleValidMoves(board, possibleMoves)
    expect(Object.keys(validMoves.black).sort()).toEqual([
      '2,3',
      '3,2',
      '4,5',
      '5,4',
    ])
    expect(Object.keys(validMoves.white).sort()).toEqual([
      '2,4',
      '3,5',
      '4,2',
      '5,3',
    ])
  })
})

describe('handleChipCount', () => {
  it('counts discs per color', () => {
    expect(handleChipCount(initialState().board)).toEqual({
      black: 2,
      white: 2,
    })
    expect(handleChipCount(emptyBoard())).toEqual({ black: 0, white: 0 })
  })
})

describe('handleFlip', () => {
  it('flips a horizontal line', () => {
    const board = boardWith({ '0,1': 'white', '0,2': 'white', '0,3': 'black' })
    const result = handleFlip(board, 'black', 0, 0)
    expect(result[0].slice(0, 4)).toEqual(['black', 'black', 'black', 'black'])
  })

  it('flips a vertical line', () => {
    const board = boardWith({ '1,4': 'white', '2,4': 'white', '3,4': 'black' })
    const result = handleFlip(board, 'black', 0, 4)
    expect([0, 1, 2, 3].map((row) => result[row][4])).toEqual(
      Array(4).fill('black')
    )
  })

  it('flips a diagonal line', () => {
    const board = boardWith({ '1,1': 'white', '2,2': 'white', '3,3': 'black' })
    const result = handleFlip(board, 'black', 0, 0)
    expect([0, 1, 2, 3].map((i) => result[i][i])).toEqual(
      Array(4).fill('black')
    )
  })

  it('flips an anti-diagonal line', () => {
    const board = boardWith({ '3,3': 'white', '2,4': 'white', '1,5': 'black' })
    const result = handleFlip(board, 'black', 4, 2)
    expect(result[3][3]).toBe('black')
    expect(result[2][4]).toBe('black')
  })

  it('flips in several directions at once', () => {
    const board = boardWith({
      '3,4': 'white',
      '3,5': 'black',
      '4,3': 'white',
      '5,3': 'black',
      '4,4': 'white',
      '5,5': 'black',
    })
    const result = handleFlip(board, 'black', 3, 3)
    expect(result[3][4]).toBe('black')
    expect(result[4][3]).toBe('black')
    expect(result[4][4]).toBe('black')
  })

  it('does not flip a line that is not capped by the mover', () => {
    const board = boardWith({ '0,1': 'white', '0,2': 'white' })
    const result = handleFlip(board, 'black', 0, 0)
    expect(result[0].slice(0, 3)).toEqual(['black', 'white', 'white'])
  })

  it('does not flip across an empty square', () => {
    const board = boardWith({ '0,1': 'white', '0,3': 'black' })
    const result = handleFlip(board, 'black', 0, 0)
    expect(result[0][1]).toBe('white')
  })

  it('handles corners and edges without leaving the board', () => {
    const corner = boardWith({ '7,6': 'white', '7,5': 'black' })
    expect(handleFlip(corner, 'black', 7, 7)[7].slice(5)).toEqual([
      'black',
      'black',
      'black',
    ])

    const edge = boardWith({ '0,3': 'white', '0,4': 'black' })
    const result = handleFlip(edge, 'black', 0, 2)
    expect(result[0].slice(2, 5)).toEqual(['black', 'black', 'black'])
  })

  it('does not mutate the board it receives', () => {
    const board = boardWith({ '0,1': 'white', '0,2': 'black' })
    const snapshot = cloneDeep(board)
    const result = handleFlip(board, 'black', 0, 0)
    expect(board).toEqual(snapshot)
    expect(result).not.toBe(board)
  })
})

describe('handlePossibleMoves', () => {
  it('removes the played square and adds its empty neighbors', () => {
    const board = initialState().board
    const result = handlePossibleMoves(board, { '2,3': [2, 3] }, 2, 3)
    expect(result['2,3']).toBeUndefined()
    expect(result['1,2']).toEqual([1, 2])
    expect(result['1,4']).toEqual([1, 4])
    expect(result['3,3']).toBeUndefined()
  })

  it('stays within the board for corner moves', () => {
    const result = handlePossibleMoves(emptyBoard(), {}, 0, 0)
    expect(Object.keys(result).sort()).toEqual(['0,1', '1,0', '1,1'])
  })

  it('does not mutate the possible moves it receives', () => {
    const possibleMoves = { '2,3': [2, 3] as [number, number] }
    handlePossibleMoves(initialState().board, possibleMoves, 2, 3)
    expect(possibleMoves).toEqual({ '2,3': [2, 3] })
  })
})

describe('handlePlayerTurn', () => {
  const none = { black: {}, white: {} }

  it('passes the turn to the next player when they can move', () => {
    const validMoves = {
      black: {},
      white: { '0,0': [0, 0] as [number, number] },
    }
    expect(handlePlayerTurn(validMoves, 'black', 'white')).toBe('white')
  })

  it('keeps the current player when the next player has no moves', () => {
    expect(handlePlayerTurn(none, 'black', 'white')).toBe('black')
  })
})

describe('handleWinningCondition', () => {
  const someMoves = {
    black: { '0,0': [0, 0] as [number, number] },
    white: { '0,1': [0, 1] as [number, number] },
  }

  it('is not over mid-game', () => {
    expect(handleWinningCondition({ black: 10, white: 10 }, someMoves)).toBe(
      false
    )
  })

  it.each([
    ['black wiped out', { black: 0, white: 5 }],
    ['white wiped out', { black: 5, white: 0 }],
    ['board full', { black: 30, white: 34 }],
  ])('is over when %s', (_, counts) => {
    expect(handleWinningCondition(counts, someMoves)).toBe(true)
  })

  it('is over when neither player can move', () => {
    expect(
      handleWinningCondition({ black: 10, white: 10 }, { black: {}, white: {} })
    ).toBe(true)
  })

  it('is not over when only one player is stuck', () => {
    expect(
      handleWinningCondition(
        { black: 10, white: 10 },
        { black: {}, white: someMoves.white }
      )
    ).toBe(false)
  })
})

describe('applyMove', () => {
  it('plays a legal opening move, flips discs and passes the turn', () => {
    const next = applyMove(initialState(), 'black', 2, 3)
    expect(next.board[2][3]).toBe('black')
    expect(next.board[3][3]).toBe('black')
    expect(next.chipCounts).toEqual({ black: 4, white: 1 })
    expect(next.player).toBe('white')
    expect(next.openModal).toBe(false)
  })

  it('alternates turns across consecutive moves', () => {
    const afterBlack = applyMove(initialState(), 'black', 2, 3)
    const [row, col] = Object.values(afterBlack.validMoves.white)[0]
    const afterWhite = applyMove(afterBlack, 'white', row, col)
    expect(afterWhite.player).toBe('black')
  })

  it('recomputes valid moves for the new position', () => {
    const next = applyMove(initialState(), 'black', 2, 3)
    expect(next.validMoves.white['2,3']).toBeUndefined()
    expect(Object.keys(next.validMoves.white).length).toBeGreaterThan(0)
    expect(next.possibleMoves['2,3']).toBeUndefined()
  })

  it('does not mutate the state it receives', () => {
    const state = initialState()
    const snapshot = cloneDeep(state)
    const next = applyMove(state, 'black', 2, 3)
    expect(state).toEqual(snapshot)
    expect(next.board).not.toBe(state.board)
  })

  it('lets the same player move again when the opponent must skip', () => {
    const state = stateFromBoard(
      boardWith({
        '0,1': 'white',
        '0,2': 'black',
        '6,0': 'white',
        '7,0': 'black',
      }),
      'black'
    )
    const next = applyMove(state, 'black', 0, 0)
    expect(next.board[0][1]).toBe('black')
    expect(Object.keys(next.validMoves.white)).toHaveLength(0)
    expect(Object.keys(next.validMoves.black)).toContain('5,0')
    expect(next.player).toBe('black')
    expect(next.openModal).toBe(false)
  })

  it('ends the game when the opponent is wiped out', () => {
    const state = stateFromBoard(
      boardWith({ '0,1': 'white', '0,2': 'black' }),
      'black'
    )
    const next = applyMove(state, 'black', 0, 0)
    expect(next.chipCounts).toEqual({ black: 3, white: 0 })
    expect(next.openModal).toBe(true)
  })

  it('ends the game when neither player can move', () => {
    const state = stateFromBoard(
      boardWith({ '0,1': 'white', '0,2': 'black', '7,7': 'black' }),
      'black'
    )
    const next = applyMove(state, 'black', 0, 0)
    expect(next.openModal).toBe(true)
  })

  it('supports corner moves', () => {
    const state = stateFromBoard(
      boardWith({
        '7,6': 'white',
        '7,5': 'black',
        '6,7': 'white',
        '5,7': 'black',
      }),
      'black'
    )
    expect(state.validMoves.black['7,7']).toEqual([7, 7])
    const next = applyMove(state, 'black', 7, 7)
    expect(next.board[7][6]).toBe('black')
    expect(next.board[6][7]).toBe('black')
    expect(next.chipCounts.white).toBe(0)
  })
})

describe('getBestMove', () => {
  const legal = (state: OthelloState, move: [number, number] | null) =>
    move !== null && `${move[0]},${move[1]}` in state.validMoves[state.player]

  it('returns null when the player has no legal move', () => {
    expect(getBestMove(boardWith({ '0,0': 'black' }), 'white', 5)).toBeNull()
    expect(getBestMove(emptyBoard(), 'black', 10)).toBeNull()
  })

  it.each([1, 3, 5, 7] as Difficulty[])(
    'returns a legal move at difficulty %i',
    (difficulty) => {
      const state = initialState()
      const move = getBestMove(state.board, 'black', difficulty)
      expect(legal(state, move)).toBe(true)
    }
  )

  it('returns a legal move when the weak levels choose randomly', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const state = initialState()
    expect(legal(state, getBestMove(state.board, 'black', 1))).toBe(true)
  })

  it('takes an available corner at the strongest level', () => {
    const board = boardWith({
      '7,6': 'white',
      '7,5': 'black',
      '3,3': 'white',
      '3,4': 'black',
    })
    expect(getBestMove(board, 'black', 10)).toEqual([7, 7])
  })

  it('does not mutate the board', () => {
    const board = initialState().board
    const snapshot = cloneDeep(board)
    getBestMove(board, 'black', 4)
    expect(board).toEqual(snapshot)
  })
})
