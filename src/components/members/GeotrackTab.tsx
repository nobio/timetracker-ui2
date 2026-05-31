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
        <div className="flex justify-center items-center h-[500px] bg-slate-50 border border-slate-200 rounded-xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xl font-bold text-slate-800">
                    <MapIcon className="w-6 h-6 text-blue-600" />
                    <h2>Geotracking</h2>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setShowAccuracy(!showAccuracy)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${showAccuracy
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Crosshair className="w-4 h-4" />
                        Accuracy Circles
                    </button>

                    <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200">
                        <button
                            onClick={() => handleDateChange("prev")}
                            className="p-2 hover:bg-slate-50 text-slate-600 rounded-l-lg"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="relative px-3 py-2 font-medium text-blue-600 border-x border-slate-200 min-w-[140px] text-center pointer-events-none">
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
                            className="p-2 hover:bg-slate-50 text-slate-600 rounded-r-lg"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {(["day", "week", "month", "year"] as TimeUnit[]).map(unit => (
                            <button
                                key={unit}
                                onClick={() => setTimeUnit(unit)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${timeUnit === unit
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
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
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-[500] flex justify-center items-center rounded-xl border border-slate-200 h-[500px]">
                        <div className="bg-white p-4 rounded-xl shadow-lg flex items-center gap-3 text-slate-700">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            <span className="font-medium">Loading data...</span>
                        </div>
                    </div>
                )}
                <GeotrackMap data={data || []} showAccuracy={showAccuracy} />
            </div>

            <div className="text-sm text-slate-500 text-center">
                Displaying {data?.length || 0} tracking points for this period.
            </div>
        </div>
    );
}
