import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Cell from './cell'
import { Player, ValidMoves } from './types'

const noMoves: ValidMoves = { black: {}, white: {} }

const renderCell = ({
  value = '',
  player = 'black',
  validMoves = noMoves,
  onClick = vi.fn(),
}: {
  value?: string
  player?: Player
  validMoves?: ValidMoves
  onClick?: (player: Player, row: number, col: number) => void
} = {}) => {
  render(
    <Cell
      player={player}
      value={value}
      row={2}
      col={3}
      onClick={onClick}
      validMoves={validMoves}
    />
  )
  return onClick
}

describe('Cell accessible names', () => {
  it('describes a black piece', () => {
    renderCell({ value: 'black' })
    expect(
      screen.getByRole('button', { name: 'Row 3, Column 4, Black piece' })
    ).toBeInTheDocument()
  })

  it('describes a white piece', () => {
    renderCell({ value: 'white' })
    expect(
      screen.getByRole('button', { name: 'Row 3, Column 4, White piece' })
    ).toBeInTheDocument()
  })

  it('describes an empty square', () => {
    renderCell({ value: '' })
    expect(
      screen.getByRole('button', { name: 'Row 3, Column 4, Empty square' })
    ).toBeInTheDocument()
  })

  it('labels pieces the same way regardless of whose turn it is', () => {
    renderCell({ value: 'black', player: 'white' })
    expect(
      screen.getByLabelText('Row 3, Column 4, Black piece')
    ).toBeInTheDocument()
  })

  it.each(['black', 'white'] as Player[])(
    'announces a legal move for %s',
    (player) => {
      renderCell({
        player,
        validMoves: { ...noMoves, [player]: { '2,3': [2, 3] } },
      })
      expect(
        screen.getByRole('button', {
          name: `Place ${player} disc at row 3, column 4`,
        })
      ).toBeInTheDocument()
      expect(screen.queryByLabelText(/Empty square/)).not.toBeInTheDocument()
    }
  )

  it('does not mark a square legal for the other player', () => {
    renderCell({
      player: 'black',
      validMoves: { black: {}, white: { '2,3': [2, 3] } },
    })
    expect(
      screen.getByRole('button', { name: 'Row 3, Column 4, Empty square' })
    ).toBeInTheDocument()
  })
})

describe('Cell interaction', () => {
  it('reports the click with the current player and position', async () => {
    const user = userEvent.setup()
    const onClick = renderCell({
      player: 'white',
      validMoves: { black: {}, white: { '2,3': [2, 3] } },
    })
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith('white', 2, 3)
  })

  it('is operable from the keyboard', async () => {
    const user = userEvent.setup()
    const onClick = renderCell({
      validMoves: { black: { '2,3': [2, 3] }, white: {} },
    })
    await user.tab()
    expect(screen.getByRole('button')).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })
})
