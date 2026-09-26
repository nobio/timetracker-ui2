"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import { Loader2 } from "lucide-react";

interface BreaktimeChartProps {
    intervalMinute?: number;
}

interface BreaktimeData {
    time: number;
    breakTime: number;
}

export function BreaktimeChart({ intervalMinute = 10 }: BreaktimeChartProps) {
    const { data: stats, isLoading, error } = useQuery<BreaktimeData[]>({
        queryKey: ["statistics", "breaktime", intervalMinute],
        queryFn: async () => {
            const { data, error } = await apiClient.GET("/statistics/breaktime/{interval}", {
                params: {
                    path: { interval: intervalMinute as unknown as never }, // ts override for OpenAPI bug
                    query: { real: true } // "true if only the 'real' values count" per backend spec
                }
            });
            if (error) throw new Error("Failed to fetch breaktime statistics");
            return data as unknown as BreaktimeData[];
        }
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p>Loading breaktime statistics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                <p>Failed to load breaktime data.</p>
            </div>
        );
    }

    const chartData = stats || [];
    const totalBreaks = chartData.reduce((acc, curr) => acc + curr.breakTime, 0);

    return (
        <div className="w-full space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 shadow-sm transition-colors">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Intervals Count</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight tabular-nums">
                        {totalBreaks} Items
                    </p>
                </div>
            </div>

            <div className="h-[360px] sm:h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 10, bottom: 40, left: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" strokeOpacity={0.25} />
                        <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94A3B8', fontSize: 11 }}
                            tickFormatter={(val) => `${val}m`}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94A3B8', fontSize: 11 }}
                            dx={-5}
                            allowDecimals={false}
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
                            labelFormatter={(label) => `Duration: ${label} mins`}
                            formatter={(value) => [Number(value ?? 0), 'Occurrences']}
                        />
                        <Bar
                            dataKey="breakTime"
                            name="Break Submitting Counts"
                            radius={[6, 6, 0, 0]}
                            barSize={32}
                            fill="#F59E0B"
                        />
                    </BarChart>
                </ResponsiveContainer>
                <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-3">Break duration buckets (in minutes)</p>
            </div>
        </div>
    );
}
