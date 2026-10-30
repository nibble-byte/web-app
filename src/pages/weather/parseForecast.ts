export interface DailyForecast {
  index: number
  time: string
  temperature_2m_max: number
  temperature_2m_min: number
  weathercode: number
  precipitation_probability_max: number
  windspeed_10m_max: number
  sunrise: string
  sunset: string
}

export interface HourlyForecast {
  time: string[]
  temperature_2m: number[]
}

export interface ParsedForecast {
  dailyForecasts: DailyForecast[]
  hourly: HourlyForecast
}

export const INCOMPLETE_FORECAST_MESSAGE =
  'The weather service returned incomplete forecast data. Please try again.'

export class IncompleteForecastError extends Error {
  constructor() {
    super(INCOMPLETE_FORECAST_MESSAGE)
    this.name = 'IncompleteForecastError'
  }
}

type Column = unknown[]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const column = (
  source: Record<string, unknown>,
  key: string,
  length: number
): Column => {
  const values = source[key]
  if (!Array.isArray(values) || values.length < length) {
    throw new IncompleteForecastError()
  }
  return values
}

const finite = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new IncompleteForecastError()
  }
  return value
}

const text = (value: unknown): string => {
  if (typeof value !== 'string' || value === '') {
    throw new IncompleteForecastError()
  }
  return value
}

const parseHourly = (hourly: unknown): HourlyForecast => {
  if (
    isRecord(hourly) &&
    Array.isArray(hourly.time) &&
    Array.isArray(hourly.temperature_2m) &&
    hourly.temperature_2m.length >= hourly.time.length
  ) {
    return {
      time: hourly.time.map(String),
      temperature_2m: hourly.temperature_2m as number[],
    }
  }
  // Hourly data only feeds the optional detail chart, so its absence must not hide the daily forecast.
  return { time: [], temperature_2m: [] }
}

// Validates the merged Open-Meteo payload at the boundary; throws IncompleteForecastError if daily data is unusable.
export const parseForecast = (data: unknown): ParsedForecast => {
  if (!isRecord(data) || !isRecord(data.daily)) {
    throw new IncompleteForecastError()
  }
  const daily = data.daily
  if (
    !Array.isArray(daily.time) ||
    daily.time.length === 0
  ) {
    throw new IncompleteForecastError()
  }

  const count = daily.time.length
  const maxTemps = column(daily, 'temperature_2m_max', count)
  const minTemps = column(daily, 'temperature_2m_min', count)
  const codes = column(daily, 'weathercode', count)
  const winds = column(daily, 'windspeed_10m_max', count)
  const sunrises = column(daily, 'sunrise', count)
  const sunsets = column(daily, 'sunset', count)
  const precipitation = Array.isArray(daily.precipitation_probability_max)
    ? daily.precipitation_probability_max
    : []

  const dailyForecasts = daily.time.map((time, index) => ({
    index,
    time: text(time),
    temperature_2m_max: finite(maxTemps[index]),
    temperature_2m_min: finite(minTemps[index]),
    weathercode: finite(codes[index]),
    precipitation_probability_max:
      typeof precipitation[index] === 'number' ? precipitation[index] : 0,
    windspeed_10m_max: finite(winds[index]),
    sunrise: text(sunrises[index]),
    sunset: text(sunsets[index]),
  }))

  return { dailyForecasts, hourly: parseHourly(data.hourly) }
}
