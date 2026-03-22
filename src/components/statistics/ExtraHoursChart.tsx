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
}

interface ExtraHourData {
    date: string; // ISO date format "YYYY-MM-DD" or similar timeUnit bucket string
    extra_hour: number;
    hour: number;
}

type EffectiveTimeUnit = "day" | "week" | "month" | "year";

export function ExtraHoursChart({ timeUnit, accumulate, selectedDate, showLastPeriod, setShowLastPeriod }: ExtraHoursChartProps) {

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
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p>Loading Extra Hours statistics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
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
            {/* Last period filter checkbox */}
            <div className="flex items-center mb-4">
                <input
                    type="checkbox"
                    id="lastPeriod"
                    checked={showLastPeriod}
                    onChange={e => setShowLastPeriod(e.target.checked)}
                    className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="lastPeriod" className="text-sm font-medium text-slate-700">
                    Selected {timeUnit.charAt(0).toUpperCase() + timeUnit.slice(1)}
                </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg border ${isPositiveBalance ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
                    <p className={`text-sm font-medium mb-1 ${isPositiveBalance ? "text-emerald-600" : "text-rose-600"}`}>
                        {accumulate ? "Total Accumulated Balance" : "Current Period Balance"}
                    </p>
                    <p className="text-2xl font-bold text-slate-800">
                        {finalBalance > 0 ? "+" : ""}{Math.round(finalBalance * 10) / 10}h
                    </p>
                </div>
                <div className="p-4 rounded-lg border bg-orange-50 border-slate-200">
                    <p className="text-sm font-medium mb-1 text-slate-600">Total Extra Hours</p>
                    <p className="text-2xl font-bold text-slate-800">
                        {Math.round(totalExtraHours * 10) / 10}h
                    </p>
                </div>
            </div>

            <div className="h-[400px] w-full mt-8">
                <ResponsiveContainer width="100%" height="100%">
                    {timeUnit !== "day" ? (
                        <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                                dx={-10}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ stroke: '#F1F5F9', strokeWidth: 2 }}
                                formatter={(value: number | undefined) => {
                                    const display = value == null ? '—' : Math.round(value * 10) / 10;
                                    return [display, 'Overtime'];
                                }}
                            />
                            <Bar
                                dataKey="extra_hour"
                                name="Extra Hours"
                                radius={[4, 4, 0, 0]}
                                fill="#5d2bd4ff" />
                        </BarChart>
                    ) : (
                        <AreaChart data={chartData} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                            <defs>
                                <linearGradient id="colorExtra" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                                dx={-10}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ stroke: '#F1F5F9', strokeWidth: 2 }}
                                formatter={(value: number | undefined) => {
                                    const display = value == null ? '—' : Math.round(value * 10) / 10;
                                    return [display, 'Overtime Balance'];
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="extra_hour"
                                name="Overtime"
                                stroke="#5d2bd4ff"
                                strokeWidth={1}
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
