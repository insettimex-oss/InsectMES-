import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-[#88c63e] text-[#173d2e]">
                <AppLogoIcon className="size-6" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="truncate text-lg leading-tight font-bold tracking-tight">
                    Insect
                    <span className="font-normal text-[#88c63e]">MES</span>
                </span>
                <span className="truncate text-[10px] tracking-[0.18em] text-emerald-100/70 uppercase">
                    Bioconversión BSF
                </span>
            </div>
        </>
    );
}
