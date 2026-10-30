import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from './test/renderWithProviders'

// Othello opens a modal that aria-hides the page behind it, so queries include hidden elements.
const pageHeading = (name: string) =>
  screen.getByRole('heading', { level: 4, name, hidden: true })
const navButton = (name: string) =>
  within(
    screen.getByRole('navigation', { name: 'Main navigation', hidden: true })
  ).getByRole('button', { name, hidden: true })
const location = () => screen.getByTestId('location')

describe('App routing and navigation', () => {
  it('redirects the root URL to Weather', async () => {
    renderApp({ route: '/' })
    expect(location()).toHaveTextContent('/weather')
    expect(pageHeading('Weather')).toBeInTheDocument()
  })

  it.each([
    ['/weather', 'Weather'],
    ['/othello', 'Othello'],
    ['/fractal', 'Fractal'],
  ])('loads %s directly', (route, title) => {
    renderApp({ route })
    expect(location()).toHaveTextContent(route)
    expect(pageHeading(title)).toBeInTheDocument()
    expect(navButton(title)).toHaveAttribute('aria-current', 'page')
  })

  it('selects each application through navigation and updates the URL', async () => {
    const user = userEvent.setup()
    renderApp()

    for (const [title, path] of [
      ['Othello', '/othello'],
      ['Fractal', '/fractal'],
      ['Weather', '/weather'],
    ]) {
      await user.click(navButton(title))
      expect(location()).toHaveTextContent(path)
      expect(pageHeading(title)).toBeInTheDocument()
    }
  })

  it('marks only the active application in the navigation', async () => {
    const user = userEvent.setup()
    renderApp()

    expect(navButton('Weather')).toHaveAttribute('aria-current', 'page')
    expect(navButton('Othello')).not.toHaveAttribute('aria-current')

    await user.click(navButton('Othello'))

    expect(navButton('Othello')).toHaveAttribute('aria-current', 'page')
    expect(navButton('Weather')).not.toHaveAttribute('aria-current')
    expect(navButton('Fractal')).not.toHaveAttribute('aria-current')
  })

  it('follows browser history', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(navButton('Othello'))
    await user.click(navButton('Fractal'))

    await user.click(
      screen.getByRole('button', { name: 'history back', hidden: true })
    )
    expect(location()).toHaveTextContent('/othello')
    expect(pageHeading('Othello')).toBeInTheDocument()
    expect(navButton('Othello')).toHaveAttribute('aria-current', 'page')

    await user.click(
      screen.getByRole('button', { name: 'history forward', hidden: true })
    )
    expect(location()).toHaveTextContent('/fractal')
    expect(pageHeading('Fractal')).toBeInTheDocument()
  })

  it('falls back to Weather content for unknown paths', () => {
    renderApp({ route: '/nope' })
    expect(pageHeading('Weather')).toBeInTheDocument()
  })
})

describe('App theme and layout controls', () => {
  it('toggles between dark and light themes', async () => {
    const user = userEvent.setup()
    renderApp()

    const toggle = screen.getByRole('checkbox', { name: 'Dark' })
    expect(toggle).toBeChecked()

    await user.click(toggle)
    expect(toggle).not.toBeChecked()

    await user.click(toggle)
    expect(toggle).toBeChecked()
  })

  it('switches between top bar and sidebar navigation', async () => {
    const user = userEvent.setup()
    renderApp()

    expect(screen.getByRole('banner')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sidebar menu' }))

    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByRole('complementary')).toBeInTheDocument()
    expect(navButton('Weather')).toHaveAttribute('aria-current', 'page')
  })
})

describe('App state preservation', () => {
  it('keeps Weather input when navigating away and back', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByLabelText('Zip Code'), '98101')
    await user.click(navButton('Othello'))
    await user.click(navButton('Weather'))

    expect(screen.getByLabelText('Zip Code')).toHaveValue('98101')
  })

  it('keeps the Othello game in progress when navigating away and back', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/othello' })

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(
      screen.queryAllByRole('button', { name: /Place white disc/ })
    ).toHaveLength(0)

    await user.click(
      screen.getByRole('button', {
        name: 'Place black disc at row 3, column 4',
      })
    )
    const whiteMoves = screen.getAllByRole('button', {
      name: /Place white disc/,
    }).length
    expect(whiteMoves).toBeGreaterThan(0)

    await user.click(navButton('Fractal'))
    await user.click(navButton('Othello'))

    expect(
      screen.getAllByRole('button', { name: /Place white disc/ })
    ).toHaveLength(whiteMoves)
    expect(
      screen.queryAllByRole('button', { name: /Place black disc/ })
    ).toHaveLength(0)
  })
})
