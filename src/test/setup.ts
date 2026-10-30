import '@testing-library/jest-dom/vitest'
import { mockFetch } from './mocks/network'

vi.mock('react-konva', () => import('./mocks/reactKonva'))

beforeEach(() => {
  mockFetch()
})
