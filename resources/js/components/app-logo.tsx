export default function AppLogo() {
    return (
        <div className="brand-logo" aria-label="Insetti Nutrición Sostenible">
            <img
                src="/images/insetti-logo.png"
                alt="Insetti Nutrición Sostenible"
                width="291"
                height="131"
            />
            <div className="brand-logo-crop" aria-hidden="true">
                <img src="/images/insetti-logo.png" alt="" />
            </div>
        </div>
    );
}
