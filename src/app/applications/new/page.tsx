import Link from "next/link";

import { requireServerAuth } from "@/lib/auth/session";

import { NewApplicationForm } from "@/app/applications/new/_components/new-application-form.client";
import { AppShell } from "@/components/app/app-shell";

export default async function NewApplicationPage() {
  await requireServerAuth();

  return (
    <AppShell
      title="Create Application"
      description="Add a new application and optional deadline in one flow."
      activePath="/applications/new"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link className="text-sm font-medium text-slate-700 underline" href="/board">
          Back to board
        </Link>
      </div>

      <NewApplicationForm />
    </AppShell>
  );
}
