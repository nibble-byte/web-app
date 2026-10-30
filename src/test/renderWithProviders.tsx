import { ReactElement } from 'react'
import { render } from '@testing-library/react'
import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import App from '../App'
import { AppProviders } from '../contexts/AppProviders'

interface RenderOptions {
  route?: string
}

// Wraps UI in the real app providers (feature flags, theme, navigation) inside a MemoryRouter.
export const renderWithProviders = (
  ui: ReactElement,
  { route = '/weather' }: RenderOptions = {}
) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders>{ui}</AppProviders>
    </MemoryRouter>
  )

const LocationProbe = () => {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <div>
      <output data-testid="location">{location.pathname}</output>
      <button onClick={() => navigate(-1)}>history back</button>
      <button onClick={() => navigate(1)}>history forward</button>
    </div>
  )
}

// Mirrors the route table in src/index.tsx; App brings its own providers.
export const renderApp = ({ route = '/' }: RenderOptions = {}) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <LocationProbe />
      <Routes>
        <Route path="/" element={<Navigate to="/weather" replace />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </MemoryRouter>
  )
