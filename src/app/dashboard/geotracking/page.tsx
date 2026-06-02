"use client";

import GeotrackTab from "@/components/members/GeotrackTab";
import { MapPin } from "lucide-react";

export default function GeotrackingPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-blue-600">
          <MapPin className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Geotracking</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Explore geotracking data and location history on a dedicated page.</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
        <GeotrackTab />
      </div>
    </div>
  );
}
