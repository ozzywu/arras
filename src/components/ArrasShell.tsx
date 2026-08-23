export function ArrasShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-linen text-foreground">
      <header className="border-b border-border/70 bg-card/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1560px] items-baseline justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-heading text-2xl leading-none tracking-tight">
              Arras
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Drop a photo. Watch it get woven into linen.
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1560px] px-6 py-6">{children}</main>
    </div>
  );
}
