"use client";

import { apiClient } from "@/lib/api/client";
import { Clock, Settings, LogOut, BarChart3, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

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
        { icon: MapPin, label: "Geotracking", href: "/dashboard/geotracking" },
        { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors">
            {/* Mobile nav header */}
            <header className="md:hidden bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 flex justify-between items-center sticky top-0 z-40 shadow-sm backdrop-blur-md">
                <Link href="/dashboard" className="flex items-center gap-2 text-blue-600 dark:text-blue-500 font-bold text-lg">
                    <div className="bg-blue-600 dark:bg-blue-500 text-white p-1.5 rounded-lg shadow-sm">
                        <Clock className="w-4 h-4" />
                    </div>
                    <span className="tracking-tight text-slate-900 dark:text-slate-100 font-bold">Timetracker</span>
                </Link>
                <div className="flex items-center gap-1.5">
                    <ThemeSwitcher />
                    <button
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                        title="Logout"
                        aria-label="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Sidebar Navigation (Desktop) */}
            <aside
                className="hidden md:flex md:relative md:translate-x-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex-col min-h-screen transition-colors"
            >
                <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
                    <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/20">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">Timetracker</div>
                        <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Workspace 2.0</div>
                    </div>
                </div>

                <nav className="flex-1 p-3 space-y-1.5">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-sm ${isActive
                                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/40 font-semibold"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                                    }`}
                            >
                                <item.icon className={`w-4 h-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="px-1 py-1">
                        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 px-2">Theme</div>
                        <ThemeSwitcher />
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3.5 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors font-medium text-sm w-full"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto w-full pb-24 md:pb-8">
                <div className="max-w-7xl mx-auto w-full">{children}</div>
            </main>

            {/* Bottom Navigation (Mobile) */}
            <nav className="md:hidden fixed bottom-4 left-3 right-3 h-16 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-slate-950/50 z-40 flex items-center justify-around px-2 backdrop-blur-lg">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 h-full rounded-xl transition-all ${isActive
                                ? "text-blue-600 dark:text-blue-400 font-semibold"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                        >
                            <div className={`relative p-1.5 rounded-xl transition-all ${isActive
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105"
                                : ""
                                }`}>
                                <item.icon className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] mt-1 tracking-tight">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
