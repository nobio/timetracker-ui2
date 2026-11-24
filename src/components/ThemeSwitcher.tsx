"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

interface ThemeSwitcherProps {
    /** "compact" renders a single cycling icon button; "full" renders all three options (default) */
    variant?: "compact" | "full";
}

export function ThemeSwitcher({ variant = "full" }: ThemeSwitcherProps) {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return variant === "compact" ? <div className="w-8 h-8" /> : null;
    }

    if (variant === "compact") {
        const cycleTheme = () => {
            if (theme === "light") setTheme("dark");
            else if (theme === "dark") setTheme("system");
            else setTheme("light");
        };
        const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
        const label = theme === "dark" ? "Switch to system theme" : theme === "light" ? "Switch to dark theme" : "Switch to light theme";
        return (
            <button
                onClick={cycleTheme}
                aria-label={label}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                <Icon className="w-4 h-4" />
            </button>
        );
    }

    return (
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg gap-0.5">
            {[
                { value: "light", Icon: Sun, label: "Light theme" },
                { value: "dark", Icon: Moon, label: "Dark theme" },
                { value: "system", Icon: Monitor, label: "System theme" },
            ].map(({ value, Icon, label }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    aria-label={label}
                    className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${theme === value
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                >
                    <Icon className="w-4 h-4" />
                </button>
            ))}
        </div>
    );
}
