import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'

import { prisma } from '../../../../server/lib/prisma'
import { isAtLeastAge, MIN_AGE } from '@/shared/utils/age'
import { getEnv } from '@/shared/utils/get-env'

const appUrl = getEnv('BETTER_AUTH_URL')

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    databaseHooks: {
        user: {
            create: {
                async before(user) {
                    const { dateOfBirth } = user as { dateOfBirth?: string }
                    if (!dateOfBirth || !isAtLeastAge(dateOfBirth)) {
                        throw new APIError('BAD_REQUEST', {
                            message: `You must be at least ${MIN_AGE} years old to create an account`,
                        })
                    }
                },
                // async after(user) {
                //     await sendWelcomeEmail(user.email, user.name)
                // },
            },
        },
    },
    user: {
        additionalFields: {
            dateOfBirth: { type: 'string', required: true },
            countryOfResidence: { type: 'string', required: true },
        },
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
    },
    secret: getEnv('BETTER_AUTH_SECRET'),
    baseURL: appUrl,
    trustedOrigins: [appUrl],
    advanced: {
        cookiePrefix: 'baseball-fantasy',
        useSecureCookies: false,
    },
})

export type Session = typeof auth.$Infer.Session
