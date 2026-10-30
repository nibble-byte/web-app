const DAYS = 3
const HOURS = 24

const range = (length: number, value: (index: number) => number | string) =>
  Array.from({ length }, (_, index) => value(index))

const day = (index: number) => `2026-03-${String(10 + index).padStart(2, '0')}`

export const buildOpenMeteoResponse = (days = DAYS, startIndex = 0) => ({
  daily: {
    time: range(days, (i) => day(startIndex + i)),
    temperature_2m_max: range(days, (i) => 60 + startIndex + i),
    temperature_2m_min: range(days, (i) => 40 + i),
    weathercode: range(days, () => 1),
    precipitation_sum: range(days, () => 0),
    windspeed_10m_max: range(days, () => 10),
    sunrise: range(days, (i) => `${day(startIndex + i)}T06:30`),
    sunset: range(days, (i) => `${day(startIndex + i)}T18:30`),
    precipitation_probability_max: range(days, () => 20),
  },
  hourly: {
    time: range(days * HOURS, (i) => `${day(startIndex)}T${i}`),
    temperature_2m: range(days * HOURS, (i) => 50 + (i % HOURS)),
  },
})

export const zippopotamResponse = (
  latitude = '47.6',
  longitude = '-122.3'
) => ({
  'post code': '98101',
  country: 'United States',
  'country abbreviation': 'US',
  places: [
    {
      'place name': 'Seattle',
      longitude,
      state: 'Washington',
      'state abbreviation': 'WA',
      latitude,
    },
  ],
})
