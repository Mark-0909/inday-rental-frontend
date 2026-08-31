"use client";

import React, { FormEvent, useState } from "react";
import { HouseIcon, LockKeyIcon, UserIcon } from "@phosphor-icons/react";
import { loginAction } from "@/app/actions/auth";

interface LoginViewProps {
  onLoginSuccessAction: () => void;
}

export default function LoginView({ onLoginSuccessAction }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = await loginAction(email, password);

    if (result.success) {
      sessionStorage.setItem("inday_admin_session", "authenticated");
      onLoginSuccessAction();
    } else {
      setError(result?.error || "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0ede6] dark:bg-[#121212] px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-[#dcd9d1] dark:border-white/10 bg-[#f8f7f3] dark:bg-[#1e1e1e] p-7 shadow-xl sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#dcecdf] dark:bg-[#397052]/20 text-[#397052] dark:text-[#55a278]">
            <HouseIcon size={24} weight="fill" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#397052] dark:text-[#55a278]">
            Admin Gate
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#202522] dark:text-gray-100">
            Inday Rental Portal
          </h1>
          <p className="mt-1.5 text-xs text-[#707770] dark:text-gray-400">
            Sign in to access property management and ledger
          </p>
        </div>

        {error && (
          <div className="mt-5 border-l-2 border-[#9d4937] bg-[#fbeae5] px-3.5 py-2.5 text-xs text-[#9d4937]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#707770] dark:text-gray-400">
              Admin Email
            </label>
            <div className="relative mt-1.5 flex items-center">
              <span className="absolute left-3 text-[#858b84] dark:text-gray-500">
                <UserIcon size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="inday@rental.com"
                className="w-full rounded-md border border-[#dcd9d1] bg-white py-2.5 pl-9 pr-3 text-sm text-[#202522] outline-none transition focus:border-[#397052] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:border-[#55a278]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#707770] dark:text-gray-400">
              Password
            </label>
            <div className="relative mt-1.5 flex items-center">
              <span className="absolute left-3 text-[#858b84] dark:text-gray-500">
                <LockKeyIcon size={16} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-[#dcd9d1] bg-white py-2.5 pl-9 pr-3 text-sm text-[#202522] outline-none transition focus:border-[#397052] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:border-[#55a278]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-md bg-[#202522] dark:bg-white dark:text-[#202522] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black dark:hover:bg-gray-200"
          >
            Sign In to Property Desk
          </button>
        </form>
      </div>
    </div>
  );
}