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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-sm font-medium text-blue-600 mb-1">Average Working Time</p>
                    <p className="text-2xl font-bold text-slate-800">
                        {stats?.average_working_time ? `${Math.round(stats.average_working_time * 10) / 10}h` : '0h'}
                    </p>
                </div>
            </div>

            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 12 }}
                            dx={-10}
                            domain={[6, 'dataMin']} // Start Y-axis at 6 hours, with some padding above max
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#F1F5F9' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar
                            dataKey="actual"
                            name="Working Hours"
                            fill="#7aabfa"
                            radius={[4, 4, 0, 0]}
                            barSize={timeUnit === 'year' || timeUnit === 'month' ? 40 : 20}
                        />
                        <Line
                            type="monotone"
                            dataKey="average"
                            name="Moving Avg Trend"
                            stroke="#10B981"
                            strokeWidth={3}
                            dot={{ fill: '#10B981', strokeWidth: 1, r: 2 }}
                            activeDot={{ r: 6 }}
                            animationDuration={1000}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
