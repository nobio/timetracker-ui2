"use client";

import { apiClient, API_BASE_URL } from "@/lib/api/client";
import { clearSession, getAccessToken, getRefreshToken, isAccessTokenExpired, refreshAccessToken, SESSION_EXPIRED_EVENT } from "@/lib/auth/session";
import { Clock, Settings, LogOut, BarChart3, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();

    // The API client clears the session when the refresh token is rejected;
    // send the user back to the login page instead of leaving a dead dashboard.
    useEffect(() => {
        const handleSessionExpired = () => router.replace("/");
        window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    }, [router]);

    // When the app returns from background (phone hibernate / app switch), the
    // access token may have expired. Proactively refresh it on visibility change
    // so pending queries don't all race to refresh or incorrectly expire the session.
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState !== "visible") return;
            if (isAccessTokenExpired(getAccessToken())) {
                const token = await refreshAccessToken(`${API_BASE_URL}/auth/token`);
                if (!token) {
                    router.replace("/");
                }
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [router]);

    const handleLogout = async () => {
        try {
            await apiClient.POST("/auth/logout", {
                body: { token: getRefreshToken() || "" }
            });
        } catch (e) {
            // ignore
        } finally {
            clearSession();
            router.replace("/");
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
            {/* Mobile top header */}
            <header className="md:hidden bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 flex justify-between items-center sticky top-0 z-40 shadow-sm backdrop-blur-md">
                <Link href="/dashboard" className="flex items-center gap-2.5">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-1.5 rounded-lg shadow-sm shadow-blue-500/30">
                        <Clock className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <span className="tracking-tight text-slate-900 dark:text-slate-100 font-bold text-base">Timetracker</span>
                </Link>
                <div className="flex items-center gap-1">
                    <ThemeSwitcher variant="compact" />
                    <button
                        onClick={handleLogout}
                        aria-label="Logout"
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Sidebar Navigation (Desktop) */}
            <aside className="hidden md:flex w-56 lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex-col min-h-screen transition-colors shrink-0">
                <div className="p-4 lg:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/20 shrink-0">
                        <Clock className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">Timetracker</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">v2.0</div>
                    </div>
                </div>

                <nav className="flex-1 p-2.5 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${isActive
                                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold border border-blue-100 dark:border-blue-900/40"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
                                    }`}
                            >
                                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-2.5 border-t border-slate-200/80 dark:border-slate-800 space-y-1">
                    <div className="px-3 py-2">
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Theme</p>
                        <ThemeSwitcher />
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors font-medium text-sm w-full"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 p-4 sm:p-6 overflow-y-auto pb-28 md:pb-6">
                <div className="max-w-6xl mx-auto w-full">{children}</div>
            </main>

            {/* Bottom Navigation (Mobile) */}
            <nav
                aria-label="Main navigation"
                className="md:hidden fixed bottom-3 left-3 right-3 h-16 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-lg shadow-slate-900/10 dark:shadow-slate-950/50 z-40 flex items-stretch backdrop-blur-lg"
            >
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                            className={`flex flex-col items-center justify-center flex-1 gap-1 py-2 rounded-xl transition-all ${isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-slate-500 dark:text-slate-400"
                                }`}
                        >
                            <div className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${isActive
                                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                                : ""
                                }`}>
                                <item.icon className="w-4 h-4" />
                            </div>
                            <span className={`text-xs font-medium leading-none ${isActive ? "font-semibold" : ""}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
