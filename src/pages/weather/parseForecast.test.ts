import { IncompleteForecastError, parseForecast } from './parseForecast'
import { buildOpenMeteoResponse } from '../../test/mocks/weatherFixtures'

describe('parseForecast', () => {
  it('maps valid data to one forecast per day', () => {
    const { dailyForecasts, hourly } = parseForecast(
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
  })

  it('defaults missing precipitation probability to 0', () => {
    const data = buildOpenMeteoResponse(1, 0)
    delete (data.daily as Record<string, unknown>).precipitation_probability_max
    expect(
      parseForecast(data).dailyForecasts[0].precipitation_probability_max
    ).toBe(0)
  })

  it('falls back to empty hourly data when it is missing or malformed', () => {
    const empty = { time: [], temperature_2m: [] }
    const { daily } = buildOpenMeteoResponse(1, 0)
    expect(parseForecast({ daily }).hourly).toEqual(empty)
    expect(parseForecast({ daily, hourly: { time: ['x'] } }).hourly).toEqual(
      empty
    )
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
  ])('rejects %j', (input) => {
    expect(() => parseForecast(input)).toThrow(IncompleteForecastError)
  })

  it('rejects non-numeric or non-finite values', () => {
    const data = buildOpenMeteoResponse(1, 0)
    ;(data.daily as Record<string, unknown>).weathercode = ['1']
    expect(() => parseForecast(data)).toThrow(IncompleteForecastError)
    ;(data.daily as Record<string, unknown>).weathercode = [NaN]
    expect(() => parseForecast(data)).toThrow(IncompleteForecastError)
  })
})
