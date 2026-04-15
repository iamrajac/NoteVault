"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

export default function InvitePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Extract token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError("No invite token discovered in the link.");
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/auth/register-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, name, password })
      });

      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem("nv_token", data.token);
        localStorage.setItem("nv_user", JSON.stringify(data.user));
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        setError(data.error || "Failed to accept invitation");
      }
    } catch (err) {
      setError("Network Error. Ensure backend server is running.");
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
           <h1 className="text-3xl font-black text-white tracking-tight">You're Invited!</h1>
           <p className="mt-2 text-sm text-slate-400">Register below to join your team's Workspace & Project.</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-800/50 p-8 shadow-2xl backdrop-blur-xl">
          {success ? (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Welcome Aboard!</h2>
              <p className="text-sm text-slate-400 mb-6">Redirecting you to the dashboard...</p>
              <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
            </motion.div>
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
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="jane@company.com" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="••••••••" />
              </div>

              <button 
                type="submit" 
                disabled={loading || !token}
                className="group mt-8 flex w-full items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <span>Accept Invitation</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
