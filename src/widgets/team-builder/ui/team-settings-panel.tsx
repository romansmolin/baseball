'use client'

import {
    FANTASY_FORMATS,
    FORMAT_LABEL,
    SUPPORTED_FORMATS,
    FORECAST_PERIODS,
    FORECAST_PERIOD_LABEL,
    LINEUP_CHANGES,
    LINEUP_CHANGES_LABEL,
    type CategoryKey,
    type FantasyFormat,
    type ForecastPeriod,
    type LineupChanges,
    type ScoringRules,
    type SlotConfig,
} from '@/shared/team-builder'

import { CategorySelector } from './category-selector'
import { OptionSelect } from './option-select'
import { ScoringRulesEditor } from './scoring-rules-editor'
import { SlotConfigEditor } from './slot-config-editor'

interface TeamSettingsPanelProps {
    format: FantasyFormat
    onFormatChange: (format: FantasyFormat) => void
    categories: CategoryKey[]
    onCategoriesChange: (categories: CategoryKey[]) => void
    forecastPeriod: ForecastPeriod
    onForecastPeriodChange: (period: ForecastPeriod) => void
    lineupChanges: LineupChanges
    onLineupChangesChange: (changes: LineupChanges) => void
    slotConfig: SlotConfig
    onSlotConfigChange: (config: SlotConfig) => void
    scoringRules: ScoringRules
    onScoringRulesChange: (rules: ScoringRules) => void
    onResetScoringRules: () => void
}

export const TeamSettingsPanel = ({
    format,
    onFormatChange,
    categories,
    onCategoriesChange,
    forecastPeriod,
    onForecastPeriodChange,
    lineupChanges,
    onLineupChangesChange,
    slotConfig,
    onSlotConfigChange,
    scoringRules,
    onScoringRulesChange,
    onResetScoringRules,
}: TeamSettingsPanelProps) => (
    <details className="rounded-xl border border-foreground/10 bg-card/50">
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium">
            {FORMAT_LABEL[format]} · {FORECAST_PERIOD_LABEL[forecastPeriod]} forecast · league rules
        </summary>
        <div className="space-y-4 border-t border-foreground/10 p-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                    Format
                    <OptionSelect
                        value={format}
                        ariaLabel="Format"
                        onChange={onFormatChange}
                        options={FANTASY_FORMATS.map((value) => ({
                            value,
                            label: SUPPORTED_FORMATS.includes(value) ? FORMAT_LABEL[value] : `${FORMAT_LABEL[value]} (soon)`,
                            disabled: !SUPPORTED_FORMATS.includes(value),
                        }))}
                    />
                </span>
                <span className="flex items-center gap-1.5">
                    Forecast period
                    <OptionSelect
                        value={forecastPeriod}
                        ariaLabel="Forecast period"
                        disabled={format === 'ROTO'}
                        title={format === 'ROTO' ? 'Roto is scored over the whole season' : undefined}
                        onChange={onForecastPeriodChange}
                        options={FORECAST_PERIODS.map((value) => ({ value, label: FORECAST_PERIOD_LABEL[value] }))}
                    />
                </span>
                <span className="flex items-center gap-1.5">
                    Lineup changes
                    <OptionSelect
                        value={lineupChanges}
                        ariaLabel="Lineup changes"
                        onChange={onLineupChangesChange}
                        options={LINEUP_CHANGES.map((value) => ({ value, label: LINEUP_CHANGES_LABEL[value] }))}
                    />
                </span>
            </div>
            <SlotConfigEditor config={slotConfig} onChange={onSlotConfigChange} />
            {format === 'H2H_POINTS' ? (
                <ScoringRulesEditor rules={scoringRules} onChange={onScoringRulesChange} onReset={onResetScoringRules} />
            ) : (
                <CategorySelector categories={categories} onChange={onCategoriesChange} />
            )}
        </div>
    </details>
)
