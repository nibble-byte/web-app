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

  describe('forecast data validation', () => {
    const INCOMPLETE =
      'The weather service returned incomplete forecast data. Please try again.'

    const searchWith = async (payload: () => unknown) => {
      const user = userEvent.setup()
      mockFetch([
        {
          match: 'zippopotam.us',
          handler: () => jsonResponse(zippopotamResponse()),
        },
        { match: 'open-meteo.com', handler: () => jsonResponse(payload()) },
      ])
      renderWeather()
      await user.type(screen.getByLabelText('Zip Code'), '98101')
      await user.click(screen.getByRole('button', { name: 'Search' }))
      return user
    }

    const expectIncompleteMessage = async () => {
      expect(await screen.findByRole('alert')).toHaveTextContent(INCOMPLETE)
      expect(screen.queryByText('Daily forecast')).not.toBeInTheDocument()
      expect(
        screen.queryByText('Finding your forecast...')
      ).not.toBeInTheDocument()
    }

    const withDaily = (change: (daily: Record<string, unknown>) => void) => {
      const data = buildOpenMeteoResponse(2, 0)
      change(data.daily as unknown as Record<string, unknown>)
      return data
    }

    it('shows the forecast for valid daily data', async () => {
      await searchWith(() => buildOpenMeteoResponse(2, 0))
      expect(await screen.findByText('Daily forecast')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it.each([
      ['an empty body', {}],
      [
        'a body with only hourly data',
        { hourly: buildOpenMeteoResponse().hourly },
      ],
      ['daily set to null', { daily: null, hourly: null }],
      ['daily that is not an object', { daily: 'oops', hourly: {} }],
      ['empty daily arrays', { daily: { time: [] }, hourly: {} }],
    ])('shows an incomplete-data message for %s', async (_, payload) => {
      await searchWith(() => payload)
      await expectIncompleteMessage()
    })

    it.each([
      'temperature_2m_max',
      'temperature_2m_min',
      'weathercode',
      'windspeed_10m_max',
      'sunrise',
      'sunset',
    ])(
      'shows an incomplete-data message when daily.%s is missing',
      async (key) => {
        await searchWith(() => withDaily((daily) => delete daily[key]))
        await expectIncompleteMessage()
      }
    )

    it('shows an incomplete-data message when a daily array is shorter than the dates', async () => {
      await searchWith(() => withDaily((daily) => (daily.weathercode = [1])))
      await expectIncompleteMessage()
    })

    it('shows an incomplete-data message when a daily value is null', async () => {
      await searchWith(() =>
        withDaily((daily) => (daily.temperature_2m_max = [60, null]))
      )
      await expectIncompleteMessage()
    })

    it('still shows the daily forecast when hourly data is missing', async () => {
      await searchWith(() => ({
        daily: buildOpenMeteoResponse(2, 0).daily,
        hourly: null,
      }))
      expect(await screen.findByText('Daily forecast')).toBeInTheDocument()
    })

    it('does not mistake a network failure for incomplete data', async () => {
      const user = userEvent.setup()
      mockFetch([
        {
          match: 'zippopotam.us',
          handler: () => jsonResponse(zippopotamResponse()),
        },
        {
          match: 'open-meteo.com',
          handler: () => {
            throw new TypeError('Failed to fetch')
          },
        },
      ])
      renderWeather()
      await user.type(screen.getByLabelText('Zip Code'), '98101')
      await user.click(screen.getByRole('button', { name: 'Search' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Failed to fetch'
      )
      expect(screen.queryByText(INCOMPLETE)).not.toBeInTheDocument()
    })

    it('recovers when a search succeeds after a failed one', async () => {
      let healthy = false
      const user = await searchWith(() =>
        healthy ? buildOpenMeteoResponse(2, 0) : {}
      )
      await expectIncompleteMessage()

      healthy = true
      await user.click(screen.getByRole('button', { name: 'Search' }))

      expect(await screen.findByText('Daily forecast')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('recovers after a network failure using the location button', async () => {
      stubGeolocation((success) =>
        success({
          coords: { latitude: 10, longitude: 20 },
        } as GeolocationPosition)
      )
      let healthy = false
      mockFetch([
        {
          match: 'open-meteo.com',
          handler: () =>
            healthy
              ? jsonResponse(buildOpenMeteoResponse(2, 0))
              : new Response('', { status: 500, statusText: 'Server Error' }),
        },
      ])
      const user = userEvent.setup()
      renderWeather()

      await user.click(screen.getByRole('button', { name: 'Use my location' }))
      expect(await screen.findByRole('alert')).toBeInTheDocument()

      healthy = true
      await user.click(screen.getByRole('button', { name: 'Use my location' }))
      expect(await screen.findByText('Daily forecast')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

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
