interface LeaguesViewLayoutProps {
    header: React.ReactNode
    toolbar: React.ReactNode
    resultsMeta: React.ReactNode
    content: React.ReactNode
    drawer: React.ReactNode
}

export const LeaguesViewLayout = ({
    header,
    toolbar,
    resultsMeta,
    content,
    drawer,
}: LeaguesViewLayoutProps) => (
    <>
        <main className="container mx-auto max-w-6xl px-6 py-6">
            {header}
            {toolbar}
            {resultsMeta}
            {content}
        </main>
        {drawer}
    </>
)
