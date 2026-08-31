"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutButtonProps = {
  redirectTo: string;
  className?: string;
  label?: string;
};

export function LogoutButton({ redirectTo, className = "", label = "Logout" }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function logout() {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error("Logout failed");
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return <button type="button" onClick={() => void logout()} disabled={loading} className={className}>
    <LogOut size={17} />{loading ? "Signing out..." : failed ? "Retry logout" : label}
  </button>;
}
