interface FooterBusinessInfoProps {
    className?: string
}

export const FooterBusinessInfo = ({ className }: FooterBusinessInfoProps) => {
    return (
        <address className={className}>
            <span className="font-semibold">
                CODERUSH SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ
            </span>
            <span>ul. Zajęcza 15, 00-351 Warszawa, Poland</span>
            <span>KRS: 0001188826 · NIP: 5253057317 · REGON: 542464145</span>
        </address>
    )
}
