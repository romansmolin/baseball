'use client'
import { useEffect, useMemo, useState } from 'react'
import { saveDailyEntry } from '@/entities/showcase'
import type { DailyContestDetail, DailyEntryRecord } from '@/shared/daily-contests'
import { FIELD_SLOTS, type PoolPlayer, type PoolPositionFilter, type Roster, type SlotKey } from '@/shared/team-builder'
import { getEntryReadiness, replaceDailyPick } from './daily-entry-state'

export function useDailyEntryEditor(contest: DailyContestDetail, entry: DailyEntryRecord | null, onSaved: (entry: DailyEntryRecord) => void) {
    const pool = useMemo<PoolPlayer[]>(() => contest.players.map(player => ({ id: player.externalPlayerId, name: player.name, pos: player.position, team: player.teamName, salary: player.salary, photoUrl: player.photoUrl, leagueSlug: contest.leagueSlug, leagueColor: '#ff7070', proj: 0 })), [contest.players, contest.leagueSlug])
    const [roster, setRoster] = useState<Roster>(() => Object.fromEntries(FIELD_SLOTS.map(slot => [slot.key, entry?.slots.find(pick => pick.slotKey === slot.key)?.player.externalPlayerId ?? null])) as Roster)
    const [captainId, setCaptainId] = useState<number | null>(entry?.captainExternalPlayerId ?? null)
    const [teamName, setTeamName] = useState(entry?.teamName ?? 'My daily lineup')
    const [target, setTarget] = useState<SlotKey>('P')
    const [search, setSearch] = useState('')
    const [position, setPosition] = useState<PoolPositionFilter>('all')
    const [now, setNow] = useState<Date | null>(null)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer) }, [])
    const readiness = getEntryReadiness(roster, pool, captainId, contest.locksAt, now ?? new Date(contest.locksAt))
    const locked = contest.status !== 'OPEN' || (now != null && now.getTime() >= Date.parse(contest.locksAt))
    const byId = new Map(pool.map(player => [player.id, player]))
    const placementFor = (player: PoolPlayer) => {
        const next = replaceDailyPick(roster, target, player, pool, captainId)
        if (locked || next.roster === roster) return { allowed: false as const, reason: 'no-slot' as const }
        return { allowed: true as const, slot: FIELD_SLOTS.find(slot => slot.key === target)!, replacedPlayerId: roster[target], nextSalary: readiness.salaryUsed - (byId.get(roster[target] ?? -1)?.salary ?? 0) + player.salary }
    }
    const addPlayer = (id: number) => {
        if (locked) return
        const player = byId.get(id)
        if (!player) return
        const next = replaceDailyPick(roster, target, player, pool, captainId)
        setRoster(next.roster); setCaptainId(next.captainId); setMessage(null)
        const empty = FIELD_SLOTS.find(slot => next.roster[slot.key] == null)
        if (empty) setTarget(empty.key)
    }
    const remove = (slot: SlotKey) => {
        if (locked) return
        if (roster[slot] === captainId) setCaptainId(null)
        setRoster(current => ({ ...current, [slot]: null })); setTarget(slot); setMessage(null)
    }
    const toggleCaptain = (id: number) => { if (!locked) { setCaptainId(current => current === id ? null : id); setMessage(null) } }
    const save = async () => {
        const current = getEntryReadiness(roster, pool, captainId, contest.locksAt, new Date())
        if (locked || !current.canSave || !teamName.trim() || saving) return
        setSaving(true); setError(null); setMessage(null)
        try {
            const saved = await saveDailyEntry(contest.id, { teamName: teamName.trim(), captainExternalPlayerId: captainId, players: FIELD_SLOTS.map(slot => ({ slotKey: slot.key, externalPlayerId: roster[slot.key]! })) })
            onSaved(saved); setMessage('Your lineup is saved. Entry is free. You can edit it until the deadline.')
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your lineup. Please try again.') }
        finally { setSaving(false) }
    }
    return { pool: pool.filter(player => (position === 'all' || player.pos === position) && `${player.name} ${player.team}`.toLowerCase().includes(search.toLowerCase())), roster, captainId, teamName, setTeamName, target, setTarget, search, setSearch, position, setPosition, locked, saving, message, error, readiness, placementFor, addPlayer, remove, toggleCaptain, save, playerById: (id: number) => byId.get(id) }
}
