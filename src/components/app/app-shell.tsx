import Link from "next/link";

import { LogoutButton } from "@/components/islands/logout-button.client";

interface AppShellProps {
  title: string;
  description?: string;
  activePath?: string;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/board", label: "Board" },
  { href: "/applications/new", label: "New" },
];

export function AppShell({
  title,
  description,
  activePath = "",
  children,
}: AppShellProps) {

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="text-lg font-semibold text-slate-900">
            JobTrack
          </Link>
          <nav className="flex items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = activePath.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <LogoutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
