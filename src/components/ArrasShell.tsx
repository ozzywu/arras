export function ArrasShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh bg-app text-ink flex flex-col overflow-hidden lg:h-auto lg:min-h-dvh lg:overflow-visible">
      <header className="shrink-0 h-12 px-4 lg:h-14 lg:px-8 flex items-center">
        <h1 className="text-[17px] font-semibold tracking-[-0.02em]">Arras</h1>
      </header>
      <div className="flex-1 min-h-0 lg:flex-none">{children}</div>
    </div>
  );
}
