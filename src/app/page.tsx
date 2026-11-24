"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { storeTokens } from "@/lib/auth/session";
import { Clock, Lock, User, Loader2, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      if (!username || !password) {
        throw new Error("Please enter your username and password");
      }
      const { data, error } = await apiClient.POST("/auth/login", {
        body: { username, password },
      });
      if (error) throw new Error(error.message || "Invalid username or password");
      return data;
    },
    onSuccess: (data) => {
      if (data?.accessToken && data?.refreshToken) {
        storeTokens(data.accessToken, data.refreshToken);
        router.replace("/dashboard");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Read the submitted values from the form itself: password managers and
    // browsers autofill by setting `input.value` directly, which does not fire
    // React's onChange, so the controlled state can still be empty here.
    const formData = new FormData(e.currentTarget);
    const submittedUsername = String(formData.get("username") ?? "").trim();
    const submittedPassword = String(formData.get("password") ?? "");

    setUsername(submittedUsername);
    setPassword(submittedPassword);
    loginMutation.mutate({ username: submittedUsername, password: submittedPassword });
  };

  const inputBase =
    "w-full pl-10 pr-4 py-3 rounded-xl border bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-500 transition-all text-sm outline-none";
  const inputNormal = "border-slate-200 dark:border-slate-700";
  const inputError = "border-rose-400 dark:border-rose-600 focus:ring-rose-400/20 focus:border-rose-500";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors relative overflow-hidden">
      {/* Subtle background glows */}
      <div className="absolute top-1/4 -left-48 w-[500px] h-[500px] bg-blue-400/8 dark:bg-blue-600/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-[500px] h-[500px] bg-indigo-400/8 dark:bg-indigo-600/12 rounded-full blur-3xl pointer-events-none" />

      {/* Top-right compact theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeSwitcher variant="compact" />
      </div>

      <div className="max-w-sm w-full relative z-10">
        {/* Brand header — outside the card for a lighter feel */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3.5 rounded-2xl shadow-lg shadow-blue-500/30 mb-4 ring-1 ring-blue-500/20">
            <Clock className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Timetracker
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
            Sign in to track your working hours
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 transition-colors">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  className={`${inputBase} ${loginMutation.isError ? inputError : inputNormal}`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your username"
                  aria-invalid={loginMutation.isError}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className={`${inputBase} pr-11 ${loginMutation.isError ? inputError : inputNormal}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-invalid={loginMutation.isError}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error message — inline, not a banner */}
            {loginMutation.isError && (
              <div
                role="alert"
                className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginMutation.error.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 focus:ring-4 focus:ring-blue-500/30 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
