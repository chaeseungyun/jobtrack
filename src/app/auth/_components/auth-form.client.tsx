"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { authApi } from "@/lib/api/client";

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

export function AuthForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
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
      toast.success(mode === "login" ? "Signed in" : "Account created", {
        id: mode === "login" ? AUTH_TOAST_ID.loginSuccess : AUTH_TOAST_ID.registerSuccess,
      });
      router.replace("/dashboard");
    },
    onError: (error, mode) => {
      const message = error instanceof Error ? error.message : "Request failed";
      toast.error(message, {
        id: mode === "login" ? AUTH_TOAST_ID.loginError : AUTH_TOAST_ID.registerError,
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">JobTrack</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage applications, interviews, and deadlines in one place.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Start with your account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "login" | "register")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
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
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="8+ characters"
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={authMutation.isPending}
                  onClick={() => authMutation.mutate("login")}
                >
                  {authMutation.isPending ? "Signing in..." : "Sign in"}
                </Button>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
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
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="8+ characters"
                    value={registerForm.password}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={authMutation.isPending}
                  onClick={() => authMutation.mutate("register")}
                >
                  {authMutation.isPending ? "Creating account..." : "Create account"}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
