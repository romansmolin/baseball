'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'

import { useMyTeamsData, updateTeamLineup } from '@/entities/my-teams'
import {
    useProjectionsData,
    type PlayerProjection,
    type ProjectionBasis,
    type ProjectionsResult,
} from '@/entities/projections'
import {
    createTeam,
    useBuilderTeamsData,
    useLeaguesData,
    usePlayersByTeamData,
} from '@/entities/team-builder'
import { useBuyCredits } from '@/features/buy-credits'
import {
    autofillTeamBuilder,
    type AutofillSuggestion,
    type AutofillUnfilledSlot,
} from '@/features/team-builder-autofill'
import { ApiError } from '@/shared/api/api-error'
import { getBaseballLeague, type SupportedBaseballLeague } from '@/shared/baseball'
import {
    CAPTAIN_MULTIPLIER,
    DEFAULT_SCORING_RULES,
    DEFAULT_SLOT_CONFIG,
    SUPPORTED_FORMATS,
    buildSlots,
    parseSlotId,
    type BuilderLeague,
    type BuilderRosterSlotPayload,
    type BuilderTeam,
    type CreateTeamPayload,
    type FantasyFormat,
    type FantasyPlatform,
    type ForecastPeriod,
    type LineupChanges,
    type PoolPlayer,
    type PoolPosition,
    type PoolPositionFilter,
    type Roster,
    type RosterSlotDef,
    type ScoringRules,
    type SlotConfig,
    type SlotKey,
    type UpdateLineupPayload,
} from '@/shared/team-builder'
import type { Team, TeamRosterSlot } from '@/shared/teams'

import {
    createEmptyRoster,
    evaluatePlayerPlacement,
    mergeAutofillPicks,
    remapRoster,
    type PlayerPlacement,
} from './team-builder-roster'

// The AI's proposal, shown for review before it touches the lineup.
export interface AutofillPreview {
    picks: AutofillSuggestion[]
    unfilled: AutofillUnfilledSlot[]
    explanation: string
    totalPoints: number
    basis: ProjectionBasis
}

export interface TeamBuilderState {
    format: FantasyFormat
    // False until the user picks a format on a new team (shows the format step).
    formatChosen: boolean
    forecastPeriod: ForecastPeriod
    lineupChanges: LineupChanges
    scoringRules: ScoringRules
    slotConfig: SlotConfig
    slots: RosterSlotDef[]
    // True while the lineup uses the classic 9 slots, so the diamond can be drawn.
    isDefaultLayout: boolean
    leagues: BuilderLeague[]
    teams: BuilderTeam[]
    // Teams belonging to the selected league — the candidate set for Autofill.
    autofillTeams: BuilderTeam[]
    selectedLeagueName: string | null
    canAutofill: boolean
    pool: PoolPlayer[]
    visiblePool: PoolPlayer[]
    roster: Roster
    // The roster as it would look if the AI proposal were accepted.
    previewRoster: Roster
    previewSlotIds: SlotKey[]
    autofillPreview: AutofillPreview | null
    captainId: number | null
    teamName: string
    platform: FantasyPlatform
    poolSearch: string
    poolPosition: PoolPositionFilter
    selectedLeagueSlug: string | null
    selectedTeamId: number | null
    targetSlotKey: SlotKey | null
    rosteredIds: number[]
    salaryUsed: number
    salaryLeft: number
    projTotal: number
    projectionBasis: ProjectionBasis | null
    filledCount: number
    // null when the format has no salary cap.
    salaryCap: number | null
    rosterSize: number
    isOverCap: boolean
    isComplete: boolean
    canSave: boolean
    isSaving: boolean
    isAutofilling: boolean
    isEditMode: boolean
    existingTeamLoading: boolean
    existingTeamMissing: boolean
    leaguesLoading: boolean
    teamsLoading: boolean
    playersLoading: boolean
    projectionsLoading: boolean
    leaguesError: Error | undefined
    teamsError: Error | undefined
    playersError: Error | undefined
    projectionsError: Error | undefined
    existingTeamError: Error | undefined
    addPlayer: (id: number) => void
    removeSlot: (slotKey: SlotKey) => void
    toggleCaptain: (id: number) => void
    clearLineup: () => void
    autofill: (mlbTeamIds: number[]) => Promise<void>
    acceptAutofill: () => void
    discardAutofill: () => void
    saveLineup: () => Promise<void>
    chooseFormat: (format: FantasyFormat) => void
    setForecastPeriod: (period: ForecastPeriod) => void
    setLineupChanges: (changes: LineupChanges) => void
    setScoringRules: (rules: ScoringRules) => void
    resetScoringRules: () => void
    setSlotConfig: (config: SlotConfig) => void
    setTeamName: (name: string) => void
    setPlatform: (platform: FantasyPlatform) => void
    setPoolSearch: (q: string) => void
    setPoolPosition: (pos: PoolPositionFilter) => void
    setSelectedLeagueSlug: (slug: string | null) => void
    setSelectedTeamId: (id: number | null) => void
    focusSlot: (slotKey: SlotKey) => void
    playerById: (id: number) => PoolPlayer | undefined
    projectionFor: (id: number) => PlayerProjection | undefined
    placementFor: (player: PoolPlayer) => PlayerPlacement
    retryLeagues: () => void
    retryTeams: () => void
    retryPlayers: () => void
    retryProjections: () => void
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
        proj: null,
        photoUrl: slot.playerPhotoUrl,
    }
}

const isDefaultSlotConfig = (config: SlotConfig) =>
    JSON.stringify(config) === JSON.stringify(DEFAULT_SLOT_CONFIG)

export const useTeamBuilderState = (
    input: UseTeamBuilderStateInput = {},
): TeamBuilderState => {
    const { existingTeamId } = input
    const isEditMode = existingTeamId != null

    const router = useRouter()
    const { mutate: globalMutate } = useSWRConfig()

    const leaguesQuery = useLeaguesData()
    const myTeamsQuery = useMyTeamsData()

    const [selectedLeagueSlug, setSelectedLeagueSlug] = useState<string | null>(null)
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
    const [format, setFormat] = useState<FantasyFormat>('H2H_POINTS')
    const [formatChosen, setFormatChosen] = useState(isEditMode)
    const [forecastPeriod, setForecastPeriodState] = useState<ForecastPeriod>('WEEK')
    const [lineupChanges, setLineupChanges] = useState<LineupChanges>('DAILY')
    const [scoringRules, setScoringRules] = useState<ScoringRules>(DEFAULT_SCORING_RULES)
    const [slotConfig, setSlotConfigState] = useState<SlotConfig>(DEFAULT_SLOT_CONFIG)
    const [salaryCap, setSalaryCap] = useState<number | null>(null)
    const slots = useMemo(() => buildSlots(slotConfig), [slotConfig])
    const [roster, setRoster] = useState<Roster>(() => createEmptyRoster(buildSlots(DEFAULT_SLOT_CONFIG)))
    const [captainId, setCaptainId] = useState<number | null>(null)
    const [teamName, setTeamName] = useState('Untitled lineup')
    const [platform, setPlatform] = useState<FantasyPlatform>('OTHER')
    const [poolSearch, setPoolSearch] = useState('')
    const [poolPosition, setPoolPosition] = useState<PoolPositionFilter>('all')
    const [isSaving, setIsSaving] = useState(false)
    const [isAutofilling, setIsAutofilling] = useState(false)
    const [autofillPreview, setAutofillPreview] = useState<AutofillPreview | null>(null)
    const [targetSlotKey, setTargetSlotKey] = useState<SlotKey | null>(null)
    const prefilledTeamIdRef = useRef<string | null>(null)
    // Bumped whenever an AI proposal stops being valid (rules, period, slots, league,
    // team or lineup cleared); a response that arrives for an older epoch is dropped.
    const autofillEpochRef = useRef(0)
    const invalidateAutofill = useCallback(() => {
        autofillEpochRef.current += 1
        setAutofillPreview(null)
    }, [])

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

    // Projections depend on the period and the scoring rules, so the cache is
    // tied to them and starts over when either changes.
    const settingsKey = `${forecastPeriod}|${JSON.stringify(scoringRules)}`
    const projectionsQuery = useProjectionsData(
        selectedLeagueSlug && selectedTeamId != null
            ? {
                  leagueSlug: selectedLeagueSlug,
                  teamIds: [selectedTeamId],
                  period: forecastPeriod,
                  rules: scoringRules,
              }
            : null,
    )
    const [projectionState, setProjectionState] = useState<{
        key: string
        byId: Map<number, PlayerProjection>
        basis: ProjectionBasis | null
        sources: { team?: ProjectionsResult; roster?: ProjectionsResult }
    }>({ key: '', byId: new Map(), basis: null, sources: {} })
    const projectionById = useMemo(
        () => (projectionState.key === settingsKey ? projectionState.byId : new Map<number, PlayerProjection>()),
        [projectionState, settingsKey],
    )

    // Players already on the lineup (a reopened team, or picks from other teams)
    // get their projections by id, so the lineup total never depends on which
    // team is open in the pool.
    const rosterIdsWithoutProjection = useMemo(
        () => Object.values(roster).filter((id): id is number => id !== null && !projectionById.has(id)),
        [roster, projectionById],
    )
    const rosterProjectionsQuery = useProjectionsData(
        selectedLeagueSlug && rosterIdsWithoutProjection.length > 0
            ? {
                  leagueSlug: selectedLeagueSlug,
                  teamIds: [],
                  playerIds: rosterIdsWithoutProjection,
                  period: forecastPeriod,
                  rules: scoringRules,
              }
            : null,
    )

    // Merge each new response into the cache (adjusting state during render,
    // guarded so it runs once per response).
    const teamResult = projectionsQuery.data
    const rosterResult = rosterProjectionsQuery.data
    if (
        (teamResult && projectionState.sources.team !== teamResult) ||
        (rosterResult && projectionState.sources.roster !== rosterResult)
    ) {
        const merged = new Map(projectionState.key === settingsKey ? projectionState.byId : new Map<number, PlayerProjection>())
        for (const result of [teamResult, rosterResult]) {
            if (result) for (const [id, projection] of result.projections) merged.set(id, projection)
        }
        setProjectionState({
            key: settingsKey,
            byId: merged,
            basis: (teamResult ?? rosterResult)?.basis ?? null,
            sources: { team: teamResult, roster: rosterResult },
        })
    }

    // Edit mode: when an existing team is loaded, prefill the settings,
    // team name, league, roster slots, and captain id. We seed the player
    // cache with the stored roster data so the field renders immediately.
    useEffect(() => {
        if (!isEditMode || !existingTeam) return
        if (prefilledTeamIdRef.current === existingTeam.id) return
        prefilledTeamIdRef.current = existingTeam.id

        setTeamName(existingTeam.name)
        setPlatform(existingTeam.platform)
        setFormat(existingTeam.format)
        setForecastPeriodState(existingTeam.forecastPeriod)
        setLineupChanges(existingTeam.lineupChanges)
        setScoringRules(existingTeam.scoringRules)
        setSlotConfigState(existingTeam.slotConfig)
        setSalaryCap(existingTeam.salaryCap)
        setSelectedLeagueSlug(existingTeam.leagueSlug)

        const nextRoster = createEmptyRoster(buildSlots(existingTeam.slotConfig))
        let nextCaptain: number | null = null
        const restoredPlayers: PoolPlayer[] = []

        for (const slot of existingTeam.rosterSlots) {
            if (!(slot.slotPosition in nextRoster)) continue
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

    const withProjection = useCallback(
        (player: PoolPlayer): PoolPlayer => ({
            ...player,
            proj: projectionById.get(player.id)?.points ?? null,
        }),
        [projectionById],
    )

    const playerById = useCallback(
        (id: number) => {
            const player = playerCache.get(id)
            return player ? withProjection(player) : undefined
        },
        [playerCache, withProjection],
    )

    const projectionFor = useCallback(
        (id: number) => projectionById.get(id),
        [projectionById],
    )

    const pool = useMemo(
        () => (playersQuery.data ?? []).map(withProjection),
        [playersQuery.data, withProjection],
    )
    // Best projection first; players without a forecast sink to the bottom.
    const visiblePool = useMemo(
        () => [...pool].sort((a, b) => (b.proj ?? -Infinity) - (a.proj ?? -Infinity)),
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
                if (!p || p.proj === null) return sum
                const mult = id === captainId ? CAPTAIN_MULTIPLIER : 1
                return sum + p.proj * mult
            }, 0),
        [rosteredIds, captainId, playerById],
    )

    const filledCount = rosteredIds.length
    const isOverCap = salaryCap !== null && salaryUsed > salaryCap
    const isComplete = slots.length > 0 && filledCount === slots.length

    const placementFor = useCallback(
        (player: PoolPlayer): PlayerPlacement =>
            evaluatePlayerPlacement({
                roster,
                slots,
                player,
                targetSlotKey,
                salaryUsed,
                salaryCap,
                playerById,
            }),
        [roster, slots, targetSlotKey, salaryUsed, salaryCap, playerById],
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
                toast(`No open slot for a ${player.pos}`)
                return
            }
            setRoster((prev) => ({ ...prev, [placement.slot.id]: id }))
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
                    toast(`${lastName} is your captain (×${CAPTAIN_MULTIPLIER})`)
                }
            }
            return next
        })
    }, [playerCache])

    const clearLineup = useCallback(() => {
        setRoster(createEmptyRoster(slots))
        setCaptainId(null)
        setTargetSlotKey(null)
        invalidateAutofill()
    }, [slots, invalidateAutofill])

    const chooseFormat = useCallback((next: FantasyFormat) => {
        if (!SUPPORTED_FORMATS.includes(next)) {
            toast('That format is coming soon')
            return
        }
        setFormat(next)
        setFormatChosen(true)
    }, [])

    const setForecastPeriod = useCallback((period: ForecastPeriod) => {
        setForecastPeriodState(period)
        invalidateAutofill()
    }, [invalidateAutofill])

    const handleScoringRules = useCallback((rules: ScoringRules) => {
        setScoringRules(rules)
        invalidateAutofill()
    }, [invalidateAutofill])

    const resetScoringRules = useCallback(() => {
        setScoringRules(DEFAULT_SCORING_RULES)
        invalidateAutofill()
    }, [invalidateAutofill])

    // Players whose slot disappears are taken off the lineup, and we say so.
    const setSlotConfig = useCallback(
        (config: SlotConfig) => {
            const nextSlots = buildSlots(config)
            const { roster: nextRoster, droppedPlayerIds } = remapRoster(roster, nextSlots)
            if (droppedPlayerIds.length > 0) {
                const names = droppedPlayerIds
                    .map((id) => playerCache.get(id)?.name ?? `Player ${id}`)
                    .join(', ')
                toast(`Removed from the lineup (slot no longer exists): ${names}`)
            }
            if (captainId !== null && droppedPlayerIds.includes(captainId)) setCaptainId(null)
            setSlotConfigState(config)
            setRoster(nextRoster)
            setTargetSlotKey(null)
            invalidateAutofill()
        },
        [roster, playerCache, captainId, invalidateAutofill],
    )

    // Generate with AI: POST /api/me/ai/team-builder-autofill. The server
    // projects points for the chosen teams, picks the best valid lineup for the
    // empty slots and the model explains it. Nothing touches the lineup until
    // the user accepts the proposal; any failure leaves the draft as it is.
    const autofill = useCallback(async (mlbTeamIds: number[]): Promise<void> => {
        if (!selectedLeagueSlug) {
            toast.error('Select a league before generating a lineup.')
            return
        }
        if (mlbTeamIds.length === 0) {
            toast.error('Pick at least one team to draw players from.')
            return
        }
        if (isAutofilling) return

        const filledSlots = slots.flatMap((slot) => {
            const id = roster[slot.id]
            return id != null ? [{ slotId: slot.id, externalPlayerId: id }] : []
        })

        const epoch = autofillEpochRef.current
        setIsAutofilling(true)
        try {
            const response = await autofillTeamBuilder({
                league: selectedLeagueSlug as SupportedBaseballLeague,
                mlbTeamIds,
                format,
                period: forecastPeriod,
                rules: scoringRules,
                slotConfig,
                salaryCap,
                filledSlots,
            })

            if (autofillEpochRef.current !== epoch) return

            // Picks can come from any chosen team and carry what is needed to
            // show them, so no roster has to be loaded again.
            const leagueColor = getBaseballLeague(selectedLeagueSlug)?.color ?? '#3b82f6'
            const picked = new Map<number, PoolPlayer>(
                response.suggestedPicks.map((pick) => [
                    pick.externalPlayerId,
                    {
                        id: pick.externalPlayerId,
                        name: pick.playerName,
                        pos: pick.position,
                        team: pick.teamName,
                        leagueSlug: selectedLeagueSlug,
                        leagueColor,
                        salary: null,
                        proj: pick.projectedPoints,
                        photoUrl: pick.photoUrl,
                    },
                ]),
            )
            setCachedPlayers((previous) => new Map([...previous, ...picked]))

            // The server's numbers are the ones the AI used; show the same.
            setProjectionState((previous) => {
                const base = previous.key === settingsKey ? previous.byId : new Map<number, PlayerProjection>()
                const next = new Map(base)
                for (const pick of response.suggestedPicks) {
                    if (!next.has(pick.externalPlayerId)) {
                        next.set(pick.externalPlayerId, {
                            points: pick.projectedPoints,
                            games: 0,
                            starts: 0,
                            confidence: 'normal',
                            basis: response.basis,
                        })
                    }
                }
                return { key: settingsKey, byId: next, basis: response.basis, sources: previous.sources }
            })

            if (response.suggestedPicks.length === 0 && response.unfilled.length === 0) {
                toast('Every slot is already filled')
                return
            }
            setAutofillPreview({
                picks: response.suggestedPicks,
                unfilled: response.unfilled,
                explanation: response.explanation,
                totalPoints: response.totalPoints,
                basis: response.basis,
            })
            setTargetSlotKey(null)
        } catch (error) {
            const code = readApiCode(error)
            const message = readApiMessage(error)
            if (code === 'INSUFFICIENT_CREDITS') {
                // Out of credits → surface the buy-credits modal so the user
                // can top up inline instead of just seeing an error.
                openBuyCredits({ featureName: 'Generate with AI' })
            } else if (code === 'AI_FEATURE_DISABLED') {
                toast.error('Generate with AI is currently disabled')
            } else if (code === 'AI_PROVIDER_ERROR') {
                toast.error('AI service is unavailable — your lineup is unchanged, try again in a moment')
            } else {
                toast.error(message ?? 'Generate with AI failed — your lineup is unchanged')
            }
        } finally {
            setIsAutofilling(false)
        }
    }, [
        isAutofilling,
        roster,
        slots,
        slotConfig,
        format,
        forecastPeriod,
        scoringRules,
        salaryCap,
        settingsKey,
        selectedLeagueSlug,
        openBuyCredits,
    ])

    const previewMerge = useMemo(
        () =>
            autofillPreview
                ? mergeAutofillPicks({
                      roster,
                      picks: autofillPreview.picks.map(({ slotId, externalPlayerId }) => ({
                          slotId,
                          externalPlayerId,
                      })),
                      playersById: playerCache,
                      slots,
                  })
                : null,
        [autofillPreview, roster, playerCache, slots],
    )

    const acceptAutofill = useCallback(() => {
        if (!previewMerge) return
        setRoster(previewMerge.roster)
        setAutofillPreview(null)
        toast.success(`Added ${previewMerge.assignedPicks.length} player(s) to your lineup`)
    }, [previewMerge])

    const discardAutofill = useCallback(() => setAutofillPreview(null), [])

    const focusSlot = useCallback((slotKey: SlotKey) => {
        const slot = parseSlotId(slotKey)
        if (!slot) return
        setTargetSlotKey(slotKey)
        setPoolPosition(isPoolPosition(slot.type) ? slot.type : 'all')
        toast(
            roster[slotKey] == null
                ? `Pick a player for ${slot.type} from the pool`
                : `Pick a replacement for ${slot.type}`,
        )
    }, [roster])

    const canSave =
        teamName.trim().length > 0 &&
        !!selectedLeagueSlug &&
        formatChosen &&
        !isOverCap

    const handleLeagueChange = useCallback((slug: string | null) => {
        setSelectedLeagueSlug(slug)
        setSelectedTeamId(null)
        setPoolSearch('')
        setPoolPosition('all')
        setTargetSlotKey(null)
        invalidateAutofill()
    }, [invalidateAutofill])

    const handleTeamChange = useCallback((id: number | null) => {
        setSelectedTeamId(id)
        setPoolSearch('')
        setPoolPosition('all')
        invalidateAutofill()
    }, [invalidateAutofill])

    const saveLineup = useCallback(async () => {
        if (!canSave || !selectedLeagueSlug) return
        const playersPayload: BuilderRosterSlotPayload[] = []
        for (const slot of slots) {
            const id = roster[slot.id]
            if (id == null) continue
            const player = playerCache.get(id)
            if (!player) {
                toast('A player went missing — try re-adding them')
                return
            }
            playersPayload.push({
                externalPlayerId: player.id,
                slotKey: slot.id,
                position: player.pos,
                name: player.name,
                teamName: player.team,
                salaryAtLock: player.salary,
            })
        }
        const settings = { format, forecastPeriod, lineupChanges, scoringRules, slotConfig, salaryCap }
        const savedMessage = (name: string) =>
            isComplete
                ? `"${name}" saved · ${projTotal.toFixed(1)} proj pts`
                : `"${name}" saved as a draft`

        try {
            setIsSaving(true)

            if (isEditMode && existingTeamId) {
                const lineupPayload: UpdateLineupPayload = {
                    ...settings,
                    players: playersPayload,
                    captainExternalPlayerId: captainId ?? undefined,
                    platform,
                }
                const result = await updateTeamLineup(existingTeamId, lineupPayload)
                toast.success(savedMessage(result.name))
                await globalMutate(['me', 'teams'])
                router.push('/teams')
                return
            }

            const payload: CreateTeamPayload = {
                ...settings,
                name: teamName.trim() || 'Untitled lineup',
                leagueSlug: selectedLeagueSlug,
                platform,
                captainExternalPlayerId: captainId ?? undefined,
                players: playersPayload,
            }

            const result = await createTeam(payload)
            toast.success(savedMessage(result.name))
            await globalMutate(['me', 'teams'])
            router.push('/teams')
        } catch (error) {
            const code = readApiCode(error)
            const message = readApiMessage(error)
            if (code === 'BUDGET_EXCEEDED') {
                toast.error('Lineup is over the salary cap')
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
        slots,
        roster,
        teamName,
        platform,
        format,
        forecastPeriod,
        lineupChanges,
        scoringRules,
        slotConfig,
        salaryCap,
        isComplete,
        captainId,
        projTotal,
        globalMutate,
        router,
        isEditMode,
        existingTeamId,
        playerCache,
    ])

    // Generate with AI is scoped to the league the user picked: the modal only
    // offers that league's teams, so the AI can only draw players from within it.
    const selectedLeagueName =
        (leaguesQuery.data ?? []).find((l) => l.slug === selectedLeagueSlug)?.name ?? null
    const autofillTeams = teamsQuery.data ?? []
    const canAutofill = !!selectedLeagueSlug && formatChosen

    return {
        format,
        formatChosen,
        forecastPeriod,
        lineupChanges,
        scoringRules,
        slotConfig,
        slots,
        isDefaultLayout: isDefaultSlotConfig(slotConfig),
        leagues: leaguesQuery.data ?? [],
        teams: teamsQuery.data ?? [],
        autofillTeams,
        selectedLeagueName,
        canAutofill,
        pool,
        visiblePool,
        roster,
        previewRoster: previewMerge?.roster ?? roster,
        previewSlotIds: previewMerge?.assignedPicks.map((pick) => pick.slotId) ?? [],
        autofillPreview,
        captainId,
        teamName,
        platform,
        poolSearch,
        poolPosition,
        selectedLeagueSlug,
        selectedTeamId,
        targetSlotKey,
        rosteredIds,
        salaryUsed,
        salaryLeft: (salaryCap ?? 0) - salaryUsed,
        projTotal,
        projectionBasis: projectionState.key === settingsKey ? projectionState.basis : null,
        filledCount,
        salaryCap,
        rosterSize: slots.length,
        isOverCap,
        isComplete,
        canSave,
        isSaving,
        isAutofilling,
        isEditMode,
        existingTeamLoading,
        existingTeamMissing,
        leaguesLoading: leaguesQuery.isLoading,
        teamsLoading: teamsQuery.isLoading,
        playersLoading: playersQuery.isLoading,
        projectionsLoading: projectionsQuery.isLoading,
        leaguesError: leaguesQuery.error as Error | undefined,
        teamsError: teamsQuery.error as Error | undefined,
        playersError: playersQuery.error as Error | undefined,
        projectionsError: projectionsQuery.error as Error | undefined,
        existingTeamError: myTeamsQuery.error as Error | undefined,
        addPlayer,
        removeSlot,
        toggleCaptain,
        clearLineup,
        autofill,
        acceptAutofill,
        discardAutofill,
        saveLineup,
        chooseFormat,
        setForecastPeriod,
        setLineupChanges,
        setScoringRules: handleScoringRules,
        resetScoringRules,
        setSlotConfig,
        setTeamName,
        setPlatform,
        setPoolSearch,
        setPoolPosition,
        setSelectedLeagueSlug: handleLeagueChange,
        setSelectedTeamId: handleTeamChange,
        focusSlot,
        playerById,
        projectionFor,
        placementFor,
        retryLeagues: () => void leaguesQuery.mutate(),
        retryTeams: () => void teamsQuery.mutate(),
        retryPlayers: () => void playersQuery.mutate(),
        retryProjections: () => void projectionsQuery.mutate(),
    }
}
