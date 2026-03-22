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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                    <p className="text-sm font-medium text-amber-600 mb-1">Total Break Blocks Recorded</p>
                    <p className="text-2xl font-bold text-slate-800">
                        {totalBreaks} Intervals
                    </p>
                </div>
            </div>

            <div className="h-[400px] w-full mt-8">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 20, bottom: 40, left: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 12 }}
                            tickFormatter={(val) => `${val}m`}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 12 }}
                            dx={-10}
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#F1F5F9' }}
                            labelFormatter={(label) => `Duration: ${label} mins`}
                            formatter={(value: number | undefined) => [value || 0, 'Occurrences']}
                        />
                        <Bar
                            dataKey="breakTime"
                            name="Break Submitting Counts"
                            radius={[4, 4, 0, 0]}
                            barSize={32}
                        >
                            {
                                chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill="#F59E0B" />
                                ))
                            }
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                <p className="text-center text-sm text-slate-500 mt-4">Break duration buckets (in minutes)</p>
            </div>
        </div>
    );
}
