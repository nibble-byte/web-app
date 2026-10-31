export interface DailyForecast {
  index: number
  time: string
  temperature_2m_max: number | null
  temperature_2m_min: number | null
  weathercode: number | null
  precipitation_probability_max: number | null
  windspeed_10m_max: number | null
  sunrise: string | null
  sunset: string | null
}

// Parallel arrays holding only valid points, so `time[i]` always matches `temperature_2m[i]`.
export interface HourlyForecast {
  time: string[]
  temperature_2m: number[]
}

export interface ParsedForecast {
  dailyForecasts: DailyForecast[]
  hourly: HourlyForecast
  // Daily records dropped for having an invalid date or no usable measurement.
  omittedRecords: number
}

export const INCOMPLETE_FORECAST_MESSAGE =
  'The weather service returned incomplete forecast data. Please try again.'

export class IncompleteForecastError extends Error {
  constructor() {
    super(INCOMPLETE_FORECAST_MESSAGE)
    this.name = 'IncompleteForecastError'
  }
}

const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/

// Type guard: true for plain objects (not null, not arrays), so properties can be read safely from unknown data.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Checks that a value is a local ISO date or timestamp with real calendar and clock values.
// Accepts local ISO dates or timestamps ("2026-03-10", "2026-03-10T06:30") and rejects impossible values.
export const isValidTimestamp = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  const match = TIMESTAMP.exec(value)
  if (!match) return false
  const [year, month, day, hour = '0', minute = '0', second = '0'] =
    match.slice(1)
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day) &&
    Number(hour) < 24 &&
    Number(minute) < 60 &&
    Number(second) < 60
  )
}

// Returns the value if it is a finite number, otherwise null (rejects strings, NaN and Infinity).
const finiteOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

// Returns the value if it is a valid timestamp string, otherwise null.
const timestampOrNull = (value: unknown): string | null =>
  isValidTimestamp(value) ? value : null

// Reads a column (array) from an API section, or an empty array when it is missing or not an array.
const columnOf = (source: Record<string, unknown>, key: string): unknown[] => {
  const values = source[key]
  return Array.isArray(values) ? values : []
}

// Comparator that orders records chronologically by their ISO `time` string.
const byTime = <T extends { time: string }>(a: T, b: T) =>
  a.time < b.time ? -1 : a.time > b.time ? 1 : 0

// Removes records whose time repeats the previous one in a sorted list, keeping the first.
const withoutDuplicateTimes = <T extends { time: string }>(sorted: T[]): T[] =>
  sorted.filter((item, i) => i === 0 || item.time !== sorted[i - 1].time)

// Builds daily records from the API's column-oriented data, validating each day and measurement
// independently; returns the usable days (sorted, de-duplicated, indexed) and how many were dropped.
const parseDaily = (
  daily: unknown
): { forecasts: DailyForecast[]; omitted: number } => {
  if (!isRecord(daily) || !Array.isArray(daily.time)) {
    return { forecasts: [], omitted: 0 }
  }
  const maxTemps = columnOf(daily, 'temperature_2m_max')
  const minTemps = columnOf(daily, 'temperature_2m_min')
  const codes = columnOf(daily, 'weathercode')
  const rain = columnOf(daily, 'precipitation_probability_max')
  const winds = columnOf(daily, 'windspeed_10m_max')
  const sunrises = columnOf(daily, 'sunrise')
  const sunsets = columnOf(daily, 'sunset')

  const records: Omit<DailyForecast, 'index'>[] = []
  daily.time.forEach((time, i) => {
    if (!isValidTimestamp(time)) return
    const measurements = {
      temperature_2m_max: finiteOrNull(maxTemps[i]),
      temperature_2m_min: finiteOrNull(minTemps[i]),
      weathercode: finiteOrNull(codes[i]),
      precipitation_probability_max: finiteOrNull(rain[i]),
      windspeed_10m_max: finiteOrNull(winds[i]),
      sunrise: timestampOrNull(sunrises[i]),
      sunset: timestampOrNull(sunsets[i]),
    }
    if (Object.values(measurements).some((value) => value !== null)) {
      records.push({ time, ...measurements })
    }
  })

  const forecasts = withoutDuplicateTimes(records.sort(byTime)).map(
    (record, index) => ({ index, ...record })
  )
  return { forecasts, omitted: daily.time.length - forecasts.length }
}

// Builds the hourly series, keeping only points with a valid timestamp and finite temperature,
// sorted and de-duplicated so each time stays aligned with its temperature.
const parseHourly = (hourly: unknown): HourlyForecast => {
  const empty = { time: [], temperature_2m: [] }
  if (!isRecord(hourly) || !Array.isArray(hourly.time)) return empty
  const temperatures = columnOf(hourly, 'temperature_2m')

  const points: { time: string; temperature: number }[] = []
  hourly.time.forEach((time, i) => {
    const temperature = finiteOrNull(temperatures[i])
    if (isValidTimestamp(time) && temperature !== null) {
      points.push({ time, temperature })
    }
  })
  const sorted = withoutDuplicateTimes(points.sort(byTime))
  return {
    time: sorted.map((point) => point.time),
    temperature_2m: sorted.map((point) => point.temperature),
  }
}

// Validates the merged Open-Meteo payload record by record; throws IncompleteForecastError only when no usable day remains.
export const parseForecast = (data: unknown): ParsedForecast => {
  const source = isRecord(data) ? data : {}
  const { forecasts, omitted } = parseDaily(source.daily)
  if (forecasts.length === 0) {
    throw new IncompleteForecastError()
  }
  return {
    dailyForecasts: forecasts,
    hourly: parseHourly(source.hourly),
    omittedRecords: omitted,
  }
}
