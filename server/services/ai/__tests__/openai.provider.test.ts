import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { AIProviderError } from '../errors'
import { __resetConfigCacheForTests } from '../config'
import { OpenAIProvider } from '../provider/openai.provider'

const PROVIDER_URL = 'https://api.openai.com/v1/responses'

const okBody = (data: unknown) => ({
    output_text: JSON.stringify(data),
    usage: { input_tokens: 42, output_tokens: 100 },
    model: 'gpt-5.2',
})

const TEST_SCHEMA = z.object({
    answer: z.string(),
    score: z.number(),
})

describe('OpenAIProvider', () => {
    beforeEach(() => {
        process.env.OPENAI_API_KEY = 'sk-test-fixture'
        process.env.OPENAI_API_URL = PROVIDER_URL
        process.env.OPENAI_API_MODEL_DEFAULT = 'gpt-5.3'
        process.env.OPENAI_API_MODEL_COMPLEX_REASONING = 'gpt-5.4'
        process.env.OPENAI_API_MODEL_CHEAP = 'gpt-5.2'
        __resetConfigCacheForTests()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('constructs the request with model + json_schema and returns parsed output', async () => {
        const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
            new Response(JSON.stringify(okBody({ answer: 'hello', score: 0.5 })), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        )

        const provider = new OpenAIProvider()
        const result = await provider.complete({
            tier: 'cheap',
            instructions: 'do thing',
            input: 'context',
            outputSchema: TEST_SCHEMA,
            schemaName: 'TestOutput',
        })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe(PROVIDER_URL)
        const sentBody = JSON.parse((init as RequestInit).body as string)
        expect(sentBody.model).toBe('gpt-5.2')
        // Responses API: structured output lives under text.format, not response_format.
        expect(sentBody.text?.format?.type).toBe('json_schema')
        expect(sentBody.text?.format?.name).toBe('TestOutput')
        expect(sentBody.response_format).toBeUndefined()
        expect(sentBody.input).toBe('context')
        expect(sentBody.instructions).toBe('do thing')

        expect(result.output).toEqual({ answer: 'hello', score: 0.5 })
        expect(result.tokenUsage).toEqual({ inputTokens: 42, outputTokens: 100 })
        expect(result.modelUsed).toBe('gpt-5.2')
    })

    it('throws AIProviderError on non-2xx with status + body', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue(
            new Response('rate limited', { status: 429 }),
        )

        const provider = new OpenAIProvider()
        await expect(
            provider.complete({
                tier: 'default',
                instructions: 'x',
                input: 'y',
                outputSchema: TEST_SCHEMA,
                schemaName: 'TestOutput',
            }),
        ).rejects.toMatchObject({
            name: 'AIProviderError',
            upstreamStatus: 429,
            upstreamBody: 'rate limited',
        })
    })

    it('extracts the OpenAI error.message into the thrown error message', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue(
            new Response(
                JSON.stringify({
                    error: {
                        message: "Unknown parameter: 'response_format'",
                        type: 'invalid_request_error',
                        param: 'response_format',
                    },
                }),
                { status: 400 },
            ),
        )
        const provider = new OpenAIProvider()
        await expect(
            provider.complete({
                tier: 'default',
                instructions: 'x',
                input: 'y',
                outputSchema: TEST_SCHEMA,
                schemaName: 'TestOutput',
            }),
        ).rejects.toMatchObject({
            name: 'AIProviderError',
            message: expect.stringContaining("Unknown parameter: 'response_format'"),
            upstreamStatus: 400,
        })
    })

    it('throws AIProviderError on 5xx upstream', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue(
            new Response('boom', { status: 500 }),
        )

        const provider = new OpenAIProvider()
        await expect(
            provider.complete({
                tier: 'default',
                instructions: 'x',
                input: 'y',
                outputSchema: TEST_SCHEMA,
                schemaName: 'TestOutput',
            }),
        ).rejects.toBeInstanceOf(AIProviderError)
    })

    it('throws AIProviderError when output fails schema validation', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue(
            new Response(
                JSON.stringify(okBody({ answer: 'hello', score: 'not-a-number' })),
                { status: 200 },
            ),
        )

        const provider = new OpenAIProvider()
        await expect(
            provider.complete({
                tier: 'default',
                instructions: 'x',
                input: 'y',
                outputSchema: TEST_SCHEMA,
                schemaName: 'TestOutput',
            }),
        ).rejects.toMatchObject({
            name: 'AIProviderError',
            message: expect.stringContaining('schema validation'),
        })
    })

    it('throws AIProviderError when model returns non-JSON', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue(
            new Response(
                JSON.stringify({
                    output_text: 'not json at all',
                    usage: { input_tokens: 1, output_tokens: 1 },
                }),
                { status: 200 },
            ),
        )

        const provider = new OpenAIProvider()
        await expect(
            provider.complete({
                tier: 'default',
                instructions: 'x',
                input: 'y',
                outputSchema: TEST_SCHEMA,
                schemaName: 'TestOutput',
            }),
        ).rejects.toMatchObject({
            name: 'AIProviderError',
            message: expect.stringContaining('not valid JSON'),
        })
    })

    it('returns token usage zeroed when upstream omits it', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue(
            new Response(
                JSON.stringify({
                    output_text: JSON.stringify({ answer: 'a', score: 1 }),
                }),
                { status: 200 },
            ),
        )
        const result = await new OpenAIProvider().complete({
            tier: 'default',
            instructions: '',
            input: '',
            outputSchema: TEST_SCHEMA,
            schemaName: 'TestOutput',
        })
        expect(result.tokenUsage).toEqual({ inputTokens: 0, outputTokens: 0 })
    })
})
