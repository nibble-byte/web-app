import { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { composeProviders } from './composeProviders'

const tag =
  (name: string) =>
  ({ children }: { children: ReactNode }) => (
    <section data-testid={name}>{children}</section>
  )

describe('composeProviders', () => {
  it('nests providers in the order given, first outermost', () => {
    const Composed = composeProviders(tag('outer'), tag('inner'))
    render(
      <Composed>
        <span>content</span>
      </Composed>
    )

    const outer = screen.getByTestId('outer')
    const inner = screen.getByTestId('inner')
    expect(outer).toContainElement(inner)
    expect(inner).toContainElement(screen.getByText('content'))
  })

  it('renders children untouched when no providers are given', () => {
    const Composed = composeProviders()
    render(
      <Composed>
        <span>content</span>
      </Composed>
    )
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
