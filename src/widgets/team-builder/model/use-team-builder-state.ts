'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'

import { useMyTeamsData, updateTeamLineup } from '@/entities/my-teams'
import {
    createTeam,
    fetchPlayersByTeam,
    useBudgetData,
    useBuilderTeamsData,
    useLeaguesData,
    usePlayersByTeamData,
} from '@/entities/team-builder'
import { useBuyCredits } from '@/features/buy-credits'
import { autofillTeamBuilder } from '@/features/team-builder-autofill'
import { ApiError } from '@/shared/api/api-error'
import type { SupportedBaseballLeague } from '@/shared/baseball'
import {
    CAPTAIN_MULTIPLIER,
    FIELD_SLOTS,
    ROSTER_SIZE,
    SALARY_CAP_DEFAULT,
    type BuilderBudget,
    type BuilderLeague,
    type BuilderRosterSlotPayload,
    type BuilderTeam,
    type CreateTeamPayload,
    type FieldSlot,
    type PoolPlayer,
    type PoolPosition,
    type PoolPositionFilter,
    type Roster,
    type SlotKey,
    type UpdateLineupPayload,
} from '@/shared/team-builder'
import type { Team, TeamRosterSlot } from '@/shared/teams'

import {
    evaluatePlayerPlacement,
    mergeAutofillPicks,
    type PlayerPlacement,
} from './team-builder-roster'

const emptyRoster = (): Roster =>
    FIELD_SLOTS.reduce<Roster>((acc, slot) => {
        acc[slot.key] = null
        return acc
    }, {} as Roster)

export interface TeamBuilderState {
    slots: FieldSlot[]
    leagues: BuilderLeague[]
    teams: BuilderTeam[]
    // Teams belonging to the selected league — the candidate set for Autofill.
    autofillTeams: BuilderTeam[]
    selectedLeagueName: string | null
    canAutofill: boolean
    pool: PoolPlayer[]
    visiblePool: PoolPlayer[]
    roster: Roster
    captainId: number | null
    teamName: string
    poolSearch: string
    poolPosition: PoolPositionFilter
    selectedLeagueSlug: string | null
    selectedTeamId: number | null
    targetSlotKey: SlotKey | null
    rosteredIds: number[]
    salaryUsed: number
    salaryLeft: number
    projTotal: number
    filledCount: number
    salaryCap: number
    budget: BuilderBudget | undefined
    rosterSize: number
    isOverCap: boolean
    canSave: boolean
    isSaving: boolean
    isAutofilling: boolean
    isEditMode: boolean
    existingTeamLoading: boolean
    existingTeamMissing: boolean
    leaguesLoading: boolean
    teamsLoading: boolean
    playersLoading: boolean
    budgetLoading: boolean
    leaguesError: Error | undefined
    teamsError: Error | undefined
    playersError: Error | undefined
    budgetError: Error | undefined
    existingTeamError: Error | undefined
    addPlayer: (id: number) => void
    removeSlot: (slotKey: SlotKey) => void
    toggleCaptain: (id: number) => void
    clearLineup: () => void
    autofill: (mlbTeamIds: number[]) => Promise<void>
    saveLineup: () => Promise<void>
    setTeamName: (name: string) => void
    setPoolSearch: (q: string) => void
    setPoolPosition: (pos: PoolPositionFilter) => void
    setSelectedLeagueSlug: (slug: string | null) => void
    setSelectedTeamId: (id: number | null) => void
    focusSlot: (slotKey: SlotKey) => void
    playerById: (id: number) => PoolPlayer | undefined
    placementFor: (player: PoolPlayer) => PlayerPlacement
    retryLeagues: () => void
    retryTeams: () => void
    retryPlayers: () => void
    retryBudget: () => void
}

export interface UseTeamBuilderStateInput {
    existingTeamId?: string
}

interface ApiErrorBody {
    error?: { code?: string; message?: string }
}

const readApiCode = (error: unknown): string | undefined => {
    if (!(error instanceof ApiError)) return undefined
    const body = error.data as ApiErrorBody | undefined
    return body?.error?.code ?? error.code
}

const readApiMessage = (error: unknown): string | undefined => {
    if (!(error instanceof ApiError)) return undefined
    const body = error.data as ApiErrorBody | undefined
    return body?.error?.message ?? error.message
}

const SLOT_KEYS: SlotKey[] = FIELD_SLOTS.map((s) => s.key)
const isSlotKey = (value: string): value is SlotKey =>
    (SLOT_KEYS as string[]).includes(value)

const POOL_POSITIONS: PoolPosition[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF']
const isPoolPosition = (value: string): value is PoolPosition =>
    (POOL_POSITIONS as string[]).includes(value)

// Reconstruct a minimal PoolPlayer from a stored roster slot so the
// builder's player cache can render the existing lineup without waiting
// for the player catalog fetch.
const poolPlayerFromRosterSlot = (slot: TeamRosterSlot): PoolPlayer | null => {
    if (!isPoolPosition(slot.playerPosition)) return null
    return {
        id: slot.externalPlayerId,
        name: slot.playerName,
        pos: slot.playerPosition,
        team: slot.playerTeamName,
        leagueSlug: '',
        leagueColor: '#3b82f6',
        salary: slot.salaryAtLock,
        proj: 0,
        photoUrl: slot.playerPhotoUrl,
    }
}

export const useTeamBuilderState = (
    input: UseTeamBuilderStateInput = {},
): TeamBuilderState => {
    const { existingTeamId } = input
    const isEditMode = existingTeamId != null

    const router = useRouter()
    const { mutate: globalMutate } = useSWRConfig()

    const leaguesQuery = useLeaguesData()
    const budgetQuery = useBudgetData()
    const myTeamsQuery = useMyTeamsData()

    const [selectedLeagueSlug, setSelectedLeagueSlug] = useState<string | null>(null)
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
    const [roster, setRoster] = useState<Roster>(emptyRoster)
    const [captainId, setCaptainId] = useState<number | null>(null)
    const [teamName, setTeamName] = useState('Untitled lineup')
    const [poolSearch, setPoolSearch] = useState('')
    const [poolPosition, setPoolPosition] = useState<PoolPositionFilter>('all')
    const [isSaving, setIsSaving] = useState(false)
    const [isAutofilling, setIsAutofilling] = useState(false)
    const [targetSlotKey, setTargetSlotKey] = useState<SlotKey | null>(null)
    const prefilledTeamIdRef = useRef<string | null>(null)

    const { open: openBuyCredits } = useBuyCredits()

    const existingTeam: Team | undefined = useMemo(() => {
        if (!isEditMode) return undefined
        return myTeamsQuery.data?.teams.find((t) => t.id === existingTeamId)
    }, [isEditMode, existingTeamId, myTeamsQuery.data?.teams])

    const existingTeamLoading = isEditMode && myTeamsQuery.isLoading
    const existingTeamMissing =
        isEditMode &&
        !myTeamsQuery.isLoading &&
        !myTeamsQuery.error &&
        existingTeam == null

    // Teams and the player pool are both scoped to the selected league — the
    // API serves the right sport level, so no client-side league filtering.
    const teamsQuery = useBuilderTeamsData(selectedLeagueSlug)

    const playersQuery = usePlayersByTeamData({
        leagueSlug: selectedLeagueSlug ?? '',
        teamId: selectedTeamId ?? undefined,
        search: poolSearch.trim() || undefined,
        position: poolPosition === 'all' ? undefined : poolPosition,
    })

    const [cachedPlayers, setCachedPlayers] = useState<Map<number, PoolPlayer>>(
        () => new Map(),
    )
    const playerCache = useMemo(() => {
        const next = new Map(cachedPlayers)
        for (const player of playersQuery.data ?? []) next.set(player.id, player)
        return next
    }, [cachedPlayers, playersQuery.data])

    // Edit mode: when an existing team is loaded, prefill team name,
    // selected league, roster slots, and captain id. We seed the player
    // cache with the stored roster data so the field renders immediately.
    useEffect(() => {
        if (!isEditMode || !existingTeam) return
        if (prefilledTeamIdRef.current === existingTeam.id) return
        prefilledTeamIdRef.current = existingTeam.id

        setTeamName(existingTeam.name)
        setSelectedLeagueSlug(existingTeam.leagueSlug)

        const nextRoster: Roster = FIELD_SLOTS.reduce<Roster>((acc, slot) => {
            acc[slot.key] = null
            return acc
        }, {} as Roster)
        let nextCaptain: number | null = null
        const restoredPlayers: PoolPlayer[] = []

        for (const slot of existingTeam.rosterSlots) {
            if (!isSlotKey(slot.slotPosition)) continue
            const player = poolPlayerFromRosterSlot(slot)
            if (!player) continue
            restoredPlayers.push(player)
            nextRoster[slot.slotPosition] = player.id
            if (slot.isCaptain) nextCaptain = player.id
        }

        setCachedPlayers((previous) => {
            const next = new Map(previous)
            for (const player of restoredPlayers) next.set(player.id, player)
            return next
        })
        setRoster(nextRoster)
        setCaptainId(nextCaptain)
    }, [isEditMode, existingTeam])

    const playerById = useCallback(
        (id: number) => playerCache.get(id),
        [playerCache],
    )

    const pool = useMemo(() => playersQuery.data ?? [], [playersQuery.data])
    const visiblePool = useMemo(
        () => [...pool].sort((a, b) => b.proj - a.proj),
        [pool],
    )

    const rosteredIds = useMemo(
        () => Object.values(roster).filter((v): v is number => v !== null),
        [roster],
    )

    const salaryUsed = useMemo(
        () => rosteredIds.reduce((sum, id) => sum + (playerById(id)?.salary ?? 0), 0),
        [rosteredIds, playerById],
    )

    const projTotal = useMemo(
        () =>
            rosteredIds.reduce((sum, id) => {
                const p = playerById(id)
                if (!p) return sum
                const mult = id === captainId ? CAPTAIN_MULTIPLIER : 1
                return sum + p.proj * mult
            }, 0),
        [rosteredIds, captainId, playerById],
    )

    const salaryCap = budgetQuery.data?.salaryCap ?? SALARY_CAP_DEFAULT
    const filledCount = rosteredIds.length
    const isOverCap = salaryUsed > salaryCap

    const placementFor = useCallback(
        (player: PoolPlayer): PlayerPlacement =>
            evaluatePlayerPlacement({
                roster,
                player,
                targetSlotKey,
                salaryUsed,
                salaryCap,
                playerById,
            }),
        [roster, targetSlotKey, salaryUsed, salaryCap, playerById],
    )

    const addPlayer = useCallback(
        (id: number) => {
            const player = playerById(id)
            if (!player) return
            const placement = placementFor(player)
            if (!placement.allowed) {
                if (placement.reason === 'duplicate') return
                if (placement.reason === 'over-budget') {
                    toast('That puts you over the cap')
                    return
                }
                toast(`No open ${player.pos} slot`)
                return
            }
            setRoster((prev) => ({ ...prev, [placement.slot.key]: id }))
            if (
                placement.replacedPlayerId !== null &&
                placement.replacedPlayerId === captainId
            ) {
                setCaptainId(null)
            }
            setTargetSlotKey(null)
        },
        [placementFor, captainId, playerById],
    )

    const removeSlot = useCallback(
        (slotKey: SlotKey) => {
            setRoster((prev) => {
                const removedId = prev[slotKey]
                if (removedId !== null && removedId === captainId) setCaptainId(null)
                return { ...prev, [slotKey]: null }
            })
        },
        [captainId],
    )

    const toggleCaptain = useCallback((id: number) => {
        setCaptainId((prev) => {
            const next = prev === id ? null : id
            if (next !== null) {
                const player = playerCache.get(next)
                if (player) {
                    const lastName = player.name.split(' ').slice(-1)[0]
                    toast(`${lastName} is your captain (×1.5)`)
                }
            }
            return next
        })
    }, [playerCache])

    const clearLineup = useCallback(() => {
        setRoster(emptyRoster())
        setCaptainId(null)
        setTargetSlotKey(null)
    }, [])

    // Autofill is an AI call (POST /api/me/ai/team-builder-autofill). The
    // caller chooses the MLB team set via the Autofill modal; we forward
    // those ids plus whatever slots the user has already filled and ask
    // the model to fill the rest within the cap. The server-side feature
    // applies the same faux salary formula the pool fetcher uses, so the
    // AI sees the same prices the user sees.
    const autofill = useCallback(async (mlbTeamIds: number[]): Promise<void> => {
        if (!selectedLeagueSlug) {
            toast.error('Select a league before running Autofill.')
            return
        }
        if (mlbTeamIds.length === 0) {
            toast.error('Pick at least one team for Autofill.')
            return
        }
        if (isAutofilling) return

        const filledSlots: { slotKey: SlotKey; externalPlayerId: number }[] = []
        for (const key of SLOT_KEYS) {
            const id = roster[key]
            if (id != null) filledSlots.push({ slotKey: key, externalPlayerId: id })
        }

        setIsAutofilling(true)
        try {
            const response = await autofillTeamBuilder({
                league: selectedLeagueSlug as SupportedBaseballLeague,
                mlbTeamIds,
                salaryCap,
                filledSlots,
            })

            // Picks can come from any of the chosen teams, not just the one
            // currently shown in the player pool. Fetch each chosen team's
            // roster in parallel so we have full PoolPlayer metadata (name,
            // pos, salary, photo) to seed the cache — without this the
            // field would render blanks for picks from teams the user
            // hasn't loaded yet. Hydrate every selected team, including the
            // visible one: its current pool may be narrowed by search/position.
            const pickedIds = new Set(
                response.suggestedPicks.map((p) => p.externalPlayerId),
            )
            const teamsToHydrate = [...new Set(mlbTeamIds)]
            const hydratedRosters = await Promise.all(
                teamsToHydrate.map((teamId) =>
                    fetchPlayersByTeam({
                        leagueSlug: selectedLeagueSlug ?? '',
                        teamId,
                    }).catch(() => [] as PoolPlayer[]),
                ),
            )
            const poolById = new Map<number, PoolPlayer>()
            for (const p of playersQuery.data ?? []) poolById.set(p.id, p)
            for (const list of hydratedRosters) {
                for (const p of list) {
                    if (!poolById.has(p.id)) poolById.set(p.id, p)
                }
            }
            setCachedPlayers((previous) => {
                const next = new Map(previous)
                for (const player of poolById.values()) next.set(player.id, player)
                return next
            })

            // Surface a gentle warning if any pick is still unresolvable
            // (e.g. roster fetch failed for that team). Those specific picks
            // remain genuinely empty and editable; resolved picks still apply.
            const missing = [...pickedIds].filter((id) => !poolById.has(id))
            if (missing.length > 0) {
                toast(
                    `Couldn’t load player info for ${missing.length} pick(s). Those slots were left open.`,
                )
            }

            setRoster((prev) => {
                const merged = mergeAutofillPicks({
                    roster: prev,
                    picks: response.suggestedPicks,
                    playersById: poolById,
                })
                return merged.roster
            })
            setTargetSlotKey(null)

            const filled = mergeAutofillPicks({
                roster,
                picks: response.suggestedPicks,
                playersById: poolById,
            }).assignedPicks.length
            if (filled === 0) {
                toast('AI couldn’t fit any new picks under the cap')
            } else {
                toast.success(`AI filled ${filled} slot(s)`, {
                    description: response.strategy,
                })
            }
        } catch (error) {
            const code = readApiCode(error)
            const message = readApiMessage(error)
            if (code === 'INSUFFICIENT_CREDITS') {
                // Out of credits → surface the buy-credits modal so the user
                // can top up inline instead of just seeing an error.
                openBuyCredits({ featureName: 'Autofill' })
            } else if (code === 'AI_FEATURE_DISABLED') {
                toast.error('Autofill is currently disabled')
            } else if (code === 'AI_PROVIDER_ERROR') {
                toast.error('AI service is unavailable — try again in a moment')
            } else {
                toast.error(message ?? 'Autofill failed')
            }
        } finally {
            setIsAutofilling(false)
        }
    }, [
        isAutofilling,
        roster,
        salaryCap,
        playersQuery.data,
        selectedLeagueSlug,
        openBuyCredits,
    ])

    const focusSlot = useCallback((slotKey: SlotKey) => {
        const slot = FIELD_SLOTS.find((s) => s.key === slotKey)
        if (!slot) return
        setTargetSlotKey(slotKey)
        setPoolPosition(slot.accept)
        toast(
            roster[slotKey] == null
                ? `Pick a ${slotKey} from the pool`
                : `Pick a replacement for ${slotKey}`,
        )
    }, [roster])

    const canSave =
        filledCount === ROSTER_SIZE &&
        !isOverCap &&
        teamName.trim().length > 0 &&
        !!selectedLeagueSlug

    const handleLeagueChange = useCallback((slug: string | null) => {
        setSelectedLeagueSlug(slug)
        setSelectedTeamId(null)
        setPoolSearch('')
        setPoolPosition('all')
        setTargetSlotKey(null)
    }, [])

    const handleTeamChange = useCallback((id: number | null) => {
        setSelectedTeamId(id)
        setPoolSearch('')
        setPoolPosition('all')
    }, [])

    const saveLineup = useCallback(async () => {
        if (!canSave || !selectedLeagueSlug) return
        const playersPayload: BuilderRosterSlotPayload[] = []
        for (const slot of FIELD_SLOTS) {
            const id = roster[slot.key]
            if (id == null) continue
            const player = playerCache.get(id)
            if (!player) {
                toast('A player went missing — try re-adding them')
                return
            }
            playersPayload.push({
                externalPlayerId: player.id,
                slotKey: slot.key,
                position: player.pos,
                name: player.name,
                teamName: player.team,
                salaryAtLock: player.salary,
            })
        }

        try {
            setIsSaving(true)

            if (isEditMode && existingTeamId) {
                const lineupPayload: UpdateLineupPayload = {
                    players: playersPayload,
                    captainExternalPlayerId: captainId ?? undefined,
                }
                const result = await updateTeamLineup(existingTeamId, lineupPayload)
                toast.success(
                    `"${result.name}" lineup saved · ${projTotal.toFixed(1)} proj pts`,
                )
                await globalMutate(['me', 'teams'])
                router.push('/teams')
                return
            }

            const payload: CreateTeamPayload = {
                name: teamName.trim() || 'Untitled lineup',
                leagueSlug: selectedLeagueSlug,
                format: 'Daily',
                captainExternalPlayerId: captainId ?? undefined,
                players: playersPayload,
            }

            const result = await createTeam(payload)
            toast.success(`"${result.name}" saved · ${projTotal.toFixed(1)} proj pts`)
            await globalMutate(['me', 'teams'])
            router.push('/teams')
        } catch (error) {
            const code = readApiCode(error)
            const message = readApiMessage(error)
            if (code === 'BUDGET_EXCEEDED') {
                toast.error('Lineup is over the salary cap')
            } else if (code === 'INCOMPLETE_ROSTER') {
                toast.error('Fill every position before saving')
            } else if (code === 'VALIDATION_ERROR') {
                toast.error(message ?? 'Lineup is invalid')
            } else if (code === 'UNAUTHENTICATED') {
                toast.error('Please sign in to save a lineup')
            } else if (code === 'TEAM_NOT_FOUND') {
                toast.error('That team no longer exists')
            } else if (code === 'TEAM_NOT_OWNED') {
                toast.error('You don’t own that team')
            } else {
                toast.error(message ?? 'Couldn’t save lineup')
            }
        } finally {
            setIsSaving(false)
        }
    }, [
        canSave,
        selectedLeagueSlug,
        roster,
        teamName,
        captainId,
        projTotal,
        globalMutate,
        router,
        isEditMode,
        existingTeamId,
        playerCache,
    ])

    // Autofill is scoped to the league the user picked: the modal only offers
    // that league's teams, so the AI can only draw players from within it.
    const selectedLeagueName =
        (leaguesQuery.data ?? []).find((l) => l.slug === selectedLeagueSlug)?.name ?? null
    const autofillTeams = teamsQuery.data ?? []
    const canAutofill = !!selectedLeagueSlug

    return {
        slots: FIELD_SLOTS,
        leagues: leaguesQuery.data ?? [],
        teams: teamsQuery.data ?? [],
        autofillTeams,
        selectedLeagueName,
        canAutofill,
        pool,
        visiblePool,
        roster,
        captainId,
        teamName,
        poolSearch,
        poolPosition,
        selectedLeagueSlug,
        selectedTeamId,
        targetSlotKey,
        rosteredIds,
        salaryUsed,
        salaryLeft: salaryCap - salaryUsed,
        projTotal,
        filledCount,
        salaryCap,
        budget: budgetQuery.data,
        rosterSize: ROSTER_SIZE,
        isOverCap,
        canSave,
        isSaving,
        isAutofilling,
        isEditMode,
        existingTeamLoading,
        existingTeamMissing,
        leaguesLoading: leaguesQuery.isLoading,
        teamsLoading: teamsQuery.isLoading,
        playersLoading: playersQuery.isLoading,
        budgetLoading: budgetQuery.isLoading,
        leaguesError: leaguesQuery.error as Error | undefined,
        teamsError: teamsQuery.error as Error | undefined,
        playersError: playersQuery.error as Error | undefined,
        budgetError: budgetQuery.error as Error | undefined,
        existingTeamError: myTeamsQuery.error as Error | undefined,
        addPlayer,
        removeSlot,
        toggleCaptain,
        clearLineup,
        autofill,
        saveLineup,
        setTeamName,
        setPoolSearch,
        setPoolPosition,
        setSelectedLeagueSlug: handleLeagueChange,
        setSelectedTeamId: handleTeamChange,
        focusSlot,
        playerById,
        placementFor,
        retryLeagues: () => void leaguesQuery.mutate(),
        retryTeams: () => void teamsQuery.mutate(),
        retryPlayers: () => void playersQuery.mutate(),
        retryBudget: () => void budgetQuery.mutate(),
    }
}
