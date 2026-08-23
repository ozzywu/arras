export function ArrasShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-linen">
      <header
        className="border-b"
        style={{ borderColor: "rgba(90,60,30,0.12)" }}
      >
        <div
          className="mx-auto px-6 py-4 flex items-end justify-between gap-4"
          style={{ maxWidth: 1560 }}
        >
          <div>
            <p
              className="text-[11px] tracking-[0.22em] uppercase"
              style={{
                color: "#8a6d55",
                fontFamily: "var(--font-geist-sans)",
              }}
            >
              Arras
            </p>
            <h1
              className="text-xl leading-tight"
              style={{
                color: "#3b3228",
                fontFamily: "var(--font-cormorant)",
                fontWeight: 500,
              }}
            >
              Modern interpretation of medieval tapestry
            </h1>
          </div>
          <p
            className="text-sm max-w-md text-right"
            style={{
              color: "#6d5c4c",
              fontFamily: "var(--font-geist-sans)",
            }}
          >
            Drop a photo. It gets woven into the cloth — no account.
          </p>
        </div>
      </header>
      <main className="mx-auto px-6 py-8" style={{ maxWidth: 1560 }}>
        {children}
      </main>
    </div>
  );
}
