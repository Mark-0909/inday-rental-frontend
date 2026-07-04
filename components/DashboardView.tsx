"use client";

import React from "react";

export default function DashboardView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">Welcome back! Here is what's happening across your rentals today.</p>
      </div>

      {/* Banner Action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 text-white shadow-md">
          <h3 className="font-bold text-lg">Quick Bill Generation</h3>
          <p className="text-sm opacity-85 mt-1 max-w-sm">Ready to record sub-meter usage? Switch over to the Billing tab to input current monthly readings.</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Aiven Cloud Status</h3>
            <p className="text-sm text-slate-500 mt-1">Your relational backend schemas and logs are synced to live instances securely.</p>
          </div>
          <span className="text-xs font-mono text-green-600 font-bold bg-green-50 px-2 py-1 rounded w-max mt-4">✓ SSL connection active</span>
        </div>
      </div>
    </div>
  );
}