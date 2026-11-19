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

const selectClass = 'rounded-md border border-foreground/15 bg-card px-2 py-1 text-sm text-foreground'

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
                <label className="flex items-center gap-1.5">
                    Format
                    <select
                        value={format}
                        onChange={(e) => onFormatChange(e.target.value as FantasyFormat)}
                        className={selectClass}
                    >
                        {FANTASY_FORMATS.map((value) => (
                            <option key={value} value={value} disabled={!SUPPORTED_FORMATS.includes(value)}>
                                {FORMAT_LABEL[value]}
                                {SUPPORTED_FORMATS.includes(value) ? '' : ' (soon)'}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex items-center gap-1.5">
                    Forecast period
                    <select
                        value={forecastPeriod}
                        disabled={format === 'ROTO'}
                        title={format === 'ROTO' ? 'Roto is scored over the whole season' : undefined}
                        onChange={(e) => onForecastPeriodChange(e.target.value as ForecastPeriod)}
                        className={selectClass}
                    >
                        {FORECAST_PERIODS.map((value) => (
                            <option key={value} value={value}>{FORECAST_PERIOD_LABEL[value]}</option>
                        ))}
                    </select>
                </label>
                <label className="flex items-center gap-1.5">
                    Lineup changes
                    <select
                        value={lineupChanges}
                        onChange={(e) => onLineupChangesChange(e.target.value as LineupChanges)}
                        className={selectClass}
                    >
                        {LINEUP_CHANGES.map((value) => (
                            <option key={value} value={value}>{LINEUP_CHANGES_LABEL[value]}</option>
                        ))}
                    </select>
                </label>
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
