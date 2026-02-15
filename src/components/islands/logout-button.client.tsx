"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { authApi } from "@/lib/api/client";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      router.replace("/auth");
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
    >
      {logoutMutation.isPending ? "Logging out..." : "Logout"}
    </Button>
  );
}
