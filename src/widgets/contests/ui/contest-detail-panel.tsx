'use client'

import { Cancel01Icon, Clock01Icon, Coins01Icon, Login02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { toast } from 'sonner'

import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'

import type { Contest, League, RosterRequirement } from '../model/contest.type'

const POSITION_FULL_NAME: Record<string, string> = {
    P: 'Pitcher',
    C: 'Catcher',
    '1B': 'First base',
    '2B': 'Second base',
    '3B': 'Third base',
    SS: 'Shortstop',
    OF: 'Outfield',
    LF: 'Left field',
    CF: 'Center field',
    RF: 'Right field',
    DH: 'Designated hitter',
    UTIL: 'Utility',
    IF: 'Infield',
}

const parseRosterSlot = (raw: string) => {
    const match = raw.match(/^(.+?)\s*\((.+)\)\s*$/)
    const abbr = match ? match[1].trim() : raw
    const multiplier = match ? match[2].trim() : null
    const fullName = POSITION_FULL_NAME[abbr] ?? abbr
    return { abbr, multiplier, fullName }
}

interface ContestDetailPanelProps {
    contest: Contest
    league: League | undefined
    onClose: () => void
}

export const ContestDetailPanel = ({ contest, league, onClose }: ContestDetailPanelProps) => {
    const handleJoin = () => {
        toast.success(`Joined ${contest.name}`)
    }

    return (
        <aside className="fixed inset-0 z-30 flex h-full flex-col bg-background lg:static lg:z-auto lg:w-80 lg:shrink-0 lg:border-l lg:border-foreground/10">
            <div className="flex items-start justify-between gap-2 p-4">
                <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">
                        {league?.name ?? contest.leagueSlug.toUpperCase()} · {contest.format}
                    </div>
                    <div className="mt-0.5 font-medium">{contest.name}</div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={onClose}>
                    <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
                <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/40 p-4">
                <div className="text-xs text-muted-foreground">Prize pool</div>
                <div className="font-anton text-4xl text-primary">
                    {contest.prizeCredits.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">credits</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoStat label="Entry fee" value={`${contest.entryFeeCredits} cr`} />
                <InfoStat
                    label="Capacity"
                    value={`${contest.currentEntries}/${contest.maxEntries}`}
                />
                <InfoStat label="Format" value={contest.format} />
                <InfoStat
                    label="Locks in"
                    value={contest.lockAtLabel}
                    icon={<HugeiconsIcon icon={Clock01Icon} className="size-3.5" />}
                />
            </div>

            <Separator />

            <RosterSlots roster={contest.roster} />

            <Separator />

            <Section title="Scoring">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    {contest.scoring.map((rule) => (
                        <div key={rule.action} className="flex justify-between">
                            <span className="text-muted-foreground">{rule.action}</span>
                            <span
                                className={
                                    rule.points >= 0
                                        ? 'font-medium text-foreground'
                                        : 'font-medium text-muted-foreground'
                                }
                            >
                                {rule.points > 0 ? `+${rule.points}` : rule.points}
                            </span>
                        </div>
                    ))}
                </div>
            </Section>

            </div>

            <div className="border-t border-foreground/10 p-4">
                <Button onClick={handleJoin} size="lg" className="w-full gap-2">
                    <HugeiconsIcon icon={Login02Icon} className="size-4" />
                    Join contest
                    {contest.entryFeeCredits > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs opacity-90">
                            · <HugeiconsIcon icon={Coins01Icon} className="size-3" />
                            {contest.entryFeeCredits}
                        </span>
                    )}
                </Button>
            </div>
        </aside>
    )
}

const InfoStat = ({
    label,
    value,
    icon,
}: {
    label: string
    value: string
    icon?: React.ReactNode
}) => (
    <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="flex items-center gap-1 font-medium">
            {icon}
            {value}
        </span>
    </div>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {title}
        </div>
        {children}
    </div>
)

const RosterSlots = ({ roster }: { roster: RosterRequirement[] }) => {
    const totalSlots = roster.reduce((sum, slot) => sum + slot.count, 0)

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
                <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Roster
                </div>
                <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{totalSlots}</span> slots to fill
                </div>
            </div>

            <ul className="flex flex-col gap-1.5">
                {roster.map((slot) => {
                    const { abbr, multiplier, fullName } = parseRosterSlot(slot.position)
                    return (
                        <li
                            key={slot.position}
                            className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-muted/30 p-2"
                        >
                            <div className="flex h-9 min-w-11 items-center justify-center rounded-md bg-primary/15 px-2 text-xs font-bold tracking-wide text-primary">
                                {abbr}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 text-sm font-medium">
                                    {fullName}
                                    {multiplier && (
                                        <span className="rounded-full border border-primary/30 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
                                            {multiplier}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {slot.count > 1 ? `${slot.count} players` : '1 player'}
                                </div>
                            </div>
                            <div className="font-anton text-lg leading-none tracking-wide text-primary">
                                ×{slot.count}
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
