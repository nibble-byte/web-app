import {
  IncompleteForecastError,
  isValidTimestamp,
  mergeForecasts,
  parseForecast,
} from './parseForecast'
import { buildOpenMeteoResponse } from '../../test/mocks/weatherFixtures'

const dailyWith = (overrides: Record<string, unknown>, days = 1) => ({
  daily: { ...buildOpenMeteoResponse(days, 0).daily, ...overrides },
})

describe('parseForecast', () => {
  it('maps valid data to one forecast per day', () => {
    const { dailyForecasts, hourly, omittedRecords } = parseForecast(
      buildOpenMeteoResponse(3, 0)
    )

    expect(dailyForecasts).toHaveLength(3)
    expect(dailyForecasts[1]).toEqual({
      index: 1,
      time: '2026-03-11',
      temperature_2m_max: 61,
      temperature_2m_min: 41,
      weathercode: 1,
      precipitation_probability_max: 20,
      windspeed_10m_max: 10,
      sunrise: '2026-03-11T06:30',
      sunset: '2026-03-11T18:30',
    })
    expect(hourly.time).toHaveLength(72)
    expect(hourly.temperature_2m).toHaveLength(72)
    expect(omittedRecords).toBe(0)
  })

  describe('missing measurements', () => {
    it.each([
      ['temperature_2m_max'],
      ['temperature_2m_min'],
      ['weathercode'],
      ['windspeed_10m_max'],
      ['sunrise'],
      ['sunset'],
      ['precipitation_probability_max'],
    ])('keeps the day with %s unavailable', (key) => {
      const data = buildOpenMeteoResponse(1, 0)
      delete (data.daily as Record<string, unknown>)[key]

      const [day] = parseForecast(data).dailyForecasts

      expect(day[key as keyof typeof day]).toBeNull()
      expect(day.temperature_2m_max === null).toBe(key === 'temperature_2m_max')
      expect(day.time).toBe('2026-03-10')
    })

    it('never substitutes 0 for missing precipitation probability', () => {
      const [day] = parseForecast(
        dailyWith({ precipitation_probability_max: [null] })
      ).dailyForecasts
      expect(day.precipitation_probability_max).toBeNull()
    })

    it('keeps a real 0% precipitation probability', () => {
      const [day] = parseForecast(
        dailyWith({ precipitation_probability_max: [0] })
      ).dailyForecasts
      expect(day.precipitation_probability_max).toBe(0)
    })

    it('treats arrays shorter than the dates as missing values', () => {
      const { dailyForecasts } = parseForecast(
        dailyWith({ weathercode: [3] }, 2)
      )
      expect(dailyForecasts.map((day) => day.weathercode)).toEqual([3, null])
    })
  })

  describe('invalid values', () => {
    it.each([['1'], [NaN], [Infinity], [-Infinity], [{}], [true]])(
      'rejects the measurement %j but keeps valid ones',
      (bad) => {
        const [day] = parseForecast(
          dailyWith({ weathercode: [bad] })
        ).dailyForecasts
        expect(day.weathercode).toBeNull()
        expect(day.temperature_2m_max).toBe(60)
      }
    )

    it('rejects malformed sunrise and sunset values', () => {
      const [day] = parseForecast(
        dailyWith({ sunrise: ['not a time'], sunset: ['2026-13-45T99:99'] })
      ).dailyForecasts
      expect(day.sunrise).toBeNull()
      expect(day.sunset).toBeNull()
      expect(day.temperature_2m_min).toBe(40)
    })

    it('does not convert invalid numbers into other values', () => {
      const [day] = parseForecast(
        dailyWith({ temperature_2m_max: [NaN], temperature_2m_min: [null] })
      ).dailyForecasts
      expect(day.temperature_2m_max).toBeNull()
      expect(day.temperature_2m_min).toBeNull()
    })
  })

  describe('record validation', () => {
    it('drops records with an invalid or missing date and counts them', () => {
      const result = parseForecast(
        dailyWith(
          {
            time: ['2026-03-10', 'garbage', null, '2026-02-30'],
            temperature_2m_max: [1, 2, 3, 4],
          },
          4
        )
      )
      expect(result.dailyForecasts.map((day) => day.time)).toEqual([
        '2026-03-10',
      ])
      expect(result.omittedRecords).toBe(3)
    })

    it('drops days that have no usable measurement', () => {
      const result = parseForecast({
        daily: {
          time: ['2026-03-10', '2026-03-11'],
          temperature_2m_max: [null, 5],
          weathercode: [NaN, null],
        },
      })
      expect(result.dailyForecasts.map((day) => day.time)).toEqual([
        '2026-03-11',
      ])
      expect(result.omittedRecords).toBe(1)
    })

    it('orders days chronologically, removes duplicates and renumbers indexes', () => {
      const result = parseForecast({
        daily: {
          time: ['2026-03-12', '2026-03-10', '2026-03-12', '2026-03-11'],
          temperature_2m_max: [12, 10, 99, 11],
        },
      })
      expect(
        result.dailyForecasts.map(({ index, time, temperature_2m_max }) => [
          index,
          time,
          temperature_2m_max,
        ])
      ).toEqual([
        [0, '2026-03-10', 10],
        [1, '2026-03-11', 11],
        [2, '2026-03-12', 12],
      ])
    })

    it.each([
      undefined,
      null,
      'text',
      42,
      [],
      {},
      { daily: null },
      { daily: [] },
      { daily: { time: [] } },
      { daily: { time: ['bad'], temperature_2m_max: [1] } },
      { daily: { time: ['2026-03-10'] } },
      { daily: { time: ['2026-03-10'], temperature_2m_max: [null] } },
    ])(
      'throws IncompleteForecastError when no usable day remains: %j',
      (input) => {
        expect(() => parseForecast(input)).toThrow(IncompleteForecastError)
      }
    )
  })

  describe('hourly data', () => {
    const { daily } = buildOpenMeteoResponse(1, 0)

    it('is empty when missing or malformed', () => {
      const empty = { time: [], temperature_2m: [] }
      expect(parseForecast({ daily }).hourly).toEqual(empty)
      expect(parseForecast({ daily, hourly: null }).hourly).toEqual(empty)
      expect(
        parseForecast({ daily, hourly: { time: ['2026-03-10T00:00'] } }).hourly
      ).toEqual(empty)
    })

    it('keeps only valid points, aligned with their timestamps', () => {
      const { hourly } = parseForecast({
        daily,
        hourly: {
          time: [
            '2026-03-10T03:00',
            '2026-03-10T01:00',
            'bad',
            '2026-03-10T02:00',
            '2026-03-10T04:00',
            '2026-03-10T01:00',
          ],
          temperature_2m: [53, 51, 99, NaN, 54, 77],
        },
      })
      expect(hourly).toEqual({
        time: ['2026-03-10T01:00', '2026-03-10T03:00', '2026-03-10T04:00'],
        temperature_2m: [51, 53, 54],
      })
    })

    it('does not discard the daily forecast when every hourly point is invalid', () => {
      const result = parseForecast({
        daily,
        hourly: { time: ['x'], temperature_2m: [null] },
      })
      expect(result.dailyForecasts).toHaveLength(1)
      expect(result.hourly.time).toEqual([])
    })
  })
})

describe('isValidTimestamp', () => {
  it.each([
    '2026-03-10',
    '2026-03-10T06:30',
    '2026-03-10T06:30:15',
    '2024-02-29',
  ])('accepts %s', (value) => expect(isValidTimestamp(value)).toBe(true))

  it.each([
    '',
    'x',
    '2026-3-10',
    '2026-02-30',
    '2025-02-29',
    '2026-03-10T24:00',
    '2026-03-10T06:60',
    '2026-03-10T06:30Z',
    20260310,
    null,
    undefined,
  ])('rejects %j', (value) => expect(isValidTimestamp(value)).toBe(false))
})

describe('mergeForecasts', () => {
  const forecast = (startIndex: number, days: number) =>
    parseForecast(buildOpenMeteoResponse(days, startIndex))

  it('prepends earlier days in order and re-indexes them', () => {
    const merged = mergeForecasts(forecast(2, 2), forecast(0, 2))
    expect(merged.dailyForecasts.map((d) => [d.index, d.time])).toEqual([
      [0, '2026-03-10'],
      [1, '2026-03-11'],
      [2, '2026-03-12'],
      [3, '2026-03-13'],
    ])
    expect(merged.hourly.time).toHaveLength(merged.hourly.temperature_2m.length)
    expect(merged.hourly.time).toEqual([...merged.hourly.time].sort())
  })

  it('keeps the existing record when a date appears in both', () => {
    const existing = forecast(0, 1)
    const additional = parseForecast({
      daily: { time: ['2026-03-10'], temperature_2m_max: [999] },
    })
    const merged = mergeForecasts(existing, additional)
    expect(merged.dailyForecasts).toHaveLength(1)
    expect(merged.dailyForecasts[0].temperature_2m_max).toBe(60)
  })
})
