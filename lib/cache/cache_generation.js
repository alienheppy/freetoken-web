import { getCache } from '@vercel/functions'

const GENERATION_KEY = 'freetoken:cache-generation'
const GENERATION_TTL_SECOND = 365 * 24 * 60 * 60
const LOCAL_GENERATION_TTL_MS = 1000

const runtimeCache = getCache({ namespace: 'freetoken' })

let localGeneration = null
let localGenerationExpiresAt = 0
let pendingGenerationRead = null

/**
 * Generation keys are only needed where multiple serverless instances can
 * share a cache. Keep local development on the existing cache keys unless it
 * is explicitly enabled for a verification run.
 */
export function isCacheGenerationEnabled() {
  return (
    process.env.CACHE_GENERATION_ENABLED === 'true' ||
    process.env.VERCEL === '1' ||
    process.env.VERCEL_ENV === 'production'
  )
}

function normalizeGeneration(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  return '0'
}

async function readRemoteGeneration() {
  try {
    return normalizeGeneration(await runtimeCache.get(GENERATION_KEY))
  } catch (error) {
    console.warn(
      '[CacheGeneration] read failed, using local generation:',
      error?.message || error
    )
    return '0'
  }
}

/**
 * Read the shared cache generation. A short process-local cache avoids one
 * Runtime Cache request per data-cache lookup while still letting other
 * instances observe a manual refresh quickly.
 */
export async function getCacheGeneration({ force = false } = {}) {
  if (
    !force &&
    localGeneration &&
    Date.now() < localGenerationExpiresAt
  ) {
    return localGeneration
  }

  if (pendingGenerationRead) {
    return pendingGenerationRead
  }

  pendingGenerationRead = readRemoteGeneration()
    .then(generation => {
      localGeneration = generation
      localGenerationExpiresAt = Date.now() + LOCAL_GENERATION_TTL_MS
      return generation
    })
    .finally(() => {
      pendingGenerationRead = null
    })

  return pendingGenerationRead
}

/**
 * Rotate the shared generation. Cache keys are prefixed with this value, so
 * old entries become unreachable without deleting them individually.
 */
export async function bumpCacheGeneration(reason = 'manual') {
  const previous = await getCacheGeneration({ force: true })
  const current = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`

  await runtimeCache.set(GENERATION_KEY, current, {
    ttl: GENERATION_TTL_SECOND,
    tags: ['freetoken-cache-generation'],
    name: 'freetoken-cache-generation'
  })

  localGeneration = current
  localGenerationExpiresAt = Date.now() + LOCAL_GENERATION_TTL_MS

  console.log(
    `[CacheGeneration] rotated reason:${reason} previous:${previous} current:${current}`
  )

  return { previous, current, reason }
}

export async function readCacheGenerationForDiagnostics() {
  return getCacheGeneration({ force: true })
}

export function resetCacheGenerationForTests() {
  localGeneration = null
  localGenerationExpiresAt = 0
  pendingGenerationRead = null
}
