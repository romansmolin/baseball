// Thin client for the Secure Processor hosted-checkout gateway. Reads its
// config from SECURE_PROCESSOR_* env vars (same shop as configured in .env).
// createCheckout() opens a hosted payment session and returns the redirect
// URL; queryCheckout() reconciles a session's final status on return. Webhook
// verification helpers (RSA-SHA256 signature + Basic auth) live here too so
// the secret material never leaves this module.

import crypto from 'crypto'

interface CheckoutRequest {
    amountCents: number
    currency: string
    description: string
    trackingId: string
    userId: string
    email: string
    birthDate?: string
}

interface CheckoutResponse {
    token: string
    redirectUrl: string
}

export interface RemoteCheckoutState {
    status: string | null
    uid: string | null
    amountCents: number | null
    currency: string | null
    rawPayload: unknown
}

const readRequired = (name: string): string => {
    const value = process.env[name]
    if (!value || value.trim().length === 0) {
        throw new Error(`Missing required env var: ${name}`)
    }
    return value
}

const formatPublicKey = (raw: string): string => {
    const normalized = raw
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\r?\n/g, '')
        .replace(/\\n/g, '')
        .trim()
    const wrapped = normalized.match(/.{1,64}/g)?.join('\n') ?? normalized
    return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`
}

class SecureProcessorClient {
    private readonly baseUrl: string
    private readonly shopId: string
    private readonly secretKey: string
    private readonly publicKey: string
    private readonly testMode: boolean
    private readonly appUrl: string

    constructor() {
        this.baseUrl = readRequired('SECURE_PROCESSOR_API_BASE_URL').replace(/\/$/, '')
        this.shopId = readRequired('SECURE_PROCESSOR_SHOP_ID')
        this.secretKey = readRequired('SECURE_PROCESSOR_SECRET_KEY')
        this.publicKey = formatPublicKey(readRequired('SECURE_PROCESSOR_PUBLIC_KEY'))
        this.testMode = process.env.SECURE_PROCESSOR_TEST_MODE === 'true'
        this.appUrl = readRequired('NEXT_PUBLIC_APP_URL').replace(/\/$/, '')
    }

    get authHeader(): string {
        return `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`
    }

    get publicKeyPem(): string {
        return this.publicKey
    }

    async createCheckout(data: CheckoutRequest): Promise<CheckoutResponse> {
        const body = {
            checkout: {
                version: 2.1,
                transaction_type: 'payment',
                test: this.testMode,
                payment_method: {
                    types: ['credit_card'],
                },
                settings: {
                    return_url: `${this.appUrl}/api/payments/return?token=${data.trackingId}`,
                    notification_url: `${this.appUrl}/api/payments/webhook`,
                    language: 'en',
                },
                order: {
                    amount: data.amountCents,
                    currency: data.currency,
                    description: data.description,
                    tracking_id: data.trackingId,
                },
                customer: {
                    external_id: data.userId,
                    email: data.email,
                    ...(data.birthDate ? { birth_date: data.birthDate } : {}),
                },
                metadata: {
                    payment_token_id: data.trackingId,
                    user_id: data.userId,
                },
            },
        }

        const tokenPath = process.env.SECURE_PROCESSOR_CHECKOUT_TOKEN_PATH ?? '/ctp/api/checkouts'

        const res = await fetch(`${this.baseUrl}${tokenPath}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-API-Version': '2',
                Authorization: this.authHeader,
            },
            body: JSON.stringify(body),
        })

        if (!res.ok) {
            const errorText = await res.text()

            throw new Error(`Secure Processor checkout failed: ${res.status} ${errorText}`)
        }

        const json = await res.json()

        return {
            token: json.checkout.token,
            redirectUrl: json.checkout.redirect_url,
        }
    }

    async queryCheckout(gatewayToken: string): Promise<RemoteCheckoutState> {
        const url = `${this.baseUrl}/ctp/api/checkouts/${encodeURIComponent(gatewayToken)}`
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: this.authHeader,
            },
        })

        if (!res.ok) {
            throw new Error(`Secure Processor reconciliation failed: ${res.status}`)
        }

        const json = await res.json().catch(() => ({}))
        const checkout = json?.checkout ?? json ?? {}
        const order = checkout.order ?? {}
        const gatewayResponse = checkout.gateway_response ?? {}
        const payment = gatewayResponse.payment ?? checkout.payment ?? {}

        return {
            status: payment.status ?? checkout.status ?? checkout.state ?? gatewayResponse.status ?? null,
            uid: payment.uid ?? checkout.uid ?? gatewayResponse.uid ?? null,
            amountCents:
                typeof order.amount === 'number'
                    ? order.amount
                    : typeof checkout.amount === 'number'
                      ? checkout.amount
                      : null,
            currency: order.currency ?? checkout.currency ?? null,
            rawPayload: json,
        }
    }
}

export const secureProcessorClient = new SecureProcessorClient()

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const trimmed = signature.trim()
    const signatureValue = trimmed.includes('=') ? trimmed.split('=').slice(-1)[0] : trimmed
    try {
        return crypto.verify(
            'RSA-SHA256',
            Buffer.from(rawBody),
            secureProcessorClient.publicKeyPem,
            Buffer.from(signatureValue, 'base64'),
        )
    } catch {
        return false
    }
}

export function verifyWebhookBasicAuth(authorization: string | null): boolean {
    if (!authorization?.startsWith('Basic ')) return false
    const provided = Buffer.from(authorization.slice('Basic '.length).trim())
    const expected = Buffer.from(secureProcessorClient.authHeader.slice('Basic '.length))
    if (provided.length !== expected.length) return false
    return crypto.timingSafeEqual(provided, expected)
}
