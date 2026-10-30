import { PageEnum } from './mapped-enums'

export const PAGE_ROUTES: Record<PageEnum, string> = {
  [PageEnum.Weather]: '/weather',
  [PageEnum.Othello]: '/othello',
  [PageEnum.Fractal]: '/fractal',
}

export const getPageFromPath = (pathname: string): PageEnum => {
  const route = Object.entries(PAGE_ROUTES).find(
    ([, path]) => path === pathname
  )

  return (route?.[0] as PageEnum | undefined) ?? PageEnum.Weather
}