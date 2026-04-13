"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { authApi } from "@/lib/api/client";
import { getSafeCallbackUrl } from "@/lib/auth/callback-url";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthFormState {
  email: string;
  password: string;
}

const INITIAL_FORM: AuthFormState = {
  email: "",
  password: "",
};

const AUTH_TOAST_ID = {
  loginSuccess: "auth-login-success",
  registerSuccess: "auth-register-success",
  loginError: "auth-login-error",
  registerError: "auth-register-error",
} as const;

interface AuthFormProps {
  callbackUrlOverride?: string;
}

export function AuthForm({ callbackUrlOverride }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get("mode");
  const initialTab = requestedMode === "register" ? "register" : "login";
  const callbackUrl = callbackUrlOverride ?? getSafeCallbackUrl(searchParams.get("callbackUrl"));

  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [loginForm, setLoginForm] = useState<AuthFormState>(INITIAL_FORM);
  const [registerForm, setRegisterForm] = useState<AuthFormState>(INITIAL_FORM);

  const authMutation = useMutation({
    mutationFn: async (mode: "login" | "register") => {
      const form = mode === "login" ? loginForm : registerForm;

      if (mode === "login") {
        await authApi.login(form);
        return;
      }

      await authApi.register(form);
    },
    onSuccess: (_, mode) => {
      toast.success(mode === "login" ? "로그인 완료" : "계정이 생성되었습니다", {
        id: mode === "login" ? AUTH_TOAST_ID.loginSuccess : AUTH_TOAST_ID.registerSuccess,
      });
      if (callbackUrlOverride) {
        window.location.assign(callbackUrl);
      } else {
        router.replace(callbackUrl);
      }
    },
    onError: (error, mode) => {
      const message = error instanceof Error ? error.message : "요청에 실패했습니다";
      toast.error(message, {
        id: mode === "login" ? AUTH_TOAST_ID.loginError : AUTH_TOAST_ID.registerError,
      });
    },
  });

  const selectMode = (mode: "login" | "register") => {
    setActiveTab(mode);
    const newUrl = new URLSearchParams(searchParams.toString());
    newUrl.set("mode", mode);
    router.replace(`/auth?${newUrl.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted via-background to-muted px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-foreground">JobTrack</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            지원서, 면접, 마감일을 한곳에서 관리하세요.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>계정으로 시작하기</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs
              value={activeTab}
              onValueChange={(value) => selectMode(value as "login" | "register")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">로그인</TabsTrigger>
                <TabsTrigger value="register">회원가입</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  authMutation.mutate("login");
                }}>
                  <div className="space-y-2">
                    <Label htmlFor="login-email">이메일</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginForm.email}
                      onChange={(event) =>
                        setLoginForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">비밀번호</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="8자 이상"
                      value={loginForm.password}
                      onChange={(event) =>
                        setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                      }
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={authMutation.isPending}
                  >
                    {authMutation.isPending ? "로그인 중..." : "로그인"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  authMutation.mutate("register");
                }}>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">이메일</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="you@example.com"
                      value={registerForm.email}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">비밀번호</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="8자 이상"
                      value={registerForm.password}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
                      }
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={authMutation.isPending}
                  >
                    {authMutation.isPending ? "계정 생성 중..." : "계정 만들기"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="text-center">
              <Link
                href="/"
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                홈으로 돌아가기
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
