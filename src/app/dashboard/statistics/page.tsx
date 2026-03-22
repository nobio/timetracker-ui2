"use client";

import { AggregateChart } from "@/components/statistics/AggregateChart";
import { BreaktimeChart } from "@/components/statistics/BreaktimeChart";
import { ComeGoChart } from "@/components/statistics/ComeGoChart";
import { ExtraHoursChart } from "@/components/statistics/ExtraHoursChart";
import { addDays, addMonths, addWeeks, addYears, format, getISOWeek, getISOWeekYear, subDays, subMonths, subWeeks, subYears } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";

type TimeUnit = "day" | "week" | "month" | "year";

export default function StatisticsPage() {
    // windowAnchorDate is the anchor for the current time window (start of month/year/week/day)
    const [windowAnchorDate, setWindowAnchorDate] = useState<Date>(new Date());
    const [timeUnit, setTimeUnit] = useState<TimeUnit>("month");
    const [accumulate, setAccumulate] = useState(false);
    const [activeTab, setActiveTab] = useState<"aggregate" | "breaktime" | "come-go" | "extrahours">("extrahours");
    const [showLastPeriod, setShowLastPeriod] = useState(false);

    // Move the windowAnchorDate by the time unit
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

    const showAccumulateControls = activeTab === "extrahours";
    const showCalendarControls = activeTab === "extrahours";
    const showTimeUnitControls = activeTab === "extrahours" || activeTab === "aggregate";

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-800">Statistics</h1>

                {/* Global Date & Unit Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    {showAccumulateControls && (
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                            <input
                                type="checkbox"
                                checked={accumulate}
                                onChange={(e) => setAccumulate(e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                            />
                            Accumulate
                        </label>
                    )}

                    {showCalendarControls && (
                        <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200">
                            <button
                                onClick={() => handleDateChange("prev")}
                                className="p-2 hover:bg-slate-50 text-slate-600 rounded-l-lg"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="relative px-3 py-2 font-medium text-blue-600 border-x border-slate-200 min-w-32 text-center pointer-events-none">
                                {getDateLabel()}
                                {/* Hidden DatePicker Overlay (Native) */}
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
                    )}

                    {showTimeUnitControls && (
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
                    )}

                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                    {[
                        { id: "extrahours", label: "Extra Hours" },
                        { id: "breaktime", label: "Breaktime" },
                        { id: "come-go", label: "Come & Go" },
                        { id: "aggregate", label: "Aggregate" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Views */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px] flex items-center justify-center">
                {activeTab === "aggregate" && (
                    <AggregateChart timeUnit={timeUnit} />
                )}

                {activeTab === "breaktime" && (
                    <BreaktimeChart intervalMinute={10} />
                )}

                {activeTab === "come-go" && (
                    <ComeGoChart intervalMinute={60} />
                )}

                {activeTab === "extrahours" && (
                    <ExtraHoursChart
                        timeUnit={timeUnit}
                        accumulate={accumulate}
                        selectedDate={windowAnchorDate}
                        showLastPeriod={showLastPeriod}
                        setShowLastPeriod={setShowLastPeriod}
                    />
                )}

                {activeTab !== "aggregate" && activeTab !== "breaktime" && activeTab !== "come-go" && activeTab !== "extrahours" && (
                    <div className="text-center text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                        <p>Loading {activeTab} statistics...</p>
                    </div>
                )}
            </div>

        </div>
    );
}
