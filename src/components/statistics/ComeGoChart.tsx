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
                <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between shadow-sm transition-colors">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">Clock In Density</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">Morning arrivals</p>
                    </div>
                    <div className="w-4 h-4 rounded-full bg-[#10B981] shadow-sm shadow-emerald-500/50"></div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-800/60 flex items-center justify-between shadow-sm transition-colors">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400 font-semibold mb-0.5">Clock Out Density</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">Evening departures</p>
                    </div>
                    <div className="w-4 h-4 rounded-full bg-[#F43F5E] shadow-sm shadow-rose-500/50"></div>
                </div>
            </div>

            <div className="h-[360px] sm:h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={mergedData}
                        margin={{ top: 20, right: 10, bottom: 40, left: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" strokeOpacity={0.25} />
                        <XAxis
                            dataKey="timeLabel"
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
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
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
