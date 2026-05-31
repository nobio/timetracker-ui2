"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export function ThemeSwitcher() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
                onClick={() => setTheme("light")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === "light"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
            >
                <Sun className="w-4 h-4" />
                <span className="hidden sm:inline">Light</span>
            </button>
            <button
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === "dark"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
            >
                <Moon className="w-4 h-4" />
                <span className="hidden sm:inline">Dark</span>
            </button>
            <button
                onClick={() => setTheme("system")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === "system"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
            >
                <Monitor className="w-4 h-4" />
                <span className="hidden sm:inline">System</span>
            </button>
        </div>
    );
}
