"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRightIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  DoorIcon,
  HouseIcon,
  LockKeyIcon,
  ReceiptIcon,
  SignOutIcon,
  UserIcon,
  UsersIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { endpoints } from "@/api/clients";
import { Billing, Room, Tenant } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface DashboardViewProps {
  onNavigate?: (view: "dashboard" | "rooms" | "tenants" | "billing") => void;
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Property Data State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayFormatted, setTodayFormatted] = useState("");

  // Hydration protection & session check
  useEffect(() => {
    setMounted(true);
    const session = sessionStorage.getItem("inday_admin_session");
    if (session === "authenticated") {
      setIsAuthenticated(true);
    }
    setTodayFormatted(
      new Date().toLocaleDateString("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    );
  }, []);

  // Lock body scroll while login overlay is active
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mounted, isAuthenticated]);

  // Fetch metrics only when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    Promise.all([
      endpoints.rooms.getAll(),
      endpoints.tenants.getAll(),
      endpoints.billing.getAll(),
    ])
      .then(([roomRes, tenantRes, billingRes]) => {
        setRooms(roomRes.data);
        setTenants(tenantRes.data);
        setBillings(billingRes.data);
      })
      .catch(() => {
        setError("Could not load real-time property metrics from backend.");
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const validEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const validPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (email.trim() === validEmail && password === validPassword) {
      sessionStorage.setItem("inday_admin_session", "authenticated");
      setIsAuthenticated(true);
    } else {
      setLoginError("Invalid admin email or password. Please try again.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("inday_admin_session");
    setIsAuthenticated(false);
    setEmail("");
    setPassword("");
  };

  const activeTenants = useMemo(() => {
    return tenants.filter((t) => t.status?.toUpperCase() === "ACTIVE");
  }, [tenants]);

  const totalRooms = rooms.length;
  const occupiedRoomsCount = useMemo(() => {
    const activeAssignedRoomIds = new Set(
      activeTenants
        .map((t) => Number(t.room?.id ?? t.roomId))
        .filter((id) => !Number.isNaN(id) && id > 0)
    );
    return rooms.filter((r) => activeAssignedRoomIds.has(r.id) || r.status === "OCCUPIED").length;
  }, [rooms, activeTenants]);

  const occupancyRate = useMemo(() => {
    if (totalRooms === 0) return 0;
    return Math.round((occupiedRoomsCount / totalRooms) * 100);
  }, [occupiedRoomsCount, totalRooms]);

  const financialStats = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    billings.forEach((b) => {
      const amt = Number(b.totalAmount || 0);
      totalExpected += amt;
      if (b.status === "PAID") {
        totalCollected += amt;
      } else if (b.status === "OVERDUE") {
        overdueCount += 1;
      } else {
        pendingCount += 1;
      }
    });

    const collectionRate =
      totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return {
      totalExpected,
      totalCollected,
      pendingCount,
      overdueCount,
      collectionRate,
    };
  }, [billings]);

  const pendingInvoices = useMemo(() => {
    return billings
      .filter((b) => b.status === "UNPAID" || b.status === "OVERDUE")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [billings]);

  // Prevent SSR Hydration divergence before client mount
  if (!mounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#707770]">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl space-y-8">
      {/* Full-Screen Blocking Login Portal */}
      {!isAuthenticated && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-9999 flex h-screen w-screen items-center justify-center bg-[#181d1a] px-4 py-8">
              <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#3b433e] bg-[#f8f7f3] p-7 shadow-2xl sm:p-9">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#dcecdf] text-[#397052]">
                    <HouseIcon size={28} weight="fill" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d96c52]">
                    Security Gate
                  </p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#202522]">
                    Inday Rental Portal
                  </h1>
                  <p className="mt-1.5 text-xs text-[#707770]">
                    Enter credentials to unlock property data and desk tools
                  </p>
                </div>

                {loginError && (
                  <div className="mt-5 border-l-2 border-[#d96c52] bg-[#fbeae5] px-3.5 py-2.5 text-xs text-[#9d4937]">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleLogin} className="mt-6 space-y-4">
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
                    Unlock Dashboard
                  </button>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}

      {/* Main Dashboard Layout */}
      {loading ? (
        <div className="py-20 text-center text-sm text-[#707770]">
          Loading property overview...
        </div>
      ) : (
        <>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d96c52]">
                {todayFormatted}
              </p>
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#202522]">
                Property Overview
              </h1>
              <p className="mt-1.5 max-w-lg text-sm leading-6 text-[#707770]">
                Live operational status across units, active tenancies, and revenue stream.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onNavigate && (
                <>
                  <button
                    onClick={() => onNavigate("billing")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#d96c52] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c55d45]"
                  >
                    <ReceiptIcon size={16} weight="bold" /> Manage Invoices
                  </button>
                  <button
                    onClick={() => onNavigate("tenants")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#cbc7bc] bg-white px-4 py-2.5 text-sm font-semibold text-[#202522] transition-colors hover:border-[#202522]"
                  >
                    <UsersIcon size={16} weight="bold" /> Residents
                  </button>
                </>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 rounded-md border border-[#cbc7bc] bg-white px-3 py-2.5 text-xs font-medium text-[#707770] transition hover:border-[#202522] hover:text-[#202522]"
                title="Lock session"
              >
                <SignOutIcon size={16} /> Logout
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="border-l-2 border-[#d96c52] bg-[#f8f7f3] px-4 py-3 text-sm text-[#9d4937]">
              {error}
            </p>
          )}

          {/* Primary KPI Matrix */}
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[#dcd9d1] bg-[#dcd9d1] sm:grid-cols-3">
            <div className="bg-[#f8f7f3] p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-[#858b84]">Occupancy</p>
                <DoorIcon size={18} className="text-[#858b84]" />
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#202522]">
                {occupiedRoomsCount}{" "}
                <span className="text-base font-normal text-[#858b84]">/ {totalRooms} rooms</span>
              </p>
              <p className="mt-2 text-xs font-medium text-[#4d8a68]">
                {occupancyRate}% occupancy ({totalRooms - occupiedRoomsCount} available)
              </p>
            </div>

            <div className="bg-[#f8f7f3] p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-[#858b84]">Collected Revenue</p>
                <CheckCircleIcon size={18} className="text-[#4d8a68]" />
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#202522]">
                {formatCurrency(financialStats.totalCollected)}
              </p>
              <p className="mt-2 text-xs font-medium text-[#858b84]">
                of {formatCurrency(financialStats.totalExpected)} total billed
              </p>
            </div>

            <div className="bg-[#f8f7f3] p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-[#858b84]">Outstanding Balances</p>
                <WarningCircleIcon size={18} className="text-[#d96c52]" />
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#202522]">
                {financialStats.pendingCount + financialStats.overdueCount}
              </p>
              <p className="mt-2 text-xs font-medium text-[#d96c52]">
                {financialStats.overdueCount > 0
                  ? `${financialStats.overdueCount} overdue invoices need notice`
                  : `${financialStats.pendingCount} unpaid invoices pending settlement`}
              </p>
            </div>
          </div>

          {/* Operational Sections */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.35fr_0.65fr]">
            <section className="border-t-2 border-[#202522] pt-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#202522]">Unsettled Invoices</h2>
                  <p className="text-xs text-[#858b84]">Pending payments requiring collection</p>
                </div>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate("billing")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#d96c52] hover:underline"
                  >
                    View all <ArrowUpRightIcon size={12} weight="bold" />
                  </button>
                )}
              </div>

              {pendingInvoices.length === 0 ? (
                <div className="rounded-md border border-[#dcd9d1] bg-[#f8f7f3] py-8 text-center text-xs text-[#707770]">
                  All tenant invoices are settled. No pending balances.
                </div>
              ) : (
                <div className="divide-y divide-[#dcd9d1] border-y border-[#dcd9d1] text-sm">
                  {pendingInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                    >
                      <div>
                        <p className="font-semibold text-[#202522]">
                          {inv.tenant?.fullName ?? "Resident"}
                        </p>
                        <p className="mt-0.5 text-xs text-[#858b84]">
                          Room {inv.room?.roomNumber ?? "-"} · Billed {formatDate(inv.billingDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#202522]">{formatCurrency(inv.totalAmount)}</p>
                        <span
                          className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            inv.status === "OVERDUE"
                              ? "bg-[#fbeae5] text-[#9d4937]"
                              : "bg-[#eee4d6] text-[#94613a]"
                          }`}
                        >
                          Due {formatDate(inv.dueDate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="flex flex-col justify-between rounded-lg bg-[#e7e3d9] p-6">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#858b84]">
                    Collection Progress
                  </p>
                  <CalendarCheckIcon size={18} className="text-[#397052]" />
                </div>
                <p className="mt-5 text-4xl font-semibold tracking-tight text-[#202522]">
                  {financialStats.collectionRate}%
                </p>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#cbc7bc]">
                  <div
                    className="h-full rounded-full bg-[#397052] transition-all duration-500"
                    style={{ width: `${Math.min(100, financialStats.collectionRate)}%` }}
                  />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-[#707770]">
                  {financialStats.collectionRate >= 80
                    ? "Collection rate is healthy. Most residents have cleared utility and rent dues."
                    : "Collection is below target. Issue reminders for overdue meter and rental invoices."}
                </p>
              </div>

              <div className="mt-6 border-t border-[#dcd9d1] pt-4 text-xs space-y-1.5 text-[#5b625b]">
                <div className="flex justify-between">
                  <span>Active Residents:</span>
                  <span className="font-semibold text-[#202522]">{activeTenants.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Units:</span>
                  <span className="font-semibold text-[#202522]">
                    {totalRooms - occupiedRoomsCount}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}