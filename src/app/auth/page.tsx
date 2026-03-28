import { redirect } from "next/navigation";

import { AuthForm } from "@/app/auth/_components/auth-form.client";
import { getSafeCallbackUrl } from "@/lib/auth/callback-url";
import { getServerAuthPayload } from "@/lib/auth/session";

interface AuthPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const [payload, params] = await Promise.all([getServerAuthPayload(), searchParams]);

  const isFromExtension = params.from === "extension";

  if (payload) {
    if (isFromExtension) {
      redirect("/auth/extension-callback");
    }
    const callbackUrl = getSafeCallbackUrl(params.callbackUrl as string | undefined);
    redirect(callbackUrl);
  }

  return <AuthForm callbackUrlOverride={isFromExtension ? "/auth/extension-callback" : undefined} />;
}
