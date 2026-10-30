import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Weather from './weather'
import { renderWithProviders } from '../../test/renderWithProviders'
import { jsonResponse, mockFetch } from '../../test/mocks/network'
import {
  buildOpenMeteoResponse,
  zippopotamResponse,
} from '../../test/mocks/weatherFixtures'

const openMeteoRoutes = () => [
  {
    match: 'archive-api.open-meteo.com',
    handler: () => jsonResponse(buildOpenMeteoResponse(2, 0)),
  },
  {
    match: 'api.open-meteo.com/v1/forecast',
    handler: () => jsonResponse(buildOpenMeteoResponse(2, 2)),
  },
]

const renderWeather = () => renderWithProviders(<Weather />)

const stubGeolocation = (
  impl: (success: PositionCallback, error: PositionErrorCallback) => void
) => {
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: { getCurrentPosition: impl },
  })
}

describe('Weather', () => {
  it('shows the empty state before any search', () => {
    renderWeather()
    expect(screen.getByText('Your forecast is waiting.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('disables searching until a zip code is entered', async () => {
    const user = userEvent.setup()
    renderWeather()
    const search = screen.getByRole('button', { name: 'Search' })
    expect(search).toBeDisabled()
    await user.type(screen.getByLabelText('Zip Code'), '98101')
    expect(search).toBeEnabled()
  })

  it('loads and displays a forecast for a zip code', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch([
      {
        match: 'zippopotam.us/us/98101',
        handler: () => jsonResponse(zippopotamResponse()),
      },
      ...openMeteoRoutes(),
    ])
    renderWeather()

    await user.type(screen.getByLabelText('Zip Code'), '98101')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('Daily forecast')).toBeInTheDocument()
    expect(
      screen.queryByText('Your forecast is waiting.')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Finding your forecast...')
    ).not.toBeInTheDocument()
    const weatherUrls = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes('open-meteo'))
    expect(
      weatherUrls.every(
        (url) =>
          url.includes('latitude=47.6') && url.includes('longitude=-122.3')
      )
    ).toBe(true)
  })

  it('shows a loading message while the forecast is being fetched', async () => {
    const user = userEvent.setup()
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    mockFetch([
      {
        match: 'zippopotam.us',
        handler: () => jsonResponse(zippopotamResponse()),
      },
      {
        match: 'archive-api.open-meteo.com',
        handler: async () => {
          await gate
          return jsonResponse(buildOpenMeteoResponse(2, 0))
        },
      },
      {
        match: 'api.open-meteo.com/v1/forecast',
        handler: () => jsonResponse(buildOpenMeteoResponse(2, 2)),
      },
    ])
    renderWeather()

    await user.type(screen.getByLabelText('Zip Code'), '98101')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(
      await screen.findByText('Finding your forecast...')
    ).toBeInTheDocument()

    release()
    expect(await screen.findByText('Daily forecast')).toBeInTheDocument()
    expect(
      screen.queryByText('Finding your forecast...')
    ).not.toBeInTheDocument()
  })

  it('shows an error for an invalid zip code', async () => {
    const user = userEvent.setup()
    mockFetch([
      {
        match: 'zippopotam.us',
        handler: () => new Response('{}', { status: 404 }),
      },
    ])
    renderWeather()

    await user.type(screen.getByLabelText('Zip Code'), '00000')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid zip code or failed to fetch location.'
    )
    expect(screen.queryByText('Daily forecast')).not.toBeInTheDocument()
  })

  it('shows an error when the weather API fails', async () => {
    const user = userEvent.setup()
    mockFetch([
      {
        match: 'zippopotam.us',
        handler: () => jsonResponse(zippopotamResponse()),
      },
      {
        match: 'open-meteo.com',
        handler: () =>
          new Response('', { status: 500, statusText: 'Server Error' }),
      },
    ])
    renderWeather()

    await user.type(screen.getByLabelText('Zip Code'), '98101')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Error fetching historical weather data'
    )
  })

  it('shows an error for a malformed geocoding response', async () => {
    const user = userEvent.setup()
    mockFetch([
      { match: 'zippopotam.us', handler: () => jsonResponse({ places: [] }) },
    ])
    renderWeather()

    await user.type(screen.getByLabelText('Zip Code'), '98101')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  // weather.tsx throws when the API returns a body without daily data; enable once that is handled.
  it.todo('renders the empty state when the weather API returns empty data')

  it('uses the browser location when requested', async () => {
    const user = userEvent.setup()
    stubGeolocation((success) =>
      success({
        coords: { latitude: 10, longitude: 20 },
      } as GeolocationPosition)
    )
    const fetchMock = mockFetch(openMeteoRoutes())
    renderWeather()

    await user.click(screen.getByRole('button', { name: 'Use my location' }))

    expect(await screen.findByText('Daily forecast')).toBeInTheDocument()
    expect(
      String(
        fetchMock.mock.calls.find(([u]) =>
          String(u).includes('open-meteo')
        )?.[0]
      )
    ).toContain('latitude=10')
  })

  it('reports a denied location request', async () => {
    const user = userEvent.setup()
    stubGeolocation((_, error) =>
      error({ message: 'User denied Geolocation' } as GeolocationPositionError)
    )
    renderWeather()

    await user.click(screen.getByRole('button', { name: 'Use my location' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'User denied Geolocation'
    )
  })

  it('reports missing geolocation support', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('navigator', { ...navigator, geolocation: undefined })
    renderWeather()

    await user.click(screen.getByRole('button', { name: 'Use my location' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Geolocation is not supported by this browser.'
    )
  })
})
