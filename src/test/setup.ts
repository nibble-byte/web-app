import '@testing-library/jest-dom/vitest'
import { mockFetch } from './mocks/network'

vi.mock('react-konva', () => import('./mocks/reactKonva'))

// jsdom has no ResizeObserver, which recharts' ResponsiveContainer needs.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  mockFetch()
})
