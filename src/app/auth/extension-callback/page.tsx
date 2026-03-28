"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CallbackState = "loading" | "success" | "error";

export default function ExtensionCallbackPage() {
  const [state, setState] = useState<CallbackState>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch("/api/auth/extension-token", {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          setState("error");
          return;
        }

        const data = (await response.json()) as { token: string; expiresAt: string };
        setToken(data.token);
        setExpiresAt(data.expiresAt);
        setState("success");
      } catch {
        setState("error");
      }
    };

    fetchToken();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted via-background to-muted px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-foreground">JobTrack</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {state === "loading" && "확장 프로그램 연결 중..."}
              {state === "success" && "로그인 완료!"}
              {state === "error" && "연결 실패"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state === "loading" && (
              <p className="text-sm text-muted-foreground">
                잠시만 기다려주세요...
              </p>
            )}
            {state === "success" && (
              <div
                id="extension-token-container"
                data-extension-token={token}
                data-extension-expires-at={expiresAt}
              >
                <p className="text-sm text-muted-foreground">
                  확장 프로그램 아이콘을 다시 클릭해주세요.
                </p>
              </div>
            )}
            {state === "error" && (
              <p className="text-sm text-destructive">
                토큰 발급에 실패했습니다. 로그인 상태를 확인해주세요.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
