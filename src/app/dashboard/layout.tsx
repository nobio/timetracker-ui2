"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Clock, Download, Settings, Users, Menu, X, LogOut, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();

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
            <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
                    <Clock className="w-6 h-6" />
                    Timetracker
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="text-slate-500 hover:text-slate-800"
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Sidebar Navigation */}
            <div
                className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                    } md:relative md:translate-x-0 z-40 w-64 bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out flex flex-col`}
            >
                <div className="hidden md:flex p-6 border-b border-slate-200 items-center gap-3 text-blue-600 font-bold text-xl">
                    <Clock className="w-8 h-8" />
                    Timetracker
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors font-medium"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    ))}
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
            <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
                <div className="max-w-7xl mx-auto">{children}</div>
            </main>

            {/* Overlay for mobile sidebar */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}
