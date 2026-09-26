"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { startOfYear, startOfMonth, startOfWeek, format } from "date-fns";

interface ExtraHoursChartProps {
    timeUnit: "day" | "week" | "month" | "year";
    accumulate: boolean;
    selectedDate: Date;
    showLastPeriod: boolean;
    setShowLastPeriod: (val: boolean) => void;
    setAccumulate: (val: boolean) => void;
}

interface ExtraHourData {
    date: string; // ISO date format "YYYY-MM-DD" or similar timeUnit bucket string
    extra_hour: number;
    hour: number;
}

type EffectiveTimeUnit = "day" | "week" | "month" | "year";

export function ExtraHoursChart({ timeUnit, accumulate, selectedDate, showLastPeriod, setShowLastPeriod, setAccumulate }: ExtraHoursChartProps) {

    // Compute the effective timeUnit, startDate, and endDate for the API call
    const { effectiveTimeUnit, startDate, endDate } = useMemo(() => {
        if (!showLastPeriod) {
            return { effectiveTimeUnit: timeUnit as EffectiveTimeUnit, startDate: undefined, endDate: undefined };
        }

        const now = selectedDate;
        let start, end;
        switch (timeUnit) {
            case "year":
                start = startOfYear(now);
                end = new Date(start.getFullYear() + 1, 0, 0, 23, 59, 59, 999); // End of year
                return {
                    effectiveTimeUnit: "month" as EffectiveTimeUnit,
                    startDate: format(start, "yyyy-MM-dd"),
                    endDate: format(end, "yyyy-MM-dd"),
                };
            case "month":
                start = startOfMonth(now);
                end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999); // End of month
                return {
                    effectiveTimeUnit: "day" as EffectiveTimeUnit,
                    startDate: format(start, "yyyy-MM-dd"),
                    endDate: format(end, "yyyy-MM-dd"),
                };
            case "week":
                start = startOfWeek(now, { weekStartsOn: 1 });
                end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999); // End of week
                return {
                    effectiveTimeUnit: "day" as EffectiveTimeUnit,
                    startDate: format(start, "yyyy-MM-dd"),
                    endDate: format(end, "yyyy-MM-dd"),
                };
            default:
                return { effectiveTimeUnit: timeUnit as EffectiveTimeUnit, startDate: undefined, endDate: undefined };
        }
    }, [showLastPeriod, timeUnit, selectedDate]);

    const { data: stats, isLoading, error } = useQuery<ExtraHourData[]>({
        queryKey: ["statistics", "extrahours", effectiveTimeUnit, accumulate, startDate, endDate],
        queryFn: async () => {
            const { data, error } = await apiClient.GET("/statistics/extrahours", {
                params: {
                    query: {
                        timeUnit: effectiveTimeUnit,
                        accumulate: accumulate ? true : false,
                        ...(startDate ? { startDate } : {}),
                        ...(endDate ? { endDate } : {}),
                    }
                }
            });
            if (error) throw new Error("Failed to fetch extra hours statistics");
            return data as unknown as ExtraHourData[];
        }
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500 dark:text-blue-400" />
                <p>Loading Extra Hours statistics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                <p>Failed to load extra hours data.</p>
            </div>
        );
    }

    const chartData = (stats || []).filter((entry): entry is ExtraHourData => {
        if (!entry) return false;
        if (startDate && entry.date < startDate) return false;
        if (endDate && entry.date > endDate) return false;
        return true;
    });

    // Calculate color based on the final extra_hour value
    const finalBalance = chartData.length > 0 ? (chartData[chartData.length - 1].extra_hour ?? 0) : 0;
    const totalExtraHours = chartData.reduce((sum, entry) => sum + (entry.extra_hour ?? 0), 0);
    const isPositiveBalance = finalBalance >= 0;

    return (
        <div className="w-full space-y-6">
            {/* Controls Row: Selected Period and Accumulate */}
            <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/20 dark:hover:bg-blue-950/20">
                    <input
                        type="checkbox"
                        id="lastPeriod"
                        checked={showLastPeriod}
                        onChange={e => setShowLastPeriod(e.target.checked)}
                        className="rounded-md border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 w-4 h-4 cursor-pointer"
                    />
                    <span>Selected {timeUnit.charAt(0).toUpperCase() + timeUnit.slice(1)}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/20 dark:hover:bg-blue-950/20">
                    <input
                        type="checkbox"
                        id="accumulate"
                        checked={accumulate}
                        onChange={(e) => setAccumulate(e.target.checked)}
                        className="rounded-md border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 w-4 h-4 cursor-pointer"
                    />
                    <span>Accumulate</span>
                </label>
            </div>

            {/* Summary Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className={`p-4 rounded-xl border shadow-sm transition-colors ${isPositiveBalance ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60" : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60"}`}>
                    <p className={`text-xs font-semibold mb-1 uppercase tracking-wider ${isPositiveBalance ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                        {accumulate ? "Accumulated" : "Current Balance"}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight tabular-nums">
                        {finalBalance > 0 ? "+" : ""}{Math.round(finalBalance * 10) / 10}h
                    </p>
                </div>
                <div className="p-4 rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 shadow-sm transition-colors">
                    <p className="text-xs font-semibold mb-1 text-amber-700 dark:text-amber-400 uppercase tracking-wider">Total Extra</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight tabular-nums">
                        {Math.round(totalExtraHours * 10) / 10}h
                    </p>
                </div>
            </div>

            <div className="h-[360px] sm:h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    {timeUnit !== "day" ? (
                        <BarChart data={chartData} margin={{ top: 20, right: 10, bottom: 40, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" strokeOpacity={0.25} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94A3B8', fontSize: 11 }}
                                angle={-45}
                                textAnchor="end"
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94A3B8', fontSize: 11 }}
                                dx={-5}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    borderColor: 'rgba(148, 163, 184, 0.2)',
                                    borderRadius: '12px',
                                    color: '#F8FAFC',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                                    fontSize: '12px',
                                    padding: '8px 12px'
                                }}
                                cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                                formatter={(value) => [`${Math.round(Number(value) * 10) / 10} hrs`, 'Overtime']}
                            />
                            <Bar
                                dataKey="extra_hour"
                                name="Extra Hours"
                                radius={[6, 6, 0, 0]}
                                fill="#3B82F6" />
                        </BarChart>
                    ) : (
                        <AreaChart data={chartData} margin={{ top: 20, right: 10, bottom: 40, left: 0 }}>
                            <defs>
                                <linearGradient id="colorExtra" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.7} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" strokeOpacity={0.25} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94A3B8', fontSize: 11 }}
                                angle={-45}
                                textAnchor="end"
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94A3B8', fontSize: 11 }}
                                dx={-5}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    borderColor: 'rgba(148, 163, 184, 0.2)',
                                    borderRadius: '12px',
                                    color: '#F8FAFC',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                                    fontSize: '12px',
                                    padding: '8px 12px'
                                }}
                                cursor={{ stroke: 'rgba(148, 163, 184, 0.3)', strokeWidth: 1 }}
                                formatter={(value) => [`${Math.round(Number(value ?? 0) * 10) / 10} hrs`, 'Overtime Balance']}
                            />
                            <Area
                                type="monotone"
                                dataKey="extra_hour"
                                name="Overtime"
                                stroke="#3B82F6"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#colorExtra)"
                            />
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}
