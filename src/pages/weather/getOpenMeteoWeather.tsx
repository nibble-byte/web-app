import { IncompleteForecastError } from './parseForecast'

interface LocationKey {
  latitude: number
  longitude: number
}

/**
 * Returns a new Date that is offset (in days) from the base date,
 * with the time set to the specified hours, minutes, seconds, and milliseconds.
 *
 * @param base - The base Date.
 * @param offset - Number of days to add (or subtract if negative).
 * @param hours - The desired hour (0–23 or 23 to simulate the end-of-day).
 * @param minutes - The desired minute.
 * @param seconds - The desired seconds.
 * @param ms - The desired milliseconds.
 * @returns A new Date with the offset and custom time.
 */
const getNormalizedDate = (
  base: Date,
  offset: number,
  hours: number,
  minutes: number = 0,
  seconds: number = 0,
  ms: number = 0
): Date => {
  const result = new Date(base)
  result.setUTCDate(result.getDate() + offset)
  result.setUTCHours(hours, minutes, seconds, ms)

  return result
}

const dailyParams = [
  'temperature_2m_max',
  'temperature_2m_min',
  'weathercode',
  'precipitation_sum',
  'windspeed_10m_max',
  'sunrise',
  'sunset',
  'shortwave_radiation_sum',
  'precipitation_probability_max',
].join(',')

const hourlyParams = [
  'temperature_2m',
  'relativehumidity_2m',
  'dewpoint_2m',
  'precipitation',
  'snowfall',
  'windspeed_10m',
  'winddirection_10m',
  'cloudcover',
  'surface_pressure',
  'shortwave_radiation',
  'visibility',
  'windgusts_10m',
].join(',')

export type WeatherSource = 'historical' | 'forecast'

export interface WeatherIssue {
  source: WeatherSource
  kind: 'request-failed' | 'missing-daily' | 'missing-hourly'
  message: string
}

// Column-oriented Open-Meteo section; every array is aligned with `time`.
export type WeatherTable = Record<string, unknown[]>

export interface MergedWeather {
  daily: WeatherTable
  hourly: WeatherTable
  issues: WeatherIssue[]
}

// Thrown when no source could be fetched and nothing usable is available.
export class WeatherRequestError extends Error {
  readonly issues: WeatherIssue[]

  constructor(issues: WeatherIssue[]) {
    super([...new Set(issues.map((issue) => issue.message))].join('; '))
    this.name = 'WeatherRequestError'
    this.issues = issues
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const fetchSource = async (
  source: WeatherSource,
  url: string
): Promise<unknown> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Error fetching ${source} weather data: ${response.status} ${response.statusText}`
    )
  }
  try {
    return await response.json()
  } catch {
    throw new Error(`Received invalid ${source} weather data.`)
  }
}

const readTable = (
  payload: unknown,
  section: 'daily' | 'hourly'
): WeatherTable | null => {
  if (!isRecord(payload)) return null
  const table = payload[section]
  if (
    !isRecord(table) ||
    !Array.isArray(table.time) ||
    table.time.length === 0
  ) {
    return null
  }
  return Object.fromEntries(
    Object.entries(table).filter(([, values]) => Array.isArray(values))
  ) as WeatherTable
}

type Row = Record<string, unknown>

// Groups values by their timestamp string; null, undefined and ragged entries are simply absent.
const toRows = (table: WeatherTable | null): Map<string, Row> => {
  const rows = new Map<string, Row>()
  if (!table) return rows
  table.time.forEach((time, index) => {
    if (typeof time !== 'string' || time === '') return
    const row = rows.get(time) ?? {}
    for (const [field, values] of Object.entries(table)) {
      const value = values[index]
      if (field !== 'time' && value != null && row[field] == null) {
        row[field] = value
      }
    }
    rows.set(time, row)
  })
  return rows
}

// Date (YYYY-MM-DD) at the requested location, from the API's own UTC offset when it provides one.
const locationToday = (forecast: unknown): string => {
  const offset = isRecord(forecast) ? forecast.utc_offset_seconds : undefined
  if (typeof offset === 'number' && Number.isFinite(offset)) {
    return new Date(Date.now() + offset * 1000).toISOString().slice(0, 10)
  }
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// Merges by timestamp. Timestamps are location-local strings, so they are compared as text and never converted through Date.
export const mergeTables = (
  historical: WeatherTable | null,
  forecast: WeatherTable | null,
  today: string
): WeatherTable => {
  const historicalRows = toRows(historical)
  const forecastRows = toRows(forecast)
  const times = [
    ...new Set([...historicalRows.keys(), ...forecastRows.keys()]),
  ].sort()
  const fields = [
    ...new Set(
      [historical, forecast].flatMap((table) =>
        table ? Object.keys(table) : []
      )
    ),
  ].filter((field) => field !== 'time')

  const merged: WeatherTable = { time: times }
  for (const field of fields) {
    merged[field] = times.map((time) => {
      const preferred =
        time.slice(0, 10) >= today
          ? [forecastRows, historicalRows]
          : [historicalRows, forecastRows]
      for (const rows of preferred) {
        const value = rows.get(time)?.[field]
        if (value != null) return value
      }
      return null
    })
  }
  return merged
}

const describeIssues = (
  source: WeatherSource,
  payload: unknown
): WeatherIssue[] => {
  const issues: WeatherIssue[] = []
  if (!readTable(payload, 'daily')) {
    issues.push({
      source,
      kind: 'missing-daily',
      message: `The ${source} weather data has no daily values.`,
    })
  }
  if (!readTable(payload, 'hourly')) {
    issues.push({
      source,
      kind: 'missing-hourly',
      message: `The ${source} weather data has no hourly values.`,
    })
  }
  return issues
}

// Fetches only the archive for an explicit date range (YYYY-MM-DD, location-local), used to extend the timeline into the past.
export const getOpenMeteoHistory = async ({
  latitude,
  longitude,
  startDate,
  endDate,
}: LocationKey & { startDate: string; endDate: string }): Promise<{
  daily: WeatherTable | null
  hourly: WeatherTable | null
}> => {
  const url =
    'https://archive-api.open-meteo.com/v1/archive?' +
    new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      daily: dailyParams,
      hourly: hourlyParams,
      temperature_unit: 'fahrenheit',
      timezone: 'auto',
      start_date: startDate,
      end_date: endDate,
    })
  const payload = await fetchSource('historical', url)
  return {
    daily: readTable(payload, 'daily'),
    hourly: readTable(payload, 'hourly'),
  }
}

const getOpenMeteoWeather = async ({
  latitude,
  longitude,
}: LocationKey): Promise<MergedWeather> => {
  // Helper: formats a Date object to 'YYYY-MM-DD'.
  const formatDate = (date: Date) => date.toISOString().split('T')[0]

  const today = new Date()

  // Historical: from 10 days before today to yesterday.
  const pastStartDate = getNormalizedDate(today, -10, 0) // 10 days ago at 00:00
  const pastEndDate = getNormalizedDate(today, -1, 0) // Yesterday at 23:59:59.999
  // Forecast: from today to 15 days after today.
  const futureStartDate = getNormalizedDate(today, -1, 0) // Today at 00:00
  const futureEndDate = getNormalizedDate(today, 15, 0) // 15 days after today at 23:59:59.999

  // Construct URLs for the two endpoints.
  const historicalUrl =
    'https://archive-api.open-meteo.com/v1/archive?' +
    new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      daily: dailyParams,
      hourly: hourlyParams,
      temperature_unit: 'fahrenheit',
      timezone: 'auto',
      start_date: formatDate(pastStartDate),
      end_date: formatDate(pastEndDate),
    })

  const forecastUrl =
    'https://api.open-meteo.com/v1/forecast?' +
    new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      daily: dailyParams,
      hourly: hourlyParams,
      temperature_unit: 'fahrenheit',
      timezone: 'auto',
      start_date: formatDate(futureStartDate),
      end_date: formatDate(futureEndDate),
    })

  const [historicalResult, forecastResult] = await Promise.allSettled([
    fetchSource('historical', historicalUrl),
    fetchSource('forecast', forecastUrl),
  ])

  const issues: WeatherIssue[] = []
  const payloads: Record<WeatherSource, unknown> = {
    historical: undefined,
    forecast: undefined,
  }
  const results = {
    historical: historicalResult,
    forecast: forecastResult,
  } as const
  for (const source of ['historical', 'forecast'] as const) {
    const result = results[source]
    if (result.status === 'rejected') {
      const reason: unknown = result.reason
      issues.push({
        source,
        kind: 'request-failed',
        message:
          reason instanceof Error
            ? reason.message
            : `Error fetching ${source} weather data.`,
      })
    } else {
      payloads[source] = result.value
      issues.push(...describeIssues(source, result.value))
    }
  }

  const tables = (section: 'daily' | 'hourly') => ({
    historical: readTable(payloads.historical, section),
    forecast: readTable(payloads.forecast, section),
  })
  const daily = tables('daily')
  const hourly = tables('hourly')
  const hasUsableData = [daily, hourly].some(
    (pair) => pair.historical || pair.forecast
  )

  if (!hasUsableData) {
    const failures = issues.filter((issue) => issue.kind === 'request-failed')
    if (failures.length > 0) throw new WeatherRequestError(failures)
    throw new IncompleteForecastError()
  }

  const locationDate = locationToday(payloads.forecast ?? payloads.historical)
  return {
    daily: mergeTables(daily.historical, daily.forecast, locationDate),
    hourly: mergeTables(hourly.historical, hourly.forecast, locationDate),
    issues,
  }
}

export default getOpenMeteoWeather
