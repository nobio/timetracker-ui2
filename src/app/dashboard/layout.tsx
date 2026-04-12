"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Clock, Download, Settings, Users, Menu, X, LogOut, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        try {
            await apiClient.POST("/auth/logout", {
                body: { token: localStorage.getItem("refreshToken") || "" }
            });
        } catch (e) {
            // ignore
        } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            router.push("/");
        }
    };

    const navItems = [
        { icon: Clock, label: "Time Entries", href: "/dashboard" },
        { icon: BarChart3, label: "Statistics", href: "/dashboard/statistics" },
        { icon: Users, label: "Members", href: "/dashboard/members" },
        { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Mobile nav header */}
            <div className="md:hidden bg-white border-b border-slate-200 px-5 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/80">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
                    <Clock className="w-5 h-5" />
                    <span className="tracking-tight">Timetracker</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-2 -mr-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {/* Sidebar Navigation */}
            <div
                className="hidden md:flex md:relative md:translate-x-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col min-h-screen"
            >
                <div className="p-6 border-b border-slate-200 items-center gap-3 text-blue-600 font-bold text-xl flex">
                    <Clock className="w-8 h-8" />
                    Timetracker
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${isActive
                                    ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-blue-500"
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-slate-200">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium w-full"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full pb-24 md:pb-8">
                <div className="max-w-7xl mx-auto">{children}</div>
            </main>

            {/* Bottom Navigation (Mobile) */}
            <nav className="md:hidden fixed bottom-6 left-4 right-4 h-16 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 flex items-center justify-around px-2 backdrop-blur-lg bg-slate-900/90">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 h-full rounded-xl transition-all ${isActive ? "text-white" : "text-slate-400"
                                }`}
                        >
                            <div className={`relative p-2 rounded-xl transition-all ${isActive ? "bg-blue-600 shadow-lg shadow-blue-500/30 scale-110" : ""}`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-medium mt-1 uppercase tracking-wider">{item.label.split(" ")[0]}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
