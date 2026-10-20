/**
 * @jest-environment node
 */

import { shouldBootstrapNotionRuntimeRefresh } from '@/lib/cache/notion-runtime-refresh-bootstrap'

jest.mock('@/lib/cache/notion-runtime-refresh', () => ({
  refreshNotionSiteDataInBackground: jest.fn(),
  resolveRuntimeRefreshInterval: jest.fn(() => 1800)
}))

describe('Notion runtime refresh bootstrap guard', () => {
  const keys = [
    'NEXT_RUNTIME',
    'npm_lifecycle_event',
    'VERCEL',
    'VERCEL_ENV'
  ]
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]))

  afterEach(() => {
    keys.forEach(key => {
      if (original[key] === undefined) delete process.env[key]
      else process.env[key] = original[key]
    })
  })

  it('runs only in a local Node development process', () => {
    process.env.NEXT_RUNTIME = 'nodejs'
    delete process.env.npm_lifecycle_event
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
    expect(shouldBootstrapNotionRuntimeRefresh()).toBe(true)

    process.env.npm_lifecycle_event = 'build'
    expect(shouldBootstrapNotionRuntimeRefresh()).toBe(false)

    process.env.npm_lifecycle_event = 'export'
    expect(shouldBootstrapNotionRuntimeRefresh()).toBe(false)
  })

  it('does not start process timers on Vercel', () => {
    process.env.NEXT_RUNTIME = 'nodejs'
    delete process.env.npm_lifecycle_event
    process.env.VERCEL = '1'
    delete process.env.VERCEL_ENV
    expect(shouldBootstrapNotionRuntimeRefresh()).toBe(false)
  })
})
