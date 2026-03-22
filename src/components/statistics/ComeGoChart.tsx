"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { format } from "date-fns";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { Loader2 } from "lucide-react";

interface ComeGoChartProps {
    intervalMinute?: number;
}

interface HistogramData {
    time: string; // ISO date string from backend for the bucket's hour
    histValue: number;
}

export function ComeGoChart({ intervalMinute = 60 }: ComeGoChartProps) {
    // We run two queries in parallel to get both "enter" (Come) and "go" (Go) densities
    const { data: enterStats, isLoading: isEnterLoading } = useQuery<HistogramData[]>({
        queryKey: ["statistics", "histogram", "enter", intervalMinute],
        queryFn: async () => {
            const { data, error } = await apiClient.GET("/statistics/histogram/{interval}", {
                params: {
                    path: { interval: intervalMinute as unknown as never },
                    query: { direction: "enter" }
                }
            });
            if (error) throw new Error("Failed to fetch enter statistics");
            return data as unknown as HistogramData[];
        }
    });

    const { data: goStats, isLoading: isGoLoading, error: goError } = useQuery<HistogramData[]>({
        queryKey: ["statistics", "histogram", "go", intervalMinute],
        queryFn: async () => {
            const { data, error } = await apiClient.GET("/statistics/histogram/{interval}", {
                params: {
                    path: { interval: intervalMinute as unknown as never },
                    query: { direction: "go" }
                }
            });
            if (error) throw new Error("Failed to fetch go statistics");
            return data as unknown as HistogramData[];
        }
    });

    if (isEnterLoading || isGoLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p>Loading Come & Go statistics...</p>
            </div>
        );
    }

    if (goError) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                <p>Failed to load histogram data.</p>
            </div>
        );
    }

    // Merge the enter and go data into a single array for Recharts
    const mergedData = (enterStats || []).map((enterItem, index) => {
        // The backend `time` is a serialized moment.js ISO string representing the bucket
        // We only care about formatting the time (HH:mm) for the X-axis
        const bucketDate = new Date(enterItem.time);
        const goItem = goStats?.[index];

        return {
            timeLabel: format(bucketDate, "HH:mm"),
            enter: enterItem.histValue,
            go: goItem ? goItem.histValue : 0
        };
    });

    return (
        <div className="w-full space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 flex items-center justify-between">
                    <p className="font-medium text-emerald-800">Clock In Density</p>
                    <div className="w-4 h-4 rounded bg-[#10B981]"></div>
                </div>
                <div className="bg-rose-50 p-4 rounded-lg border border-rose-100 flex items-center justify-between">
                    <p className="font-medium text-rose-800">Clock Out Density</p>
                    <div className="w-4 h-4 rounded bg-[#F43F5E]"></div>
                </div>
            </div>

            <div className="h-[400px] w-full mt-8">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={mergedData}
                        margin={{ top: 20, right: 20, bottom: 40, left: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                            dataKey="timeLabel"
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
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#F1F5F9' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar
                            dataKey="enter"
                            name="Clock In (Come)"
                            fill="#10B981"
                            radius={[4, 4, 0, 0]}
                            stackId="a"
                        />
                        <Bar
                            dataKey="go"
                            name="Clock Out (Go)"
                            fill="#F43F5E"
                            radius={[4, 4, 0, 0]}
                            stackId="a"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
