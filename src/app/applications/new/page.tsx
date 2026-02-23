import Link from "next/link";

import { requireServerAuth } from "@/lib/auth/session";

import { NewApplicationForm } from "@/app/applications/new/_components/new-application-form.client";
import { AppShell } from "@/components/app/app-shell";

export default async function NewApplicationPage() {
  await requireServerAuth();

  return (
    <AppShell
      title="지원서 등록"
      description="새 지원서와 마감일을 한번에 등록하세요."
      activePath="/applications/new"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link className="text-sm font-medium text-slate-700 underline" href="/board">
          보드로 돌아가기
        </Link>
      </div>

      <NewApplicationForm />
    </AppShell>
  );
}
