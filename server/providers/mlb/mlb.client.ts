import { env } from '../../lib/env'
import {
    ProviderError,
    ProviderNotFoundError,
    ProviderUnavailableError,
} from '../sports-provider.error'

export interface MlbFetchOptions {
    revalidate: number
    tags?: string[]
}

export async function mlbFetch<T>(path: string, opts: MlbFetchOptions): Promise<T> {
    const url = `${env.mlbBaseUrl()}${path}`

    let res: Response
    try {
        res = await fetch(url, {
            headers: { accept: 'application/json' },
            next: { revalidate: opts.revalidate, tags: opts.tags },
        })
    } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'network error'
        throw new ProviderUnavailableError(`MLB ${path}: ${message}`)
    }

    if (res.status === 404) {
        throw new ProviderNotFoundError(`MLB ${path}: not found`)
    }

    if (!res.ok) {
        throw new ProviderError(`MLB ${path}: HTTP ${res.status}`, 502)
    }

    try {
        return (await res.json()) as T
    } catch {
        throw new ProviderError(`MLB ${path}: invalid JSON response`, 502)
    }
}
