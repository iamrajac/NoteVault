"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { errorMessage, NETWORK_ERROR } from "@/lib/api";
import { getToken, getUser, saveSession, saveUser, setActiveWorkspace } from "@/lib/session";

type InviteInfo = { workspaceName: string; projectName: string | null; email: string | null; role: string };
import { apiFetch } from "@/lib/api";

export default function InvitePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = new URLSearchParams(window.location.search).get("token");
    if (!tokenParam) {
      setError("This invitation link is missing its token.");
      return;
    }
    setToken(tokenParam);
    if (getToken()) setLoggedInEmail(getUser()?.email ?? null);

    apiFetch(`/api/auth/invitations/${encodeURIComponent(tokenParam)}`)
      .then(async (res) => {
        if (!res.ok) {
          setError(await errorMessage(res));
          return;
        }
        const data: InviteInfo = await res.json();
        setInfo(data);
        if (data.email) setEmail(data.email);
      })
      .catch(() => setError(NETWORK_ERROR));
  }, []);

  const finish = (workspaceId?: string) => {
    if (workspaceId) setActiveWorkspace(workspaceId);
    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  };

  // Already logged in: join with the current account.
  const handleAccept = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/auth/accept-invite", { method: "POST", body: JSON.stringify({ token }) });
      if (!res.ok) {
        setError(await errorMessage(res));
        return;
      }
      const data = await res.json();
      saveUser(data.user);
      finish(data.workspaceId);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const res = await apiFetch(`/api/auth/register-invite`, {
        method: "POST",
        body: JSON.stringify({ token, email, name, password })
      });

      if (res.ok) {
        const data = await res.json();
        saveSession(data.token, data.user);
        finish(data.user.workspaces.at(-1)?.workspaceId);
      } else {
        setError(await errorMessage(res, "Failed to accept invitation"));
      }
    } catch (err) {
      setError(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  };

  if (!token && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen pointer-events-none"></div>
      <div className="absolute -bottom-1/4 -right-1/4 h-[800px] w-[800px] rounded-full bg-purple-600/20 blur-[120px] mix-blend-screen pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="mb-8 text-center">
           <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/30">
             <Mail className="h-8 w-8 text-white" />
           </div>
           <h1 className="text-3xl font-black text-white tracking-tight">You&apos;re invited!</h1>
           <p className="mt-2 text-sm text-slate-400">
             {info
               ? <>Join {info.projectName ? <>the project <strong className="text-white">{info.projectName}</strong> in </> : null}<strong className="text-white">{info.workspaceName}</strong> as {info.role}.</>
               : "Join your team's workspace on NoteVault."}
           </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-800/50 p-8 shadow-2xl backdrop-blur-xl">
          {success ? (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Welcome Aboard!</h2>
              <p className="text-sm text-slate-400 mb-6">Redirecting you to the dashboard...</p>
              <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
            </motion.div>
          ) : loggedInEmail ? (
            <div className="space-y-5">
              {error && (
                <div className="rounded-xl bg-red-500/10 p-4 text-sm font-medium text-red-400 border border-red-500/20">{error}</div>
              )}
              <p className="text-sm text-slate-300">You are logged in as <strong className="text-white">{loggedInEmail}</strong>.</p>
              <button onClick={handleAccept} disabled={loading || !info} className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Accept invitation"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              {error && (
                <div className="rounded-xl bg-red-500/10 p-4 text-sm font-medium text-red-400 border border-red-500/20">
                  {error}
                </div>
              )}
              
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</label>
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Jane Doe" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</label>
                <input required type="email" autoComplete="email" readOnly={Boolean(info?.email)} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="jane@company.com" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
                <input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="••••••••" />
              </div>

              <button 
                type="submit" 
                disabled={loading || !info}
                className="group mt-8 flex w-full items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <span>Accept Invitation</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
              <p className="text-center text-sm text-slate-400">
                Already have an account?{" "}
                <Link href={`/?next=${encodeURIComponent(`/invite?token=${token ?? ""}`)}`} className="font-medium text-blue-400 hover:underline">
                  Log in to accept
                </Link>
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
