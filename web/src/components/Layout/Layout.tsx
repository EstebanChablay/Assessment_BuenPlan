import { Link, Outlet } from 'react-router';

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-black/10 bg-ink text-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            MiniPlan
          </Link>
          <span className="text-xs uppercase tracking-[0.2em] text-paper/60">
            Evaluación BuenPlan
          </span>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
