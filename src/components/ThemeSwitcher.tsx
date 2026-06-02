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
        <div className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
            <button
                onClick={() => setTheme("light")}
                aria-label="Light theme"
                className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors ${theme === "light"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
            >
                <Sun className="w-4 h-4" />
            </button>
            <button
                onClick={() => setTheme("dark")}
                aria-label="Dark theme"
                className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors ${theme === "dark"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
            >
                <Moon className="w-4 h-4" />
            </button>
            <button
                onClick={() => setTheme("system")}
                aria-label="System theme"
                className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors ${theme === "system"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
            >
                <Monitor className="w-4 h-4" />
            </button>
        </div>
    );
}
