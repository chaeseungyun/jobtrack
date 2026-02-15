import { redirect } from "next/navigation";

import { AuthForm } from "@/app/auth/_components/auth-form.client";
import { getServerAuthPayload } from "@/lib/auth/session";

export default async function AuthPage() {
  const payload = await getServerAuthPayload();

  if (payload) {
    redirect("/dashboard");
  }

  return <AuthForm />;
}
