// Typed env reader for the AI subsystem. Reads OPENAI_API_KEY / URL / model
// tier vars at module load and validates with zod. Throws on missing API key
// (without it, no feature can run); the URL and model-tier vars have defaults
// matching the task contract so dev environments work without further setup.
//
// Single source of truth for model selection — feature code never reads
// process.env directly, it asks getModelForTier().

import { z } from 'zod'

export type AIModelTier = 'default' | 'complex_reasoning' | 'cheap'

const aiEnvSchema = z.object({
    OPENAI_API_KEY: z
        .string()
        .min(1, 'OPENAI_API_KEY is required to invoke AI features'),
    OPENAI_API_URL: z.string().url().default('https://api.openai.com/v1/responses'),
    OPENAI_API_MODEL_DEFAULT: z.string().min(1).default('gpt-5.3'),
    OPENAI_API_MODEL_COMPLEX_REASONING: z.string().min(1).default('gpt-5.4'),
    OPENAI_API_MODEL_CHEAP: z.string().min(1).default('gpt-5.2'),
})

type AIConfig = z.infer<typeof aiEnvSchema>

let cachedConfig: AIConfig | null = null

function readConfig(): AIConfig {
    if (cachedConfig) return cachedConfig
    const result = aiEnvSchema.safeParse({
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_API_URL: process.env.OPENAI_API_URL,
        OPENAI_API_MODEL_DEFAULT: process.env.OPENAI_API_MODEL_DEFAULT,
        OPENAI_API_MODEL_COMPLEX_REASONING:
            process.env.OPENAI_API_MODEL_COMPLEX_REASONING,
        OPENAI_API_MODEL_CHEAP: process.env.OPENAI_API_MODEL_CHEAP,
    })
    if (!result.success) {
        const msg = result.error.issues.map((i) => i.message).join('; ')
        throw new Error(`Invalid AI config: ${msg}`)
    }
    cachedConfig = result.data
    return cachedConfig
}

export function getApiKey(): string {
    return readConfig().OPENAI_API_KEY
}

export function getApiUrl(): string {
    return readConfig().OPENAI_API_URL
}

export function getModelForTier(tier: AIModelTier): string {
    const cfg = readConfig()
    switch (tier) {
        case 'default':
            return cfg.OPENAI_API_MODEL_DEFAULT
        case 'complex_reasoning':
            return cfg.OPENAI_API_MODEL_COMPLEX_REASONING
        case 'cheap':
            return cfg.OPENAI_API_MODEL_CHEAP
    }
}

// Test-only escape hatch — never call from feature code.
export function __resetConfigCacheForTests(): void {
    cachedConfig = null
}
