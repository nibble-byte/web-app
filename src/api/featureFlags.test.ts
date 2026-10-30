import { getFeatureFlags } from './featureFlags'
import { jsonResponse, mockFetch } from '../test/mocks/network'

describe('getFeatureFlags', () => {
  it('requests the Flagsmith flags endpoint with the environment key and returns the JSON', async () => {
    const flags = [{ feature: { name: 'beta' }, enabled: true }]
    const fetchMock = mockFetch([
      { match: 'edge.api.flagsmith.com', handler: () => jsonResponse(flags) },
    ])

    await expect(getFeatureFlags()).resolves.toEqual(flags)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe('https://edge.api.flagsmith.com/api/v1/flags/')
    expect(init.headers).toHaveProperty('X-Environment-Key')
  })

  it('rejects when the response body is not JSON', async () => {
    mockFetch([
      {
        match: 'edge.api.flagsmith.com',
        handler: () => new Response('not json', { status: 200 }),
      },
    ])
    await expect(getFeatureFlags()).rejects.toThrow()
  })
})
