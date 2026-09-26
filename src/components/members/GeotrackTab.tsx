"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { components } from "@/lib/api/schema";
import { format, addDays, addMonths, addWeeks, addYears, subDays, subMonths, subWeeks, subYears, getISOWeek, getISOWeekYear, endOfDay, endOfWeek, endOfMonth, endOfYear, startOfWeek, startOfMonth, startOfYear, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Map as MapIcon, Crosshair } from "lucide-react";
import dynamic from "next/dynamic";

const GeotrackMap = dynamic(() => import("./GeotrackMap"), {
    ssr: false,
    loading: () => (
        <div className="flex justify-center items-center h-[500px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-500" />
        </div>
    )
});

type GeotrackResp = components["schemas"]["GeotrackResp"];
type TimeUnit = "day" | "week" | "month" | "year";

export default function GeotrackTab() {
    const [windowAnchorDate, setWindowAnchorDate] = useState<Date>(new Date());
    const [timeUnit, setTimeUnit] = useState<TimeUnit>("day");
    const [showAccuracy, setShowAccuracy] = useState(false);

    const handleDateChange = (direction: "prev" | "next") => {
        setWindowAnchorDate(current => {
            const isPrev = direction === "prev";
            switch (timeUnit) {
                case "year":
                    return isPrev ? subYears(current, 1) : addYears(current, 1);
                case "month":
                    return isPrev ? subMonths(current, 1) : addMonths(current, 1);
                case "week":
                    return isPrev ? subWeeks(current, 1) : addWeeks(current, 1);
                case "day":
                    return isPrev ? subDays(current, 1) : addDays(current, 1);
                default:
                    return isPrev ? subMonths(current, 1) : addMonths(current, 1);
            }
        });
    };

    const getDateLabel = (): string => {
        switch (timeUnit) {
            case "year":
                return format(windowAnchorDate, "yyyy");
            case "month":
                return format(windowAnchorDate, "MMM yyyy");
            case "week":
                return `KW ${getISOWeek(windowAnchorDate)}/${getISOWeekYear(windowAnchorDate)}`;
            case "day":
                return format(windowAnchorDate, "dd MMM yyyy");
            default:
                return format(windowAnchorDate, "MMM yyyy");
        }
    };

    // Calculate start and end date based on timeUnit
    const { startDate, endDate } = (() => {
        let start = windowAnchorDate;
        let end = windowAnchorDate;

        switch (timeUnit) {
            case "year":
                start = startOfYear(windowAnchorDate);
                end = endOfYear(windowAnchorDate);
                break;
            case "month":
                start = startOfMonth(windowAnchorDate);
                end = endOfMonth(windowAnchorDate);
                break;
            case "week":
                start = startOfWeek(windowAnchorDate, { weekStartsOn: 1 });
                end = endOfWeek(windowAnchorDate, { weekStartsOn: 1 });
                break;
            case "day":
                start = startOfDay(windowAnchorDate);
                end = endOfDay(windowAnchorDate);
                break;
        }
        return { startDate: start, endDate: end };
    })();

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["geotrack", format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
        queryFn: async () => {
            const { data, error } = await apiClient.GET("/geotrack", {
                params: {
                    query: {
                        dateStart: format(startDate, "yyyy-MM-dd"),
                        dateEnd: format(endDate, "yyyy-MM-dd")
                    }
                }
            });
            if (error) throw new Error("Failed to fetch geotracking data");
            return data as GeotrackResp[];
        }
    });

    return (
        <div className="space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">Location Traces</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Filter by timeframe to inspect recorded movement paths and velocities</p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => setShowAccuracy(!showAccuracy)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer ${showAccuracy
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <Crosshair className="w-4 h-4" />
                        <span>Accuracy Circles</span>
                    </button>

                    <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-800">
                        <button
                            onClick={() => handleDateChange("prev")}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-l-xl transition-colors cursor-pointer"
                            aria-label="Previous date"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="relative px-3 py-1.5 font-semibold text-xs sm:text-sm text-blue-600 dark:text-blue-400 border-x border-slate-200/80 dark:border-slate-800 min-w-[120px] sm:min-w-[140px] text-center">
                            {getDateLabel()}
                            <input
                                type="date"
                                className="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto"
                                value={format(windowAnchorDate, "yyyy-MM-dd")}
                                onChange={(e) => {
                                    if (e.target.value) setWindowAnchorDate(new Date(e.target.value));
                                }}
                            />
                        </div>
                        <button
                            onClick={() => handleDateChange("next")}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-r-xl transition-colors cursor-pointer"
                            aria-label="Next date"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        {(["day", "week", "month", "year"] as TimeUnit[]).map(unit => (
                            <button
                                key={unit}
                                onClick={() => setTimeUnit(unit)}
                                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${timeUnit === unit
                                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                    }`}
                            >
                                {unit.charAt(0).toUpperCase() + unit.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="relative">
                {(isLoading || isFetching) && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-[500] flex justify-center items-center rounded-2xl border border-slate-200/80 dark:border-slate-800 h-[500px]">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                            <span className="font-semibold text-sm">Loading points...</span>
                        </div>
                    </div>
                )}
                <GeotrackMap data={data || []} showAccuracy={showAccuracy} />
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
                Displaying {data?.length || 0} tracking point{data?.length === 1 ? '' : 's'} for this period
            </div>
        </div>
    );
}
