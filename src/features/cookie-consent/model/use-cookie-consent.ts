'use client'

import { useCallback, useSyncExternalStore } from 'react'

export type CookieConsent = 'accepted' | 'essential' | 'unknown' | 'pending'

const STORAGE_KEY = 'cookie-consent'
const listeners = new Set<() => void>()

function read(): CookieConsent {
    try {
        const value = window.localStorage.getItem(STORAGE_KEY)
        return value === 'accepted' || value === 'essential' ? value : 'unknown'
    } catch {
        return 'unknown'
    }
}

function subscribe(listener: () => void) {
    listeners.add(listener)
    window.addEventListener('storage', listener)
    return () => {
        listeners.delete(listener)
        window.removeEventListener('storage', listener)
    }
}

/** The visitor's cookie choice. "pending" until the browser has been asked, so nothing flashes on the server render. */
export function useCookieConsent() {
    const consent = useSyncExternalStore(subscribe, read, () => 'pending' as const)

    const choose = useCallback((choice: 'accepted' | 'essential') => {
        try {
            window.localStorage.setItem(STORAGE_KEY, choice)
        } catch {
            // Without storage the banner simply asks again on the next visit.
        }
        listeners.forEach((listener) => listener())
    }, [])

    return { consent, choose }
}
