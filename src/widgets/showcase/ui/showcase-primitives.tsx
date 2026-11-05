'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils'
import type { DailyContestMode, DailyContestView } from '@/shared/daily-contests'
import type { ManagerPeriod } from '@/shared/community'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

export const number = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 1 })
export const date = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export const timestamp = (value: string) => new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
export function relativeTime(value: string, now: Date | null) {
    if (!now) return timestamp(value)
    const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(value)) / 60000))
    return minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`
}
export function ManagerAvatar({ name, image, className }: { name: string; image: string | null; className?: string }) {
    const [failedImage, setFailedImage] = useState<string | null>(null)
    return <span className={cn('inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-medium text-primary', className)}>
        {image && failedImage !== image ? <Image src={image} alt="" width={80} height={80} unoptimized className="size-full object-cover" onError={() => setFailedImage(image)} /> : name.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase()}
    </span>
}
export const ModePicker = ({ value, onChange }: { value: DailyContestMode; onChange: (mode: DailyContestMode) => void }) => <div className="flex flex-wrap gap-2" aria-label="Ranking source"><Button variant={value === 'LIVE' ? 'default' : 'outline'} aria-pressed={value === 'LIVE'} onClick={() => onChange('LIVE')}>Current games</Button><Button variant={value === 'REPLAY' ? 'default' : 'outline'} aria-pressed={value === 'REPLAY'} onClick={() => onChange('REPLAY')}>Historical results</Button></div>
export const ContestViewPicker = ({ value, onChange }: { value: DailyContestView; onChange: (view: DailyContestView) => void }) => <div className="flex flex-wrap gap-2" aria-label="Contest view"><Button variant={value === 'current' ? 'default' : 'outline'} aria-pressed={value === 'current'} onClick={() => onChange('current')}>Current games</Button><Button variant={value === 'history' ? 'default' : 'outline'} aria-pressed={value === 'history'} onClick={() => onChange('history')}>History</Button></div>
const PERIODS: { value: ManagerPeriod; label: string }[] = [{ value: 'day', label: 'Today' }, { value: 'week', label: 'This week' }, { value: 'season', label: 'This season' }]
export const PeriodPicker = ({ value, onChange }: { value: ManagerPeriod; onChange: (period: ManagerPeriod) => void }) => <Select items={PERIODS} value={value} onValueChange={next => onChange(next as ManagerPeriod)}><SelectTrigger size="sm" aria-label="Ranking period"><SelectValue /></SelectTrigger><SelectContent>{PERIODS.map(period => <SelectItem key={period.value} value={period.value}>{period.label}</SelectItem>)}</SelectContent></Select>
export const LoadState = ({ loading, error, empty, children }: { loading?: boolean; error?: unknown; empty?: boolean; children: React.ReactNode }) => loading ? <div className="space-y-3 py-5" role="status" aria-label="Loading"><div className="h-5 w-2/3 animate-pulse rounded bg-muted" /><div className="h-5 w-1/2 animate-pulse rounded bg-muted" /></div> : error ? <p role="alert" className="py-5 text-sm text-destructive">Unable to load this section. Please try again.</p> : empty ? <p className="py-5 text-sm text-muted-foreground">No results yet. Check back after the next contest.</p> : <>{children}</>
export function PageNavigation({ offset, total, onChange }: { offset: number; total: number; onChange: (offset: number) => void }) {
    return <div className="flex flex-wrap items-center justify-between gap-3 pt-4"><span className="text-xs text-muted-foreground">{total === 0 ? '0' : `${offset + 1}–${Math.min(offset + 20, total)}`} of {number(total)}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - 20))}>Previous</Button><Button variant="outline" size="sm" disabled={offset + 20 >= total} onClick={() => onChange(offset + 20)}>Next</Button></div></div>
}
export const ManagerLink = ({ userId, name }: { userId: string; name: string }) => <Link className="font-medium hover:text-primary" href={`/managers/${encodeURIComponent(userId)}`}>{name}</Link>
