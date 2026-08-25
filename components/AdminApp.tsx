"use client";

import React, { useEffect, useState } from "react";
import DashboardView from "@/components/DashboardView";
import RoomsView from "@/components/RoomsView";
import TenantsView from "@/components/TenantsView";
import BillingView from "@/components/BillingView";
import LoginView from "@/components/LoginView";

export default function AppLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [currentTab, setCurrentTab] = useState<"dashboard" | "rooms" | "tenants" | "billing">("dashboard");

  useEffect(() => {
    const session = sessionStorage.getItem("inday_admin_session");
    if (session === "authenticated") {
      setIsAuthenticated(true);
    }
    setChecking(false);
  }, []);

  if (checking) return null;

  // If not authenticated, render ONLY the login screen across the entire app
  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#f8f7f3]">
      {/* Top Navbar stays visible only when logged in */}
      <nav className="border-b border-[#dcd9d1] bg-[#202522] px-6 py-4 text-white flex justify-between items-center">
        <h1 className="font-bold tracking-tight">Inday Rental Property Desk</h1>
        <button
          onClick={() => {
            sessionStorage.removeItem("inday_admin_session");
            setIsAuthenticated(false);
          }}
          className="text-xs uppercase tracking-wider text-[#cbc7bc] hover:text-white"
        >
          Logout
        </button>
      </nav>

      {/* Tab Nav Buttons */}
      <div className="flex gap-4 border-b border-[#dcd9d1] bg-[#efede7] px-6 py-3">
        <button onClick={() => setCurrentTab("dashboard")} className={`text-sm font-semibold ${currentTab === "dashboard" ? "text-[#d96c52]" : "text-[#707770]"}`}>Dashboard</button>
        <button onClick={() => setCurrentTab("rooms")} className={`text-sm font-semibold ${currentTab === "rooms" ? "text-[#d96c52]" : "text-[#707770]"}`}>Rooms</button>
        <button onClick={() => setCurrentTab("tenants")} className={`text-sm font-semibold ${currentTab === "tenants" ? "text-[#d96c52]" : "text-[#707770]"}`}>Tenants</button>
        <button onClick={() => setCurrentTab("billing")} className={`text-sm font-semibold ${currentTab === "billing" ? "text-[#d96c52]" : "text-[#707770]"}`}>Billing</button>
      </div>

      {/* Dynamic View Rendering */}
      <main className="p-6">
        {currentTab === "dashboard" && <DashboardView onNavigate={setCurrentTab} />}
        {currentTab === "rooms" && <RoomsView />}
        {currentTab === "tenants" && <TenantsView />}
        {currentTab === "billing" && <BillingView />}
      </main>
    </div>
  );
}