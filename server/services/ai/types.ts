// Shared DTOs for the AI subsystem. Feature keys are an enum-as-const so the
// router, billing, and features all agree on identifiers without circular
// imports between feature modules.

import { z } from 'zod'

export const AI_FEATURE_KEYS = {
    LINEUP_OPTIMIZER: 'lineup_optimizer',
    PLAYER_ANALYSIS: 'player_analysis',
    TRADE_ADVISOR: 'trade_advisor',
    MATCHUP_PREDICTOR: 'matchup_predictor',
    TEAM_BUILDER_AUTOFILL: 'team_builder_autofill',
} as const

export type AIFeatureKey =
    (typeof AI_FEATURE_KEYS)[keyof typeof AI_FEATURE_KEYS]

export interface TokenUsage {
    inputTokens: number
    outputTokens: number
}

// Standard envelope every feature returns. `tokenUsage` is the raw count from
// the provider; the billing service charges `costCredits` regardless of
// tokens, but we store both for analytics.
export interface AIInvocationResult<T> {
    output: T
    tokenUsage: TokenUsage
    modelUsed: string
}

// Contract for a single feature: validate the input, fetch context, build
// the prompt, invoke the provider, validate the output. Implemented per
// feature in features/{key}.feature.ts.
export interface AIFeatureModule<TInput, TOutput> {
    readonly key: AIFeatureKey
    readonly inputSchema: z.ZodSchema<TInput>
    readonly outputSchema: z.ZodSchema<TOutput>
    invoke(userId: string, input: TInput): Promise<AIInvocationResult<TOutput>>
}
