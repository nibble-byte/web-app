export type FetchHandler = (url: string) => Response | Promise<Response>

export interface FetchRoute {
  match: string | RegExp
  handler: FetchHandler
}

export const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

const FEATURE_FLAGS_URL = 'edge.api.flagsmith.com'

const requestUrl = (input: RequestInfo | URL) =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url

// Replaces global fetch so tests never hit the network; unmatched requests fail loudly.
export const mockFetch = (routes: FetchRoute[] = []) => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = requestUrl(input)
    const route = routes.find(({ match }) =>
      typeof match === 'string' ? url.includes(match) : match.test(url)
    )
    if (route) {
      return route.handler(url)
    }
    if (url.includes(FEATURE_FLAGS_URL)) {
      return jsonResponse([])
    }
    throw new Error(`Unmocked network request: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
