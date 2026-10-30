import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Othello from './othello'

const startHumanGame = async () => {
  const user = userEvent.setup()
  render(<Othello navigationLayout="top" />)
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  return user
}

const square = (row: number, col: number, state: string) =>
  screen.getByRole('button', { name: `Row ${row}, Column ${col}, ${state}` })

describe('Othello board accessibility', () => {
  it('labels the starting pieces by color', async () => {
    await startHumanGame()

    expect(square(4, 4, 'White piece')).toBeInTheDocument()
    expect(square(4, 5, 'Black piece')).toBeInTheDocument()
    expect(square(5, 4, 'Black piece')).toBeInTheDocument()
    expect(square(5, 5, 'White piece')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Black piece/ })).toHaveLength(
      2
    )
    expect(screen.getAllByRole('button', { name: /White piece/ })).toHaveLength(
      2
    )
  })

  it('labels the remaining squares as empty or playable', async () => {
    await startHumanGame()

    expect(
      screen.getAllByRole('button', { name: /Place black disc/ })
    ).toHaveLength(4)
    expect(
      screen.getAllByRole('button', { name: /Empty square/ })
    ).toHaveLength(64 - 4 - 4)
    expect(square(1, 1, 'Empty square')).toBeInTheDocument()
  })

  it('offers the opening moves to black only', async () => {
    await startHumanGame()
    for (const [row, col] of [
      [3, 4],
      [4, 3],
      [5, 6],
      [6, 5],
    ]) {
      expect(
        screen.getByRole('button', {
          name: `Place black disc at row ${row}, column ${col}`,
        })
      ).toBeInTheDocument()
    }
    expect(
      screen.queryByRole('button', { name: /Place white disc/ })
    ).not.toBeInTheDocument()
  })

  it('updates labels after a move and passes the turn', async () => {
    const user = await startHumanGame()

    await user.click(
      screen.getByRole('button', {
        name: 'Place black disc at row 3, column 4',
      })
    )

    expect(square(3, 4, 'Black piece')).toBeInTheDocument()
    expect(square(4, 4, 'Black piece')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Black piece/ })).toHaveLength(
      4
    )
    expect(screen.getAllByRole('button', { name: /White piece/ })).toHaveLength(
      1
    )
    expect(
      screen.queryByRole('button', { name: /Place black disc/ })
    ).not.toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /Place white disc/ })
    ).toHaveLength(3)
  })

  it('ignores clicks on squares that are not legal moves', async () => {
    const user = await startHumanGame()

    await user.click(square(1, 1, 'Empty square'))
    await user.click(square(4, 4, 'White piece'))

    expect(screen.getAllByRole('button', { name: /Black piece/ })).toHaveLength(
      2
    )
    expect(
      screen.getAllByRole('button', { name: /Place black disc/ })
    ).toHaveLength(4)
  })

  it('lets a playable square be played with the keyboard', async () => {
    const user = await startHumanGame()

    const target = screen.getByRole('button', {
      name: 'Place black disc at row 3, column 4',
    })
    target.focus()
    await user.keyboard('{Enter}')

    expect(square(3, 4, 'Black piece')).toBeInTheDocument()
  })

  it('shows the legal-move prompts for the player to move in the board region', async () => {
    await startHumanGame()
    const playable = screen.getAllByRole('button', { name: /Place black disc/ })
    for (const button of playable) {
      expect(within(button).queryByText(/./)).not.toBeInTheDocument()
    }
  })
})
