'use client'

import {
    HITTING_RULE_LABEL,
    PITCHING_RULE_LABEL,
    type ScoringRules,
} from '@/shared/team-builder'

interface ScoringRulesEditorProps {
    rules: ScoringRules
    onChange: (rules: ScoringRules) => void
    onReset: () => void
}

interface RuleGroupProps<K extends string> {
    title: string
    labels: Record<K, string>
    values: Record<K, number>
    onChange: (key: K, value: number) => void
}

// Uncontrolled inputs that commit on blur / Enter, so "-" and "0." can be typed.
const RuleGroup = <K extends string>({ title, labels, values, onChange }: RuleGroupProps<K>) => (
    <div>
        <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">{title}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(labels) as K[]).map((key) => (
                <label key={key} className="flex items-center justify-between gap-2 rounded-md border border-foreground/10 px-2 py-1 text-xs">
                    <span>{labels[key]}</span>
                    <input
                        key={`${key}-${values[key]}`}
                        defaultValue={values[key]}
                        inputMode="decimal"
                        aria-label={`${title} ${labels[key]} points`}
                        onBlur={(e) => {
                            const value = Number(e.target.value)
                            if (Number.isFinite(value) && value !== values[key]) onChange(key, value)
                            else e.target.value = String(values[key])
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="w-14 rounded border border-foreground/15 bg-card px-1.5 py-0.5 text-right text-sm"
                    />
                </label>
            ))}
        </div>
    </div>
)

export const ScoringRulesEditor = ({ rules, onChange, onReset }: ScoringRulesEditorProps) => (
    <div className="space-y-3">
        <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Points per event</div>
            <button type="button" onClick={onReset} className="text-xs text-muted-foreground underline hover:text-foreground">
                Reset to default
            </button>
        </div>
        <RuleGroup
            title="Hitting"
            labels={HITTING_RULE_LABEL}
            values={rules.hitting}
            onChange={(key, value) => onChange({ ...rules, hitting: { ...rules.hitting, [key]: value } })}
        />
        <RuleGroup
            title="Pitching"
            labels={PITCHING_RULE_LABEL}
            values={rules.pitching}
            onChange={(key, value) => onChange({ ...rules, pitching: { ...rules.pitching, [key]: value } })}
        />
    </div>
)
