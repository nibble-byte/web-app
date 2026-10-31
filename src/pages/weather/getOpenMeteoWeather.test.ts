import getOpenMeteoWeather, { WeatherRequestError } from './getOpenMeteoWeather'
import { INCOMPLETE_FORECAST_MESSAGE } from './parseForecast'
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
    expect(result.issues).toEqual([])
  })

  describe('partial success', () => {
    const failing =
      (status = 500, statusText = 'Server Error') =>
      () =>
        new Response('', { status, statusText })

    it('keeps historical data when the forecast request fails', async () => {
      mockFetch([
        {
          match: ARCHIVE,
          handler: () => jsonResponse(buildOpenMeteoResponse(2, 0)),
        },
        { match: FORECAST, handler: failing(429, 'Too Many Requests') },
      ])

      const result = await getOpenMeteoWeather(location)

      expect(result.daily.time).toEqual(['2026-03-10', '2026-03-11'])
      expect(result.issues).toEqual([
        {
          source: 'forecast',
          kind: 'request-failed',
          message:
            'Error fetching forecast weather data: 429 Too Many Requests',
        },
      ])
    })

    it('keeps forecast data when the historical request fails', async () => {
      mockFetch([
        { match: ARCHIVE, handler: failing() },
        {
          match: FORECAST,
          handler: () => jsonResponse(buildOpenMeteoResponse(2, 2)),
        },
      ])

      const result = await getOpenMeteoWeather(location)

      expect(result.daily.time).toEqual(['2026-03-12', '2026-03-13'])
      expect(result.issues).toEqual([
        expect.objectContaining({
          source: 'historical',
          kind: 'request-failed',
        }),
      ])
    })

    it('keeps one source when the other has a network failure', async () => {
      mockFetch([
        {
          match: ARCHIVE,
          handler: () => {
            throw new TypeError('Failed to fetch')
          },
        },
        {
          match: FORECAST,
          handler: () => jsonResponse(buildOpenMeteoResponse(1, 2)),
        },
      ])

      const result = await getOpenMeteoWeather(location)

      expect(result.daily.time).toEqual(['2026-03-12'])
      expect(result.issues[0]).toMatchObject({
        source: 'historical',
        message: 'Failed to fetch',
      })
    })

    it('keeps one source when the other returns invalid JSON', async () => {
      mockFetch([
        {
          match: ARCHIVE,
          handler: () => new Response('<html>', { status: 200 }),
        },
        {
          match: FORECAST,
          handler: () => jsonResponse(buildOpenMeteoResponse(1, 2)),
        },
      ])

      const result = await getOpenMeteoWeather(location)

      expect(result.daily.time).toEqual(['2026-03-12'])
      expect(result.issues).toEqual([
        {
          source: 'historical',
          kind: 'request-failed',
          message: 'Received invalid historical weather data.',
        },
      ])
    })

    it('rejects with every failure when both requests fail', async () => {
      mockFetch([
        { match: ARCHIVE, handler: failing() },
        { match: FORECAST, handler: failing(429, 'Too Many Requests') },
      ])

      const error = await getOpenMeteoWeather(location).catch((e) => e)

      expect(error).toBeInstanceOf(WeatherRequestError)
      expect(error.message).toContain(
        'Error fetching historical weather data: 500 Server Error'
      )
      expect(error.message).toContain(
        'Error fetching forecast weather data: 429 Too Many Requests'
      )
      expect(error.issues).toHaveLength(2)
    })

    it('rejects when one request fails and the other has no usable data', async () => {
      mockFetch([
        { match: ARCHIVE, handler: failing() },
        { match: FORECAST, handler: () => jsonResponse({}) },
      ])
      await expect(getOpenMeteoWeather(location)).rejects.toBeInstanceOf(
        WeatherRequestError
      )
    })

    it('reports incomplete data, not a request failure, when both succeed without weather data', async () => {
      mockFetch([
        { match: ARCHIVE, handler: () => jsonResponse({}) },
        { match: FORECAST, handler: () => jsonResponse({ daily: null }) },
      ])
      await expect(getOpenMeteoWeather(location)).rejects.toThrow(
        INCOMPLETE_FORECAST_MESSAGE
      )
    })

    it('reports which source lacks daily or hourly data', async () => {
      mockFetch([
        {
          match: ARCHIVE,
          handler: () =>
            jsonResponse({ daily: buildOpenMeteoResponse(1, 0).daily }),
        },
        {
          match: FORECAST,
          handler: () =>
            jsonResponse({ hourly: buildOpenMeteoResponse(1, 2).hourly }),
        },
      ])

      const result = await getOpenMeteoWeather(location)

      expect(result.daily.time).toEqual(['2026-03-10'])
      expect(result.hourly.time).toHaveLength(24)
      expect(result.issues.map(({ source, kind }) => [source, kind])).toEqual([
        ['historical', 'missing-hourly'],
        ['forecast', 'missing-daily'],
      ])
    })
  })

  describe('timestamp merging', () => {
    const merge = async (historical: unknown, forecast: unknown) => {
      mockFetch([
        { match: ARCHIVE, handler: () => jsonResponse(historical) },
        { match: FORECAST, handler: () => jsonResponse(forecast) },
      ])
      return getOpenMeteoWeather(location)
    }

    it('de-duplicates overlapping days, preferring history for past dates', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-03-12T12:00:00Z'))

      const result = await merge(
        {
          daily: {
            time: ['2026-03-10', '2026-03-11', '2026-03-12'],
            temperature_2m_max: [1, 2, 3],
          },
        },
        {
          daily: {
            time: ['2026-03-11', '2026-03-12', '2026-03-13'],
            temperature_2m_max: [20, 30, 40],
          },
        }
      )

      expect(result.daily.time).toEqual([
        '2026-03-10',
        '2026-03-11',
        '2026-03-12',
        '2026-03-13',
      ])
      // 03-11 is in the past (history wins); 03-12 and later prefer the forecast.
      expect(result.daily.temperature_2m_max).toEqual([1, 2, 30, 40])
    })

    it('uses the API utc offset to decide what is in the past', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-03-12T20:00:00Z'))

      const result = await merge(
        { daily: { time: ['2026-03-12'], temperature_2m_max: [1] } },
        {
          utc_offset_seconds: 5 * 3600,
          daily: { time: ['2026-03-12'], temperature_2m_max: [2] },
        }
      )
      // 20:00Z is already 03-13 at UTC+5, so 03-12 is past and history wins.
      expect(result.daily.temperature_2m_max).toEqual([1])
    })

    it('fills null values from the other source', async () => {
      const result = await merge(
        {
          daily: {
            time: ['2026-03-01'],
            temperature_2m_max: [null],
            temperature_2m_min: [10],
          },
        },
        {
          daily: {
            time: ['2026-03-01'],
            temperature_2m_max: [50],
            temperature_2m_min: [null],
          },
        }
      )
      expect(result.daily.temperature_2m_max).toEqual([50])
      expect(result.daily.temperature_2m_min).toEqual([10])
    })

    it('sorts out-of-order timestamps and removes duplicates within a source', async () => {
      const result = await merge(
        {
          daily: {
            time: ['2026-03-03', '2026-03-01', '2026-03-03'],
            temperature_2m_max: [3, 1, 33],
          },
        },
        { daily: { time: ['2026-03-02'], temperature_2m_max: [2] } }
      )
      expect(result.daily.time).toEqual([
        '2026-03-01',
        '2026-03-02',
        '2026-03-03',
      ])
      expect(result.daily.temperature_2m_max).toEqual([1, 2, 3])
    })

    it('supports arrays of different lengths and fields present in one source', async () => {
      const result = await merge(
        {
          daily: {
            time: ['2026-03-01', '2026-03-02'],
            temperature_2m_max: [1],
            sunrise: ['2026-03-01T06:00', '2026-03-02T06:01'],
          },
        },
        {
          daily: {
            time: ['2026-03-03'],
            temperature_2m_max: [3],
            precipitation_probability_max: [40],
          },
        }
      )

      expect(result.daily.time).toHaveLength(3)
      expect(result.daily.temperature_2m_max).toEqual([1, null, 3])
      expect(result.daily.sunrise).toEqual([
        '2026-03-01T06:00',
        '2026-03-02T06:01',
        null,
      ])
      expect(result.daily.precipitation_probability_max).toEqual([
        null,
        null,
        40,
      ])
    })

    it('ignores entries without a usable timestamp', async () => {
      const result = await merge(
        {
          daily: {
            time: ['2026-03-01', null, ''],
            temperature_2m_max: [1, 2, 3],
          },
        },
        { daily: { time: [], temperature_2m_max: [] } }
      )
      expect(result.daily.time).toEqual(['2026-03-01'])
      expect(result.daily.temperature_2m_max).toEqual([1])
    })

    it('merges hourly data by timestamp without a fixed overlap', async () => {
      const result = await merge(
        {
          hourly: {
            time: ['2026-03-01T00:00', '2026-03-01T01:00', '2026-03-01T02:00'],
            temperature_2m: [10, null, 12],
          },
        },
        {
          hourly: {
            time: ['2026-03-01T01:00', '2026-03-01T02:00', '2026-03-01T03:00'],
            temperature_2m: [99, 98, 13],
          },
        }
      )
      expect(result.hourly.time).toEqual([
        '2026-03-01T00:00',
        '2026-03-01T01:00',
        '2026-03-01T02:00',
        '2026-03-01T03:00',
      ])
      // Past hours keep history; the missing 01:00 reading falls back to the forecast.
      expect(result.hourly.temperature_2m).toEqual([10, 99, 12, 13])
    })

    it('does not mutate the parsed responses or shift local timestamps', async () => {
      const historical = {
        hourly: {
          time: ['2026-03-01T23:00'],
          temperature_2m: [null],
        },
      }
      const snapshot = JSON.stringify(historical)
      const result = await merge(historical, {
        hourly: { time: ['2026-03-02T00:00'], temperature_2m: [5] },
      })
      expect(JSON.stringify(historical)).toBe(snapshot)
      expect(result.hourly.time).toEqual([
        '2026-03-01T23:00',
        '2026-03-02T00:00',
      ])
      expect(result.hourly.temperature_2m).toEqual([null, 5])
    })
  })
})
