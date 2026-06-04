// Internal shapes for the OpenAI Responses API request/response. Kept private
// to the provider — feature code never touches these. The Responses API is
// documented at https://platform.openai.com/docs/api-reference/responses .

import type { TokenUsage } from '../types'

// Responses API structured-output shape. NOTE: this lives under `text.format`,
// NOT under `response_format` (that's Chat Completions). `strict: false` is
// intentional — strict mode requires every property to appear in `required`
// and forbids `.optional()` zod fields, which we use for things like
// trade_advisor's counterProposal. We still rely on zod to validate the
// model's response on the way back out.
export interface OpenAITextFormat {
    type: 'json_schema'
    name: string
    schema: Record<string, unknown>
    strict?: boolean
}

export interface OpenAIRequestBody {
    model: string
    instructions?: string
    input: string
    text?: { format: OpenAITextFormat }
    max_output_tokens?: number
}

// Subset of the Responses-API response we depend on. The API has additional
// fields we ignore — tolerant decoding so a minor upstream change doesn't
// break parsing.
export interface OpenAIResponseBody {
    output: Array<{
        type?: string
        content?: Array<{
            type?: string
            text?: string
        }>
    }>
    output_text?: string
    usage?: {
        input_tokens?: number
        output_tokens?: number
    }
    model?: string
}

export interface ParsedOpenAIResponse {
    rawText: string
    tokenUsage: TokenUsage
    modelUsed: string
}
