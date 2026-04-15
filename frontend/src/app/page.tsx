"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Mail, Lock, UserCog, Users, User, Moon } from "lucide-react";

import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [role, setRole] = useState<"Admin" | "Team Lead" | "Employee">("Team Lead");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5069";
  const apiUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin 
        ? { email, password, role }
        : { email, password, role, name: email.split("@")[0] };

      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: any;
      try {
        data = await res.json();
      } catch (parseError) {
        const text = await res.text();
        throw new Error(text || "Authentication server returned invalid JSON.");
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Authentication failed (${res.status})`);
      }

      // Store token and redirect
      localStorage.setItem("nv_token", data.token);
      localStorage.setItem("nv_user", JSON.stringify(data.user));
      
      router.push("/dashboard");

    } catch (err: any) {
      const message = err?.message?.includes("Failed to fetch")
        ? `Unable to connect to the authentication server at ${API_BASE_URL}. Make sure the backend is running and the API URL is correct.`
        : err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setForgotMessage(null);
    setTempPassword(null);

    if (!email) {
      setError("Please enter your email above first.");
      return;
    }

    try {
      setForgotLoading(true);
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      let data: any;
      try {
        data = await res.json();
      } catch (parseError) {
        const text = await res.text();
        throw new Error(text || "Password reset server returned invalid JSON.");
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Unable to process password reset (${res.status})`);
      }

      setForgotMessage(data.message || "An email has been sent to you.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4 transition-colors duration-300 dark:bg-slate-900">
      {/* Theme Toggle placeholder */}
      <button className="absolute right-6 top-6 rounded-full bg-white p-3 text-slate-400 shadow-sm transition hover:text-slate-600 dark:bg-slate-800 dark:text-slate-500">
        <Moon className="h-5 w-5" />
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center justify-center space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <LayoutGrid className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">NoteVault</h1>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-none dark:ring-slate-700/50"
        >
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {isLogin ? "Log in to your workspace to continue" : "Join your team and start collaborating"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Select Role
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "Admin", icon: UserCog },
                  { id: "Team Lead", icon: Users },
                  { id: "Employee", icon: User },
                ].map((r) => {
                  const Icon = r.icon;
                  const isActive = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id as any)}
                      className={`flex flex-col items-center justify-center space-y-2 rounded-2xl border p-4 transition-all duration-200 ${
                        isActive
                          ? "border-blue-500 bg-blue-50/50 text-blue-600 dark:border-blue-500/50 dark:bg-blue-500/10 dark:text-blue-400"
                          : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-600"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-medium">{r.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Email address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:border-blue-500 dark:focus:bg-slate-800"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:border-blue-500 dark:focus:bg-slate-800"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Confirm Password (Create account only) */}
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:border-blue-500 dark:focus:bg-slate-800"
                    placeholder="Re-enter password"
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {forgotMessage && (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                <p>{forgotMessage}</p>
              </div>
            )}

            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 disabled:opacity-70"
                >
                  {forgotLoading ? "Sending reset..." : "Forgot password?"}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? "Please wait..." : (isLogin ? "Sign in" : "Create account")}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {isLogin ? "Contact Admin" : "Sign in"}
              </button>
            </p>
          </div>
        </motion.div>

        {/* Footer Links */}
        <div className="mt-8 flex justify-center space-x-6 text-sm text-slate-400">
          <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300">Privacy</a>
          <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300">Terms</a>
          <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300">Help</a>
        </div>
      </div>
    </div>
  );
}
