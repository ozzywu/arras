export function ArrasShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-linen">
      <main className="mx-auto px-6 py-8" style={{ maxWidth: 1560 }}>
        {children}
      </main>
    </div>
  );
}
