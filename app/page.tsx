"use client";

import React, { useState } from "react";
import RoomsPage from "@/components/RoomsView";
import TenantsPage from "@/components/TenantsView";
import BillingPage from "@/components/BillingView";
import DashboardView from "@/components/DashboardView";
import { ChartBarIcon, HouseLineIcon, UsersThreeIcon, InvoiceIcon } from "@phosphor-icons/react";

type ActiveView = "overview" | "rooms" | "tenants" | "billing";

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<ActiveView>("overview");

  const renderViewContent = () => {
    console.log("Rendering visible content for ", activeView);
    switch (activeView) {
      case "overview":
        return <DashboardView />;
      case "rooms":
        return <RoomsPage />;
      case "tenants":
        return <TenantsPage />;
      case "billing":
        return <BillingPage />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 font-sans text-slate-800 antialiased overflow-hidden">
      
      {/* 🧭 PREMIUM SIDEBAR PANEL */}
      <aside className="w-60 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 shadow-xl shrink-0">
        {/* Branding Container */}
        <div className="p-7 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-linear-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center font-black text-white shadow-md shadow-blue-500/20">
              I
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white leading-none">Inday Rental</h2>
              <span className="text-[11px] text-slate-400 font-medium tracking-wider uppercase mt-1 block">Admin Console</span>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Options */}
        <nav className="flex-1 p-5 space-y-1.5 overflow-y-auto">
          <button 
            onClick={() => setActiveView("overview")}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 group ${
              activeView === "overview" 
                ? "bg-linear-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/15" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <ChartBarIcon className="text-2xl font-bold" />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActiveView("rooms")}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 group ${
              activeView === "rooms" 
                ? "bg-linear-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/15" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <HouseLineIcon className="text-2xl font-bold" />
            <span>Rooms</span>
          </button>

          <button 
            onClick={() => setActiveView("tenants")}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 group ${
              activeView === "tenants" 
                ? "bg-linear-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/15" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <UsersThreeIcon className="text-2xl font-bold"/>
            <span>Tenants</span>
          </button>

          <button 
            onClick={() => setActiveView("billing")}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 group ${
              activeView === "billing" 
                ? "bg-linear-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/15" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <InvoiceIcon className="text-2xl font-bold" />
            <span>Billing</span>
          </button>
        </nav>


      </aside>

      {/* 🖥️ DYNAMIC CONTENT WORKSPACE */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        {/* Top Header Toolbar */}
        <header className="h-20 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shadow-sm shrink-0">
          <div className="flex items-center gap-1 text-sm font-medium text-slate-400">
            <span className="text-slate-800 font-bold capitalize tracking-wide  px-1 py-1 text-3xl">
              {activeView}
            </span>
          </div>
          
        </header>

        {/* Dynamic Workspace Container */}
        <div className="flex-1 overflow-y-auto p-8">
          <div key={activeView} className="transition-all duration-200 ease-in-out">
            {renderViewContent()}
          </div>
        </div>
      </main>

    </div>
  );
}