"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import {
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Line,
    ComposedChart,
    Legend
} from "recharts";
import { Loader2 } from "lucide-react";

interface AggregateChartProps {
    timeUnit: "day" | "week" | "month" | "year";
}

// Override the openapi-fetch type since schema.ts is inaccurate for this response
interface ActualStatsPayload {
    actual_working_time: number;
    planned_working_time: number;
    average_working_time: number;
    chart_data: {
        main: [{ data: any[] }];
        comp: [{ data: any[] }];
    };
}

export function AggregateChart({ timeUnit }: AggregateChartProps) {
    const { data: stats, isLoading, error } = useQuery<ActualStatsPayload>({
        queryKey: ["statistics", "aggregate", timeUnit],
        queryFn: async () => {
            const { data, error } = await apiClient.GET("/statistics/aggregate", {
                params: {
                    query: { timeUnit }
                }
            });
            if (error) throw new Error("Failed to fetch aggregate statistics");
            return data as unknown as ActualStatsPayload;
        }
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p>Loading aggregate statistics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                <p>Failed to load statistics data.</p>
            </div>
        );
    }

    // Safely extract the inner data arrays from the backend schema
    // main[0].data holds the raw averages. comp[0].data holds the moving average.
    const mainData = stats?.chart_data?.main?.[0]?.data || [];
    const compData = stats?.chart_data?.comp?.[0]?.data || [];

    // Merge both arrays into a single dataset for Recharts tracking by 'x'
    const chartData = mainData.map((d, index) => {
        const compItem = compData.find(c => c.x === d.x);
        return {
            name: d.x,
            actual: d.y, // Primary Bar
            average: compItem ? compItem.y : null, // Secondary Line
        };
    });

    return (
        <div className="w-full space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800/60 shadow-sm transition-colors">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">Avg Working Time</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight tabular-nums">
                        {stats?.average_working_time ? `${Math.round(stats.average_working_time * 10) / 10}h` : '0h'}
                    </p>
                </div>
            </div>

            <div className="h-[360px] sm:h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 20, right: 10, bottom: 20, left: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" strokeOpacity={0.25} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94A3B8', fontSize: 11 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94A3B8', fontSize: 11 }}
                            dx={-5}
                            domain={[6, 'dataMin']}
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
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                        <Bar
                            dataKey="actual"
                            name="Working Hours"
                            fill="#3B82F6"
                            radius={[6, 6, 0, 0]}
                            barSize={timeUnit === 'year' || timeUnit === 'month' ? 36 : 18}
                        />
                        <Line
                            type="monotone"
                            dataKey="average"
                            name="Moving Avg Trend"
                            stroke="#10B981"
                            strokeWidth={3}
                            dot={{ fill: '#10B981', strokeWidth: 1, r: 2 }}
                            activeDot={{ r: 5 }}
                            animationDuration={800}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
