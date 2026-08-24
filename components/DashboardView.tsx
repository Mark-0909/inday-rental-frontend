"use client";

import React from "react";

export default function DashboardView() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d96c52]">Monday briefing</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#202522]">Good morning, Inday.</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[#707770]">A quick look at the building before the day gets busy.</p>
        </div>
        <button className="w-full rounded-md bg-[#d96c52] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c55d45] sm:w-fit">+ Record payment</button>
      </div>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[#dcd9d1] bg-[#dcd9d1] sm:grid-cols-3">
        <div className="bg-[#f8f7f3] p-5">
          <p className="text-xs font-medium text-[#858b84]">Occupancy</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#202522]">8 <span className="text-base font-normal text-[#858b84]">/ 12 rooms</span></p>
          <p className="mt-2 text-xs font-medium text-[#4d8a68]">67% occupied</p>
        </div>
        <div className="bg-[#f8f7f3] p-5">
          <p className="text-xs font-medium text-[#858b84]">Expected this month</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#202522]">₱48,500</p>
          <p className="mt-2 text-xs font-medium text-[#4d8a68]">₱32,000 collected</p>
        </div>
        <div className="bg-[#f8f7f3] p-5">
          <p className="text-xs font-medium text-[#858b84]">Needs attention</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#202522]">4</p>
          <p className="mt-2 text-xs font-medium text-[#d96c52]">payments due this week</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="border-t-2 border-[#202522] pt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold text-[#202522]">Today&apos;s run sheet</h2><span className="text-xs text-[#858b84]">24 August</span></div>
          <div className="divide-y divide-[#dcd9d1] border-y border-[#dcd9d1] text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 py-4"><div><p className="font-medium text-[#202522]">Collect rent</p><p className="mt-1 text-xs text-[#858b84]">Room 04 · Maria Santos</p></div><span className="text-xs font-semibold text-[#d96c52]">Due today</span></div>
            <div className="flex flex-wrap items-center justify-between gap-2 py-4"><div><p className="font-medium text-[#202522]">Check meter readings</p><p className="mt-1 text-xs text-[#858b84]">Rooms 02, 07 and 09</p></div><span className="text-xs font-semibold text-[#858b84]">Before 5 PM</span></div>
            <div className="flex flex-wrap items-center justify-between gap-2 py-4"><div><p className="font-medium text-[#202522]">Follow up on repair</p><p className="mt-1 text-xs text-[#858b84]">Room 11 · Leaking faucet</p></div><span className="text-xs font-semibold text-[#858b84]">Open</span></div>
          </div>
        </section>
        <section className="rounded-lg bg-[#e7e3d9] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#858b84]">Collection health</p>
          <p className="mt-5 text-4xl font-semibold tracking-tight text-[#202522]">66%</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#cbc7bc]"><div className="h-full w-2/3 rounded-full bg-[#4d8a68]" /></div>
          <p className="mt-4 text-sm leading-6 text-[#707770]">Most tenants are on track. Four balances need a reminder before Friday.</p>
        </section>
      </div>
    </div>
  );
}