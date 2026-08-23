import { ATELIERS, type AtelierId } from "@/lib/ateliers";

export function ArrasShell({
  children,
  atelier = "yarn",
  title = ATELIERS.yarn.title,
  blurb = ATELIERS.yarn.blurb,
  onAtelierChange,
}: {
  children: React.ReactNode;
  atelier?: AtelierId;
  title?: string;
  blurb?: string;
  onAtelierChange?: (id: AtelierId) => void;
}) {
  const screen = atelier === "screen";
  const line = screen ? "rgba(214,176,96,0.18)" : "rgba(90,60,30,0.12)";
  const mute = screen ? "#9a8460" : "#8a6d55";
  const ink = screen ? "#e6d3a4" : "#3b3228";
  const dust = screen ? "#c4b089" : "#6d5c4c";

  return (
    <div className={screen ? undefined : "min-h-screen bg-linen"}>
      <header className="border-b" style={{ borderColor: line }}>
        <div
          className="mx-auto px-6 py-4 flex items-end justify-between gap-4"
          style={{ maxWidth: 1560 }}
        >
          <div>
            <p
              className="text-[11px] tracking-[0.22em] uppercase"
              style={{
                color: mute,
                fontFamily: "var(--font-geist-sans)",
              }}
            >
              Arras
            </p>
            <h1
              className="text-xl leading-tight"
              style={{
                color: ink,
                fontFamily: "var(--font-cormorant)",
                fontWeight: 500,
              }}
            >
              {title}
            </h1>
            {onAtelierChange && (
              <div className="flex flex-wrap gap-2 mt-3">
                {(Object.values(ATELIERS) as (typeof ATELIERS)[AtelierId][]).map(
                  (item) => {
                    const active = item.id === atelier;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onAtelierChange(item.id)}
                        className="px-3 py-1 text-[11px] tracking-[0.14em] uppercase"
                        style={{
                          background: active
                            ? screen
                              ? "#8f2e2a"
                              : "#4a7ec7"
                            : screen
                              ? "#2a241c"
                              : "#e8dcc8",
                          color: active
                            ? screen
                              ? "#f6e6c8"
                              : "#f7f1e6"
                            : ink,
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </div>
          <p
            className="text-sm max-w-md text-right"
            style={{
              color: dust,
              fontFamily: "var(--font-geist-sans)",
            }}
          >
            {blurb}
          </p>
        </div>
      </header>
      <main className="mx-auto px-6 py-8" style={{ maxWidth: 1560 }}>
        {children}
      </main>
    </div>
  );
}
