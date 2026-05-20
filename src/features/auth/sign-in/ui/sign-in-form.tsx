'use client'

import { LoaderCircle, Login02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { Button } from '@/shared/ui/button'
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FieldDescription,
} from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

import { useSignInForm } from '../model/use-sign-in-form'

export const SignInForm = () => {
    const { onSubmit, form } = useSignInForm()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = form

    return (
        <form id="sign-in-form" onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="h-full">
            <FieldGroup className="h-full">
                <FieldSet>
                    <FieldLegend className="font-audiowide text-2xl!">Welcome Back 👋</FieldLegend>
                    <FieldDescription>
                        We happy to see you again, let&apos;s see what new day preapred for us.
                    </FieldDescription>

                    <FieldGroup>
                        <Field data-invalid={!!errors.email}>
                            <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
                            <Input
                                id="sign-in-email"
                                type="email"
                                placeholder="Enter your email"
                                {...register('email')}
                            />
                            <FieldError errors={[errors.email]} />
                        </Field>

                        <Field data-invalid={!!errors.password}>
                            <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
                            <Input
                                id="sign-in-password"
                                type="password"
                                placeholder="Enter your password"
                                {...register('password')}
                            />
                            <FieldError errors={[errors.password]} />
                        </Field>
                    </FieldGroup>
                </FieldSet>

                <FieldSet className="flex-1 flex-col gap-4 justify-end">
                    <Button type="submit" disabled={isSubmitting} size={'lg'}>
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <HugeiconsIcon icon={LoaderCircle} className="animate-spin" />
                                Signing in...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <HugeiconsIcon icon={Login02Icon} />
                                Sign in
                            </div>
                        )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                        Don&apos;t have an account?{' '}
                        <Link
                            href="/auth/sign-up"
                            className="text-primary underline underline-offset-4"
                        >
                            Sign up
                        </Link>
                    </p>
                </FieldSet>
            </FieldGroup>
        </form>
    )
}
