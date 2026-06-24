'use client'

import Link from 'next/link'
import { useState } from 'react'

import {
    AutofillModal,
    BudgetMeter,
    FieldDiamond,
    FieldHint,
    FieldSlotsOverlay,
    LeagueTeamSelector,
    PlayerPool,
    SaveBar,
    TeamBuilderLayout,
    useTeamBuilderState,
} from '@/widgets/team-builder'

interface TeamBuilderViewProps {
    existingTeamId?: string
}

export const TeamBuilderView = ({ existingTeamId }: TeamBuilderViewProps = {}) => {
    const state = useTeamBuilderState({ existingTeamId })
    const [autofillOpen, setAutofillOpen] = useState(false)

    if (state.isEditMode && state.existingTeamLoading) {
        return <EditModeLoading />
    }

    if (state.isEditMode && state.existingTeamMissing) {
        return <EditModeNotFound />
    }

    const initialAutofillTeamIds = state.selectedTeamId ? [state.selectedTeamId] : []

    return (
        <>
        <TeamBuilderLayout
            subbar={
                <SaveBar
                    teamName={state.teamName}
                    onTeamNameChange={state.setTeamName}
                    canSave={state.canSave}
                    isSaving={state.isSaving}
                    isAutofilling={state.isAutofilling}
                    canAutofill={state.canAutofill}
                    onSave={state.saveLineup}
                    onAutofill={() => setAutofillOpen(true)}
                    onClear={state.clearLineup}
                    editMode={state.isEditMode}
                />
            }
            meterBar={
                <BudgetMeter
                    budget={state.budget}
                    salaryUsed={state.salaryUsed}
                    isLoading={state.budgetLoading}
                    error={state.budgetError}
                    onRetry={state.retryBudget}
                />
            }
            field={
                <div className="space-y-4">
                    <LeagueTeamSelector
                        leagues={state.leagues}
                        teams={state.teams}
                        selectedLeagueSlug={state.selectedLeagueSlug}
                        selectedTeamId={state.selectedTeamId}
                        leaguesLoading={state.leaguesLoading}
                        teamsLoading={state.teamsLoading}
                        leaguesError={state.leaguesError}
                        teamsError={state.teamsError}
                        onLeagueChange={state.setSelectedLeagueSlug}
                        onTeamChange={state.setSelectedTeamId}
                        onLeaguesRetry={state.retryLeagues}
                        onTeamsRetry={state.retryTeams}
                    />
                    <FieldDiamond>
                        <FieldSlotsOverlay
                            slots={state.slots}
                            roster={state.roster}
                            captainId={state.captainId}
                            playerById={state.playerById}
                            onFocusEmpty={state.focusEmptySlot}
                            onRemove={state.removeSlot}
                            onToggleCaptain={state.toggleCaptain}
                        />
                    </FieldDiamond>
                    <FieldHint />
                </div>
            }
            pool={
                <PlayerPool
                    pool={state.visiblePool}
                    rosteredIds={state.rosteredIds}
                    salaryUsed={state.salaryUsed}
                    search={state.poolSearch}
                    position={state.poolPosition}
                    isLoading={state.playersLoading}
                    error={state.playersError}
                    selectedTeamId={state.selectedTeamId}
                    onRetry={state.retryPlayers}
                    onSearch={state.setPoolSearch}
                    onPositionChange={state.setPoolPosition}
                    onAdd={state.addPlayer}
                    openSlotFor={state.openSlotFor}
                />
            }
        />
        <AutofillModal
            open={autofillOpen}
            onOpenChange={setAutofillOpen}
            teams={state.autofillTeams}
            leagueName={state.selectedLeagueName}
            teamsLoading={state.teamsLoading}
            teamsError={state.teamsError}
            initialSelectedTeamIds={initialAutofillTeamIds}
            isAutofilling={state.isAutofilling}
            onConfirm={async (ids) => {
                setAutofillOpen(false)
                await state.autofill(ids)
            }}
        />
        </>
    )
}

const EditModeLoading = () => (
    <main className="container mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-3">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-64 animate-pulse rounded-xl bg-muted/60" />
            <div className="h-32 animate-pulse rounded-xl bg-muted/60" />
        </div>
    </main>
)

const EditModeNotFound = () => (
    <main className="container mx-auto max-w-6xl px-6 py-10">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/15 px-6 py-12 text-center">
            <div className="font-anton text-2xl">Team not found</div>
            <p className="text-sm text-muted-foreground">
                We couldn&apos;t find that team. It may have been deleted or doesn&apos;t
                belong to you.
            </p>
            <Link
                href="/teams"
                className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-95"
            >
                Back to teams
            </Link>
        </div>
    </main>
)
