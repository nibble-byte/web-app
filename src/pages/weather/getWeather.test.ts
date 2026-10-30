import getWeather from './getWeather'
import { jsonResponse, mockFetch } from '../../test/mocks/network'

const location = { latitude: 47.6, longitude: -122.3 }
const grid = { properties: { gridId: 'SEW', gridX: 124, gridY: 67 } }
const forecast = { properties: { periods: [{ name: 'Today' }] } }

describe('getWeather', () => {
  it('resolves the grid point and returns its forecast', async () => {
    const fetchMock = mockFetch([
      { match: '/points/', handler: () => jsonResponse(grid) },
      { match: '/gridpoints/', handler: () => jsonResponse(forecast) },
    ])

    await expect(getWeather(location)).resolves.toEqual(forecast)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.weather.gov/points/47.6,-122.3'
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.weather.gov/gridpoints/SEW/124,67/forecast'
    )
  })

  it('returns null when the grid lookup fails', async () => {
    mockFetch([
      { match: '/points/', handler: () => new Response('', { status: 500 }) },
    ])
    await expect(getWeather(location)).resolves.toBeNull()
  })

  it('returns null when the forecast request fails', async () => {
    mockFetch([
      { match: '/points/', handler: () => jsonResponse(grid) },
      {
        match: '/gridpoints/',
        handler: () => new Response('', { status: 503 }),
      },
    ])
    await expect(getWeather(location)).resolves.toBeNull()
  })

  it('returns null when the response is malformed', async () => {
    mockFetch([{ match: '/points/', handler: () => jsonResponse({}) }])
    await expect(getWeather(location)).resolves.toBeNull()
  })

  it('returns null on a network failure', async () => {
    mockFetch([])
    await expect(getWeather(location)).resolves.toBeNull()
  })
})
