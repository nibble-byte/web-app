import { PageEnum } from './mapped-enums'
import { PAGE_ROUTES, getPageFromPath } from './routes'

describe('PAGE_ROUTES', () => {
  it('maps every page to its path', () => {
    expect(PAGE_ROUTES).toEqual({
      [PageEnum.Weather]: '/weather',
      [PageEnum.Othello]: '/othello',
      [PageEnum.Fractal]: '/fractal',
    })
  })
})

describe('getPageFromPath', () => {
  it.each(Object.values(PageEnum))('round-trips %s', (page) => {
    expect(getPageFromPath(PAGE_ROUTES[page])).toBe(page)
  })

  it.each(['/', '/unknown', '/weather/extra', '/Weather', ''])(
    'falls back to Weather for %j',
    (path) => {
      expect(getPageFromPath(path)).toBe(PageEnum.Weather)
    }
  )
})
