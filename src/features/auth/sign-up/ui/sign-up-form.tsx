'use client'

import { LoaderCircle, Login02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

import { COUNTRIES } from '../model/countries.const'
import { useSignUpForm } from '../model/use-sign-up-form'

export const SignUpForm = () => {
    const { onSubmit, form, agreeToTerms, setAgreeToTerms, confirmAge, setConfirmAge } =
        useSignUpForm()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = form

    return (
        <form
            id="sign-up-form"
            onSubmit={handleSubmit(onSubmit)}
            autoComplete="off"
            className="h-full"
        >
            <FieldGroup className="h-full">
                <FieldSet>
                    <FieldLegend className="font-audiowide text-2xl!">
                        Welcome to BaseballFantasy ⚾️
                    </FieldLegend>

                    <FieldDescription>
                        Create your team, follow games, analyze player performance, and compete.
                    </FieldDescription>

                    <FieldGroup>
                        <Field data-invalid={!!errors.username}>
                            <FieldLabel htmlFor="sign-up-username">Username</FieldLabel>
                            <Input
                                id="sign-up-username"
                                placeholder="Enter your username"
                                {...register('username')}
                            />
                            <FieldError errors={[errors.username]} />
                        </Field>

                        <Field data-invalid={!!errors.email}>
                            <FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
                            <Input
                                id="sign-up-email"
                                type="email"
                                placeholder="Enter your email"
                                {...register('email')}
                            />
                            <FieldError errors={[errors.email]} />
                        </Field>

                        <Field data-invalid={!!errors.password}>
                            <FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
                            <Input
                                id="sign-up-password"
                                type="password"
                                placeholder="Enter your password"
                                {...register('password')}
                            />
                            <FieldError errors={[errors.password]} />
                        </Field>

                        <Field data-invalid={!!errors.confirmPassword}>
                            <FieldLabel htmlFor="sign-up-confirm-password">
                                Confirm Password
                            </FieldLabel>
                            <Input
                                id="sign-up-confirm-password"
                                type="password"
                                placeholder="Confirm your password"
                                {...register('confirmPassword')}
                            />
                            <FieldError errors={[errors.confirmPassword]} />
                        </Field>

                        <Field data-invalid={!!errors.dateOfBirth}>
                            <FieldLabel htmlFor="sign-up-date-of-birth">Date of birth</FieldLabel>
                            <Input
                                id="sign-up-date-of-birth"
                                type="date"
                                {...register('dateOfBirth')}
                            />
                            <FieldError errors={[errors.dateOfBirth]} />
                        </Field>

                        <Field data-invalid={!!errors.countryOfResidence}>
                            <FieldLabel htmlFor="sign-up-country">Country of residence</FieldLabel>
                            <select
                                id="sign-up-country"
                                defaultValue=""
                                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                {...register('countryOfResidence')}
                            >
                                <option value="" disabled>
                                    Select your country
                                </option>
                                {COUNTRIES.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            <FieldError errors={[errors.countryOfResidence]} />
                        </Field>
                    </FieldGroup>
                </FieldSet>

                <FieldSet className="flex-1 flex-col gap-4 justify-end">
                    {errors.root?.message && (
                        <Field data-invalid>
                            <FieldError errors={[errors.root]} />
                        </Field>
                    )}

                    <Field orientation="horizontal">
                        <Checkbox
                            id="sign-up-confirm-age"
                            checked={confirmAge}
                            onCheckedChange={(checked) => setConfirmAge(!!checked)}
                        />
                        <FieldLabel htmlFor="sign-up-confirm-age" className="font-normal">
                            I confirm that I am at least 18 years old, or have reached the minimum
                            legal age required in my jurisdiction.
                        </FieldLabel>
                    </Field>

                    <Field orientation="horizontal">
                        <Checkbox
                            id="sign-up-agree-to-terms"
                            checked={agreeToTerms}
                            onCheckedChange={(checked) => setAgreeToTerms(!!checked)}
                        />
                        <FieldLabel htmlFor="sign-up-agree-to-terms" className="font-normal">
                            I agree to the{' '}
                            <Link
                                href="/legal/terms"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary underline underline-offset-4"
                            >
                                Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link
                                href="/legal/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary underline underline-offset-4"
                            >
                                Privacy Policy
                            </Link>
                        </FieldLabel>
                    </Field>

                    <Button type="submit" disabled={isSubmitting || !agreeToTerms || !confirmAge} size={'lg'}>
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <HugeiconsIcon icon={LoaderCircle} className="animate-spin" />
                                Signing up...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <HugeiconsIcon icon={Login02Icon} />
                                Sign up
                            </div>
                        )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                        Already have an account?{' '}
                        <Link
                            href="/auth/sign-in"
                            className="text-primary underline underline-offset-4"
                        >
                            Sign in
                        </Link>
                    </p>
                </FieldSet>
            </FieldGroup>
        </form>
    )
}
