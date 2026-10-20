import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M16 5c-3 2-4 5-4 8v12m4-20c3 2 4 5 4 8v12M12 13C4 7 4 18 12 19m8-6c8-6 8 5 0 6M10 24h12"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="16" cy="5" r="2" fill="currentColor" />
        </svg>
    );
}
