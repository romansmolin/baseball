interface MyTeamsViewLayoutProps {
    header: React.ReactNode
    sidebar: React.ReactNode
    toolbar: React.ReactNode
    resultsMeta: React.ReactNode
    content: React.ReactNode
    drawer: React.ReactNode
}

export const MyTeamsViewLayout = ({
    header,
    sidebar,
    toolbar,
    resultsMeta,
    content,
    drawer,
}: MyTeamsViewLayoutProps) => (
    <>
        <main className="container mx-auto max-w-6xl px-6 py-6">
            {header}
            <div className="flex gap-6">
                {sidebar}
                <section className="min-w-0 flex-1">
                    {toolbar}
                    {resultsMeta}
                    {content}
                </section>
            </div>
        </main>
        {drawer}
    </>
)
