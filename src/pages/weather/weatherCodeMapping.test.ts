import { weatherCodeMapping } from './weatherCodeMapping'

describe('weatherCodeMapping', () => {
  it('describes common WMO weather codes', () => {
    expect(weatherCodeMapping[0]).toBe('Clear sky')
    expect(weatherCodeMapping[3]).toBe('Overcast')
    expect(weatherCodeMapping[63]).toBe('Moderate rain')
  })

  it('has no entry for unknown codes', () => {
    expect(weatherCodeMapping[999]).toBeUndefined()
  })
})
