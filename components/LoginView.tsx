"use client";

import React, { FormEvent, useState } from "react";
import { HouseIcon, LockKeyIcon, UserIcon } from "@phosphor-icons/react";

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const validPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (email.trim() === validEmail && password === validPassword) {
      sessionStorage.setItem("inday_admin_session", "authenticated");
      onLoginSuccess();
    } else {
      setError("Invalid admin email or password. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0ede6] px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-[#dcd9d1] bg-[#f8f7f3] p-7 shadow-xl sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#dcecdf] text-[#397052]">
            <HouseIcon size={24} weight="fill" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d96c52]">
            Admin Gate
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#202522]">
            Inday Rental Portal
          </h1>
          <p className="mt-1.5 text-xs text-[#707770]">
            Sign in to access property management and ledger
          </p>
        </div>

        {error && (
          <div className="mt-5 border-l-2 border-[#d96c52] bg-[#fbeae5] px-3.5 py-2.5 text-xs text-[#9d4937]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#707770]">
              Admin Email
            </label>
            <div className="relative mt-1.5 flex items-center">
              <span className="absolute left-3 text-[#858b84]">
                <UserIcon size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="inday@rental.com"
                className="w-full rounded-md border border-[#dcd9d1] bg-white py-2.5 pl-9 pr-3 text-sm text-[#202522] outline-none transition focus:border-[#d96c52]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#707770]">
              Password
            </label>
            <div className="relative mt-1.5 flex items-center">
              <span className="absolute left-3 text-[#858b84]">
                <LockKeyIcon size={16} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-[#dcd9d1] bg-white py-2.5 pl-9 pr-3 text-sm text-[#202522] outline-none transition focus:border-[#d96c52]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-md bg-[#202522] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
          >
            Sign In to Property Desk
          </button>
        </form>
      </div>
    </div>
  );
}