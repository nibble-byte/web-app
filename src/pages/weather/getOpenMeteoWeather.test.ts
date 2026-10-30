import getOpenMeteoWeather from './getOpenMeteoWeather'
import { jsonResponse, mockFetch } from '../../test/mocks/network'
import { buildOpenMeteoResponse } from '../../test/mocks/weatherFixtures'

const location = { latitude: 47.6, longitude: -122.3 }
const ARCHIVE = 'archive-api.open-meteo.com'
const FORECAST = 'api.open-meteo.com/v1/forecast'

describe('getOpenMeteoWeather', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('requests historical and forecast windows relative to today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'))
    const fetchMock = mockFetch([
      { match: ARCHIVE, handler: () => jsonResponse(buildOpenMeteoResponse()) },
      {
        match: FORECAST,
        handler: () => jsonResponse(buildOpenMeteoResponse()),
      },
    ])

    await getOpenMeteoWeather(location)

    const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url)))
    const archive = urls.find((url) => url.host === ARCHIVE)!
    const forecast = urls.find((url) => url.pathname === '/v1/forecast')!

    expect(archive.searchParams.get('start_date')).toBe('2026-03-05')
    expect(archive.searchParams.get('end_date')).toBe('2026-03-14')
    expect(forecast.searchParams.get('start_date')).toBe('2026-03-14')
    expect(forecast.searchParams.get('end_date')).toBe('2026-03-30')
    for (const url of [archive, forecast]) {
      expect(url.searchParams.get('latitude')).toBe('47.6')
      expect(url.searchParams.get('longitude')).toBe('-122.3')
      expect(url.searchParams.get('temperature_unit')).toBe('fahrenheit')
    }
  })

  it('concatenates daily data from both responses', async () => {
    mockFetch([
      {
        match: ARCHIVE,
        handler: () => jsonResponse(buildOpenMeteoResponse(2, 0)),
      },
      {
        match: FORECAST,
        handler: () => jsonResponse(buildOpenMeteoResponse(3, 2)),
      },
    ])

    const result = await getOpenMeteoWeather(location)

    expect(result.daily.time).toEqual([
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
      '2026-03-14',
    ])
    expect(result.daily.temperature_2m_max).toEqual([60, 61, 62, 63, 64])
  })

  it('fills null historical hours from the overlapping forecast and drops the overlap', async () => {
    const historical = buildOpenMeteoResponse(2)
    const forecast = buildOpenMeteoResponse(2)
    historical.hourly.temperature_2m[47] = null as unknown as number
    forecast.hourly.temperature_2m[23] = 999
    mockFetch([
      { match: ARCHIVE, handler: () => jsonResponse(historical) },
      { match: FORECAST, handler: () => jsonResponse(forecast) },
    ])

    const result = await getOpenMeteoWeather(location)

    expect(result.hourly.temperature_2m).toHaveLength(48 + 24)
    expect(result.hourly.temperature_2m[47]).toBe(999)
    expect(result.hourly.temperature_2m[48]).toBe(
      forecast.hourly.temperature_2m[24]
    )
  })

  it('returns empty merged sections when a response has no daily or hourly data', async () => {
    mockFetch([
      { match: ARCHIVE, handler: () => jsonResponse({}) },
      { match: FORECAST, handler: () => jsonResponse({}) },
    ])
    await expect(getOpenMeteoWeather(location)).resolves.toEqual({
      daily: {},
      hourly: {},
    })
  })

  it('rejects with a descriptive error when the historical request fails', async () => {
    mockFetch([
      {
        match: ARCHIVE,
        handler: () =>
          new Response('', { status: 500, statusText: 'Server Error' }),
      },
      {
        match: FORECAST,
        handler: () => jsonResponse(buildOpenMeteoResponse()),
      },
    ])
    await expect(getOpenMeteoWeather(location)).rejects.toThrow(
      'Error fetching historical weather data: 500 Server Error'
    )
  })

  it('rejects with a descriptive error when the forecast request fails', async () => {
    mockFetch([
      { match: ARCHIVE, handler: () => jsonResponse(buildOpenMeteoResponse()) },
      {
        match: FORECAST,
        handler: () =>
          new Response('', { status: 429, statusText: 'Too Many Requests' }),
      },
    ])
    await expect(getOpenMeteoWeather(location)).rejects.toThrow(
      'Error fetching forecast weather data: 429 Too Many Requests'
    )
  })

  it('rejects when a response body is not valid JSON', async () => {
    mockFetch([
      {
        match: ARCHIVE,
        handler: () => new Response('<html>', { status: 200 }),
      },
      {
        match: FORECAST,
        handler: () => jsonResponse(buildOpenMeteoResponse()),
      },
    ])
    await expect(getOpenMeteoWeather(location)).rejects.toThrow()
  })
})
