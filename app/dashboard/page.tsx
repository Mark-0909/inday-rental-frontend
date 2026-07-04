"use client"; // 👈 Tells Next.js this file can handle click events and navigation safely

import React from "react";
import Link from "next/link"; // 👈 Native Next.js fast navigation tool

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto font-sans min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-8">
        Inday Rental Admin Panel
      </h1>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
        {/* View Rooms Link */}
        <Link 
          href="/dashboard/rooms" 
          className="bg-blue-600 text-white px-6 py-4 rounded-xl text-center font-bold shadow hover:bg-blue-700 transition transform active:scale-95"
        >
          View Rooms
        </Link>

        {/* View Tenants Link */}
        <Link 
          href="/dashboard/tenants" 
          className="bg-white text-gray-800 border border-gray-200 px-6 py-4 rounded-xl text-center font-bold shadow-sm hover:bg-gray-50 transition transform active:scale-95"
        >
          View Tenants
        </Link>

        {/* View Billing Link */}
        <Link 
          href="/dashboard/billing" 
          className="bg-white text-gray-800 border border-gray-200 px-6 py-4 rounded-xl text-center font-bold shadow-sm hover:bg-gray-50 transition transform active:scale-95"
        >
          View Billing
        </Link>
      </div>
    </div>
  );
}