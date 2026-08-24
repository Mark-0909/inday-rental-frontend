"use client";

import React, { useState } from "react";
import RoomsPage from "@/components/RoomsView";
import TenantsPage from "@/components/TenantsView";
import BillingPage from "@/components/BillingView";
import DashboardView from "@/components/DashboardView";
import { ChartBarIcon, HouseLineIcon, UsersThreeIcon, InvoiceIcon, CaretRightIcon } from "@phosphor-icons/react";

type ActiveView = "overview" | "rooms" | "tenants" | "billing";

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<ActiveView>("overview");

  const renderViewContent = () => {
    switch (activeView) {
      case "overview": return <DashboardView />;
      case "rooms": return <RoomsPage />;
      case "tenants": return <TenantsPage />;
      case "billing": return <BillingPage />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f4f2ed] font-sans text-[#202522] antialiased lg:h-screen lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col bg-[#202522] text-[#f4f2ed] lg:w-64">
        <div className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5 lg:px-7 lg:py-7"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d96c52] text-lg font-black text-white">I</div><div><h2 className="text-lg font-bold leading-none tracking-tight text-white">Inday Rental</h2><span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-[#aeb4ac]">Property desk</span></div></div></div>
        <nav className="grid grid-cols-4 gap-1 overflow-x-auto px-2 py-2 md:flex md:gap-1 md:px-4 md:py-4 lg:block lg:space-y-1 lg:overflow-visible lg:px-4 lg:py-6">
          {([ ["overview", ChartBarIcon, "Dashboard"], ["rooms", HouseLineIcon, "Rooms"], ["tenants", UsersThreeIcon, "Tenants"], ["billing", InvoiceIcon, "Billing"] ] as const).map(([view, Icon, label]) => <button key={view} onClick={() => setActiveView(view)} className={`group flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-center text-xs font-medium transition-colors md:justify-start md:gap-3 md:px-3 md:text-left md:text-sm lg:w-full lg:py-3 ${activeView === view ? "bg-[#f4f2ed] text-[#202522]" : "text-[#aeb4ac] hover:bg-white/8 hover:text-white"}`}><Icon className="text-xl" weight="regular" /><span>{label}</span>{activeView === view && <CaretRightIcon className="ml-auto hidden text-base md:block" />}</button>)}
        </nav>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f4f2ed] lg:h-screen">
        <header className="flex min-h-18 shrink-0 items-center justify-between gap-4 border-b border-[#dcd9d1] bg-[#f8f7f3] px-4 py-3 sm:px-6 lg:h-22 lg:px-8 lg:py-0"><div className="flex items-center gap-2 text-sm text-[#858b84]"><span className="hidden font-medium md:inline">Workspace</span><CaretRightIcon className="hidden text-xs md:inline" /><span className="font-semibold capitalize text-[#202522]">{activeView}</span></div><div className="flex items-center gap-3 text-right"><div className="hidden md:block"><p className="text-xs font-semibold text-[#202522]">Today, 24 August</p><p className="text-[11px] text-[#858b84]">Cebu City property desk</p></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dedbd2] text-xs font-bold text-[#5b625b]">IR</div></div></header>
        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-8 lg:px-8 lg:py-9"><div key={activeView} className="transition-all duration-200 ease-in-out">{renderViewContent()}</div></div>
      </main>
    </div>
  );
}
