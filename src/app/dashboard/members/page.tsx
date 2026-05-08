"use client";

import { useState } from "react";
import UsersTab from "@/components/members/UsersTab";
import GeotrackTab from "@/components/members/GeotrackTab";

export default function MembersPage() {
    const [activeTab, setActiveTab] = useState<"users" | "geotrack">("users");

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-800">Members</h1>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                    {[
                        { id: "users", label: "Users" },
                        { id: "geotrack", label: "Geotracking" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Views */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
                {activeTab === "users" && <UsersTab />}
                {activeTab === "geotrack" && <GeotrackTab />}
            </div>
        </div>
    );
}
