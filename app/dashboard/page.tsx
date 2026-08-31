"use client";

import React, { useEffect, useState } from "react";
import RoomsPage from "@/components/RoomsView";
import TenantsPage from "@/components/TenantsView";
import BillingPage from "@/components/BillingView";
import DashboardView from "@/components/DashboardView";
import LoginView from "@/components/LoginView";
import { ChartBarIcon, HouseLineIcon, UsersThreeIcon, InvoiceIcon, CaretRightIcon, SignOutIcon } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/ThemeToggle";

type ActiveView = "overview" | "rooms" | "tenants" | "billing";

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<ActiveView>("overview");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const session = sessionStorage.getItem("inday_admin_session");
    if (session === "authenticated") {
      setIsAuthenticated(true);
    }
    setChecking(false);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("inday_admin_session");
    setIsAuthenticated(false);
  };

  const renderViewContent = () => {
    switch (activeView) {
      case "overview": return <DashboardView onNavigate={(view) => setActiveView(view as ActiveView)} onLogout={handleLogout} />;
      case "rooms": return <RoomsPage />;
      case "tenants": return <TenantsPage />;
      case "billing": return <BillingPage />;
      default: return <DashboardView onNavigate={(view) => setActiveView(view as ActiveView)} onLogout={handleLogout} />;
    }
  };

  if (checking) return null;

  if (!isAuthenticated) {
    return <LoginView onLoginSuccessAction={() => setIsAuthenticated(true)} />;
  }

  const todayFormatted = new Date().toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f4f2ed] dark:bg-[#121212] font-sans text-[#202522] dark:text-gray-200 antialiased lg:h-screen lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col bg-[#202522] text-[#f4f2ed] lg:w-64 dark:bg-[#121212] dark:border-r dark:border-white/10">
        <div className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5 lg:px-7 lg:py-7"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#397052] text-lg font-black text-white">I</div><div><h2 className="text-lg font-bold leading-none tracking-tight text-white">Inday Rental</h2><span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-[#aeb4ac]">Property desk</span></div></div></div>
        <nav className="flex-1 grid grid-cols-4 gap-1 overflow-x-auto px-2 py-2 md:flex md:gap-1 md:px-4 md:py-4 lg:block lg:space-y-1 lg:overflow-visible lg:px-4 lg:py-6">
          {([ ["overview", ChartBarIcon, "Dashboard"], ["rooms", HouseLineIcon, "Rooms"], ["tenants", UsersThreeIcon, "Tenants"], ["billing", InvoiceIcon, "Billing"] ] as const).map(([view, Icon, label]) => <button key={view} onClick={() => setActiveView(view)} className={`group flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-center text-xs font-medium transition-colors md:justify-start md:gap-3 md:px-3 md:text-left md:text-sm lg:w-full lg:py-3 ${activeView === view ? "bg-[#f4f2ed] text-[#202522] dark:bg-white/10 dark:text-white" : "text-[#aeb4ac] hover:bg-white/8 hover:text-white"}`}><Icon className="text-xl" weight="regular" /><span>{label}</span>{activeView === view && <CaretRightIcon className="ml-auto hidden text-base md:block" />}</button>)}
        </nav>
        <div className="hidden lg:block p-4 border-t border-white/10">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#aeb4ac] hover:bg-white/8 hover:text-white transition-colors">
            <SignOutIcon className="text-xl" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f4f2ed] lg:h-screen dark:bg-[#121212]">
        <header className="flex min-h-18 shrink-0 items-center justify-between gap-4 border-b border-[#dcd9d1] bg-[#f8f7f3] dark:border-white/10 dark:bg-[#1e1e1e] px-4 py-3 sm:px-6 lg:h-22 lg:px-8 lg:py-0"><div className="flex items-center gap-2 text-sm text-[#858b84]"><span className="hidden font-medium md:inline">Workspace</span><CaretRightIcon className="hidden text-xs md:inline" /><span className="font-semibold capitalize text-[#202522] dark:text-gray-200">{activeView}</span></div><div className="flex items-center gap-3 text-right"><ThemeToggle /><div className="hidden md:block"><p className="text-xs font-semibold text-[#202522] dark:text-gray-200">Today, {todayFormatted}</p><p className="text-[11px] text-[#858b84]">General Trias property desk</p></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dedbd2] text-xs font-bold text-[#5b625b] dark:bg-gray-700 dark:text-gray-200">IR</div><button onClick={handleLogout} className="p-2 text-[#858b84] hover:text-[#202522] dark:hover:text-white" title="Logout"><SignOutIcon size={20} /></button></div></header>
        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-8 lg:px-8 lg:py-9"><div key={activeView} className="transition-all duration-200 ease-in-out">{renderViewContent()}</div></div>
      </main>
    </div>
  );
}
