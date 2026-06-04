interface PlayersViewLayoutProps {
    header: React.ReactNode
    sidebar: React.ReactNode
    toolbar: React.ReactNode
    content: React.ReactNode
    drawer: React.ReactNode
}

export const PlayersViewLayout = ({
    header,
    sidebar,
    toolbar,
    content,
    drawer,
}: PlayersViewLayoutProps) => (
    <>
        <main className="container mx-auto max-w-6xl px-6 py-6">
            {header}
            <div className="flex gap-6">
                {sidebar}
                <section className="min-w-0 flex-1">
                    {toolbar}
                    {content}
                </section>
            </div>
        </main>
        {drawer}
    </>
)
