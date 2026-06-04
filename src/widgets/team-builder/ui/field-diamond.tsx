export const FieldDiamond = ({ children }: { children: React.ReactNode }) => (
    <div
        className="relative mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-foreground/10"
        style={{ aspectRatio: '6 / 5.6' }}
    >
        <svg
            viewBox="0 0 600 560"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden
        >
            <rect width="600" height="560" fill="#5fa04e" />
            <g opacity="0.5">
                <rect x="0" width="86" height="560" fill="#66a955" />
                <rect x="172" width="86" height="560" fill="#66a955" />
                <rect x="344" width="86" height="560" fill="#66a955" />
                <rect x="516" width="84" height="560" fill="#66a955" />
            </g>
            <path
                d="M 30 250 A 290 290 0 0 1 570 250"
                fill="none"
                stroke="#caa06a"
                strokeWidth="16"
                opacity="0.45"
            />
            <path
                d="M 30 250 A 290 290 0 0 1 570 250"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3"
                opacity="0.5"
            />
            <polygon points="300,512 470,360 300,208 130,360" fill="#cf9d68" />
            <polygon points="300,470 410,365 300,262 190,365" fill="#62a651" />
            <line
                x1="300"
                y1="495"
                x2="560"
                y2="235"
                stroke="#ffffff"
                strokeWidth="3"
                opacity="0.85"
            />
            <line
                x1="300"
                y1="495"
                x2="40"
                y2="235"
                stroke="#ffffff"
                strokeWidth="3"
                opacity="0.85"
            />
            <polygon
                points="300,470 410,365 300,262 190,365"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                opacity="0.55"
            />
            <circle cx="300" cy="375" r="26" fill="#cf9d68" />
            <rect x="294" y="371" width="12" height="6" rx="1" fill="#ffffff" opacity="0.9" />
            <rect x="402" y="357" width="15" height="15" rx="2" fill="#fff" transform="rotate(45 409 364)" />
            <rect x="293" y="255" width="15" height="15" rx="2" fill="#fff" transform="rotate(45 300 262)" />
            <rect x="183" y="357" width="15" height="15" rx="2" fill="#fff" transform="rotate(45 190 364)" />
            <path d="M 292 484 h 16 v 9 l -8 7 l -8 -7 z" fill="#ffffff" />
        </svg>
        <div className="absolute inset-0">{children}</div>
    </div>
)
