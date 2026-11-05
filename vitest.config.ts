import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

// The app uses the `@/*` -> `src/*` path alias (see tsconfig.json). Vitest does
// not read tsconfig paths on its own, so mirror the single alias here.
export default defineConfig({
    // The calendar tests publish slates of one or two games; production publishes three or more.
    test: { env: { CONTEST_MIN_SLATE_GAMES: '1' } },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
})
