"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getToken, saveUser } from "@/lib/session";

const PUBLIC_PATHS = ["/", "/invite", "/reset-password"];

// Keeps logged-out visitors off private pages and refreshes the stored user (roles, workspaces) once per page load.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const [ready, setReady] = useState(isPublic);

  useEffect(() => {
    if (isPublic) {
      setReady(true);
      return;
    }
    if (!getToken()) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [isPublic, pathname, router]);

  useEffect(() => {
    if (!getToken()) return;
    apiFetch("/api/auth/me")
      .then(async (res) => {
        if (res.ok) saveUser((await res.json()).user);
      })
      .catch(() => {});
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  return <>{children}</>;
}
