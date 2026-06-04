interface FormSparklineProps {
    form: number[]
    color: string
    heightPx?: number
}

const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const FormSparkline = ({ form, color, heightPx = 22 }: FormSparklineProps) => {
    const max = Math.max(...form, 1)
    return (
        <span className="inline-flex items-end gap-0.5" style={{ height: heightPx }}>
            {form.map((v, i) => (
                <span
                    key={i}
                    className="w-1.5 rounded-sm"
                    style={{
                        height: `${Math.max(3, (v / max) * heightPx)}px`,
                        backgroundColor: v === 0 ? '#e3e3e3' : hexA(color, 0.55),
                    }}
                />
            ))}
        </span>
    )
}
