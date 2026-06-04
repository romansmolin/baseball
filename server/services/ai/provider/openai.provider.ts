// OpenAI Responses API client. Native fetch only; no SDKs, no retries.
// Retries are a route-handler concern — when the model returns an error or a
// malformed structured response, we throw AIProviderError and let the caller
// decide whether to refund credits + retry.
//
// Output parsing is tolerant: the Responses API normally fills `output_text`,
// but some response shapes nest the text under `output[].content[].text`. We
// accept either to avoid breaking on documented variation.

import { z } from 'zod'

import { AIProviderError } from '../errors'
import type { AIModelTier } from '../config'
import { getApiKey, getApiUrl, getModelForTier } from '../config'
import { aiLog, aiLogError } from '../logger'
import type { TokenUsage } from '../types'

import type {
    OpenAIRequestBody,
    OpenAIResponseBody,
    ParsedOpenAIResponse,
} from './types'

export interface CompleteOptions<T> {
    tier: AIModelTier
    instructions: string
    input: string
    // Zod schema for structured output. Used to (a) generate the JSON schema
    // we send to OpenAI for output enforcement and (b) validate the parsed
    // response before returning to the caller.
    outputSchema: z.ZodSchema<T>
    schemaName: string
    // Cap output tokens so a runaway model can't drain the wallet on a single
    // call. Features can override; default leaves it unset (provider chooses).
    maxOutputTokens?: number
}

export interface CompleteResult<T> {
    output: T
    tokenUsage: TokenUsage
    modelUsed: string
}

export interface IOpenAIProvider {
    complete<T>(opts: CompleteOptions<T>): Promise<CompleteResult<T>>
}

export class OpenAIProvider implements IOpenAIProvider {
    async complete<T>(opts: CompleteOptions<T>): Promise<CompleteResult<T>> {
        const model = getModelForTier(opts.tier)
        const url = getApiUrl()
        const body: OpenAIRequestBody = {
            model,
            instructions: opts.instructions,
            input: opts.input,
            text: {
                format: {
                    type: 'json_schema',
                    name: opts.schemaName,
                    schema: zodToJsonSchema(opts.outputSchema),
                    // strict: false on purpose — see provider/types.ts header.
                    strict: false,
                },
            },
            ...(opts.maxOutputTokens !== undefined && {
                max_output_tokens: opts.maxOutputTokens,
            }),
        }

        const serializedBody = JSON.stringify(body)
        aiLog('provider.request.start', {
            url,
            model,
            tier: opts.tier,
            schemaName: opts.schemaName,
            instructionsLen: opts.instructions.length,
            inputLen: opts.input.length,
            bodyBytes: serializedBody.length,
            maxOutputTokens: opts.maxOutputTokens,
        })

        const reqStart = Date.now()
        let response: Response
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${getApiKey()}`,
                    'Content-Type': 'application/json',
                },
                body: serializedBody,
            })
        } catch (cause) {
            aiLogError('provider.request.network_error', cause, {
                url,
                model,
                elapsedMs: Date.now() - reqStart,
            })
            throw new AIProviderError('Network error reaching OpenAI', {
                upstreamBody:
                    cause instanceof Error ? cause.message : 'unknown fetch error',
            })
        }

        aiLog('provider.request.responded', {
            url,
            model,
            status: response.status,
            elapsedMs: Date.now() - reqStart,
        })

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '')
            // Pull `error.message` out of the standard OpenAI error envelope
            // when we can — surfacing that in the toast is the difference
            // between "OpenAI returned 400" and "Unknown parameter: 'text'".
            const summary = extractOpenAIErrorSummary(errorBody)
            aiLog('provider.upstream_error', {
                status: response.status,
                model,
                summary: summary || errorBody.slice(0, 200),
            })
            throw new AIProviderError(
                `OpenAI returned ${response.status}${summary ? ` — ${summary}` : ''}`,
                { upstreamStatus: response.status, upstreamBody: errorBody },
            )
        }

        const parsed = await this.parseResponse(response)
        aiLog('provider.response.parsed', {
            model: parsed.modelUsed || model,
            rawTextLen: parsed.rawText.length,
            tokenUsage: parsed.tokenUsage,
        })
        const decoded = this.decodeStructuredOutput(parsed.rawText, opts.outputSchema)
        aiLog('provider.response.decoded_ok', {
            model: parsed.modelUsed || model,
            schemaName: opts.schemaName,
        })
        return {
            output: decoded,
            tokenUsage: parsed.tokenUsage,
            modelUsed: parsed.modelUsed || model,
        }
    }

    private async parseResponse(response: Response): Promise<ParsedOpenAIResponse> {
        let body: OpenAIResponseBody
        try {
            body = (await response.json()) as OpenAIResponseBody
        } catch (cause) {
            aiLogError('provider.parse.envelope_not_json', cause)
            throw new AIProviderError('OpenAI response was not JSON', {
                upstreamBody:
                    cause instanceof Error ? cause.message : 'parse error',
            })
        }

        const rawText = this.extractText(body)
        if (rawText === null) {
            aiLog('provider.parse.no_output_text', {
                hasOutputArray: Array.isArray(body.output),
                outputItems: body.output?.length ?? 0,
            })
            throw new AIProviderError('OpenAI response had no output text', {
                upstreamBody: JSON.stringify(body).slice(0, 500),
            })
        }

        return {
            rawText,
            tokenUsage: {
                inputTokens: body.usage?.input_tokens ?? 0,
                outputTokens: body.usage?.output_tokens ?? 0,
            },
            modelUsed: body.model ?? '',
        }
    }

    private extractText(body: OpenAIResponseBody): string | null {
        if (typeof body.output_text === 'string' && body.output_text.length > 0) {
            return body.output_text
        }
        for (const item of body.output ?? []) {
            for (const piece of item.content ?? []) {
                if (typeof piece.text === 'string' && piece.text.length > 0) {
                    return piece.text
                }
            }
        }
        return null
    }

    private decodeStructuredOutput<T>(
        rawText: string,
        schema: z.ZodSchema<T>,
    ): T {
        let parsed: unknown
        try {
            parsed = JSON.parse(rawText)
        } catch {
            aiLog('provider.decode.not_json', { rawTextLen: rawText.length })
            throw new AIProviderError('Model output was not valid JSON', {
                upstreamBody: rawText.slice(0, 500),
            })
        }
        const result = schema.safeParse(parsed)
        if (!result.success) {
            const issues = result.error.issues
                .slice(0, 5)
                .map((i) => `${i.path.join('.')}: ${i.message}`)
                .join('; ')
            aiLog('provider.decode.schema_failed', { issues })
            throw new AIProviderError(
                `Model output failed schema validation: ${issues}`,
                { upstreamBody: rawText.slice(0, 500) },
            )
        }
        return result.data
    }
}

// OpenAI errors come back as { error: { message, type, code, param } } —
// pull `message` (and `param` when present) for the toast. Falls back to a
// truncated raw body if the shape doesn't match.
function extractOpenAIErrorSummary(rawBody: string): string {
    if (!rawBody) return ''
    try {
        const parsed = JSON.parse(rawBody) as {
            error?: { message?: string; param?: string }
        }
        const message = parsed.error?.message
        if (!message) return rawBody.slice(0, 200)
        const param = parsed.error?.param
        return param ? `${message} (param: ${param})` : message
    } catch {
        return rawBody.slice(0, 200)
    }
}

// Minimal zod → JSON Schema converter. The Responses API only needs a small
// subset (object/array/string/number/boolean/enum/nullable + required). We
// hand-roll this instead of pulling in zod-to-json-schema as a dependency to
// keep the install footprint small — features that need shapes we don't
// support yet will throw at config time, not at runtime.
function zodToJsonSchema(schema: z.ZodSchema): Record<string, unknown> {
    // zod 4's def shape; we read it via 'any' to avoid coupling to internals
    // that change between minor versions.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def = (schema as any)._def
    if (!def) return { type: 'object' }
    return convert(def)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convert(def: any): Record<string, unknown> {
    const typeName: string = def.typeName ?? def.type ?? ''
    switch (typeName) {
        case 'ZodString':
        case 'string':
            return { type: 'string' }
        case 'ZodNumber':
        case 'number':
            return { type: 'number' }
        case 'ZodBoolean':
        case 'boolean':
            return { type: 'boolean' }
        case 'ZodLiteral':
        case 'literal':
            return { const: def.value }
        case 'ZodEnum':
        case 'enum':
            return { type: 'string', enum: def.values ?? Object.values(def.entries ?? {}) }
        case 'ZodNullable':
        case 'nullable':
            return { anyOf: [convert(def.innerType?._def ?? def.innerType), { type: 'null' }] }
        case 'ZodOptional':
        case 'optional':
            return convert(def.innerType?._def ?? def.innerType)
        case 'ZodArray':
        case 'array': {
            const inner = def.type ?? def.element
            return {
                type: 'array',
                items: convert(inner?._def ?? inner),
            }
        }
        case 'ZodObject':
        case 'object': {
            const shape =
                typeof def.shape === 'function' ? def.shape() : (def.shape ?? {})
            const properties: Record<string, unknown> = {}
            const required: string[] = []
            for (const [key, value] of Object.entries(shape)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const valueDef = (value as any)._def ?? value
                properties[key] = convert(valueDef)
                const innerType =
                    valueDef.typeName ?? valueDef.type ?? ''
                if (
                    innerType !== 'ZodOptional' &&
                    innerType !== 'optional'
                ) {
                    required.push(key)
                }
            }
            return {
                type: 'object',
                properties,
                required,
                additionalProperties: false,
            }
        }
        default:
            return { type: 'object' }
    }
}
