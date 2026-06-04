interface TeamBuilderLayoutProps {
    subbar: React.ReactNode
    meterBar: React.ReactNode
    field: React.ReactNode
    pool: React.ReactNode
}

export const TeamBuilderLayout = ({
    subbar,
    meterBar,
    field,
    pool,
}: TeamBuilderLayoutProps) => (
    <>
        {subbar}
        {meterBar}
        <main className="container mx-auto max-w-6xl px-6 py-6">
            <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
                <section>{field}</section>
                {pool}
            </div>
        </main>
    </>
)
