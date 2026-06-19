interface FooterBusinessInfoProps {
    className?: string
}

export const FooterBusinessInfo = ({ className }: FooterBusinessInfoProps) => {
    return (
        <address className={className}>
            <span className="font-semibold">CODERUSH SP. Z O.O.</span>
            <span>Zajecza 15</span>
            <span>Warszawa</span>
            <span>00-351</span>
            <span>Poland</span>
        </address>
    )
}
