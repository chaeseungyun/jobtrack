import Link from "next/link";

import { LogoutButton } from "@/components/islands/logout-button.client";
import { DarkButton } from "../islands/dark-button.client";

interface AppShellProps {
  title: string;
  description?: string;
  activePath?: string;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/board", label: "보드" },
  { href: "/applications/new", label: "새 지원서" },
];

export function AppShell({
  title,
  description,
  activePath = "",
  children,
}: AppShellProps) {

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold text-foreground">
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
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/"
              className="px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              랜딩
            </Link>
            <DarkButton />
            <LogoutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
