'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { fetchUserReport, useUserActivityLookup } from '@/entities/admin'
import { ApiError } from '@/shared/api/api-error'

const errorMessage = (error: unknown) =>
    ApiError.isApiError(error) ? error.message : 'Something went wrong'

function downloadBase64(file: { contentType: string; base64: string }, name: string) {
    const link = document.createElement('a')
    link.href = `data:${file.contentType};base64,${file.base64}`
    link.download = name
    link.click()
}

export function useAdminUserLookup() {
    const [email, setEmail] = useState('')
    const [isGeneratingReport, setIsGeneratingReport] = useState(false)
    const { data: activity, trigger, isMutating, reset } = useUserActivityLookup()

    const search = async (event: FormEvent) => {
        event.preventDefault()
        reset()
        try {
            await trigger(email.trim())
        } catch (error) {
            toast.error(errorMessage(error))
        }
    }

    const downloadReport = async () => {
        if (!activity) return
        setIsGeneratingReport(true)
        try {
            const file = await fetchUserReport(activity.user.email)
            downloadBase64(file, `report-${activity.user.email}.pdf`)
            toast.success('Report generated')
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setIsGeneratingReport(false)
        }
    }

    return { email, setEmail, activity, isSearching: isMutating, isGeneratingReport, search, downloadReport }
}
