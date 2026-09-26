"use client";

import { AggregateChart } from "@/components/statistics/AggregateChart";
import { BreaktimeChart } from "@/components/statistics/BreaktimeChart";
import { ComeGoChart } from "@/components/statistics/ComeGoChart";
import { ExtraHoursChart } from "@/components/statistics/ExtraHoursChart";
import { addDays, addMonths, addWeeks, addYears, format, getISOWeek, getISOWeekYear, subDays, subMonths, subWeeks, subYears } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Clock, Coffee, ArrowRightLeft, BarChart } from "lucide-react";
import { useState } from "react";

type TimeUnit = "day" | "week" | "month" | "year";

export default function StatisticsPage() {
    // windowAnchorDate is the anchor for the current time window (start of month/year/week/day)
    const [windowAnchorDate, setWindowAnchorDate] = useState<Date>(new Date());
    const [timeUnit, setTimeUnit] = useState<TimeUnit>("week");
    const [accumulate, setAccumulate] = useState(false);
    const [activeTab, setActiveTab] = useState<"aggregate" | "breaktime" | "come-go" | "extrahours">("extrahours");
    const [showLastPeriod, setShowLastPeriod] = useState(true);

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
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Statistics</h1>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Analyze working hours, break distributions, and attendance metrics
                    </p>
                </div>

                {/* Global Date & Unit Controls */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {showCalendarControls && (
                        <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800">
                            <button
                                onClick={() => handleDateChange("prev")}
                                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-l-xl transition-colors cursor-pointer"
                                aria-label="Previous period"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="relative px-3 py-2 font-semibold text-sm text-blue-600 dark:text-blue-400 border-x border-slate-200/80 dark:border-slate-800 min-w-32 text-center pointer-events-none tabular-nums">
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
                                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-r-xl transition-colors cursor-pointer"
                                aria-label="Next period"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {showTimeUnitControls && (
                        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                            {(["day", "week", "month", "year"] as TimeUnit[]).map(unit => (
                                <button
                                    key={unit}
                                    onClick={() => setTimeUnit(unit)}
                                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${timeUnit === unit
                                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                        }`}
                                >
                                    {unit.charAt(0).toUpperCase() + unit.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Tabs (horizontally scrollable on mobile) */}
            <div className="border-b border-slate-200/80 dark:border-slate-800 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                <nav className="flex space-x-2 sm:space-x-8 min-w-max pb-px" aria-label="Tabs">
                    {[
                        { id: "extrahours", label: "Extra Hours", icon: Clock },
                        { id: "breaktime", label: "Breaktime", icon: Coffee },
                        { id: "come-go", label: "Come & Go", icon: ArrowRightLeft },
                        { id: "aggregate", label: "Aggregate", icon: BarChart },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 whitespace-nowrap py-3 sm:py-3.5 px-3 border-b-2 font-semibold text-xs sm:text-sm transition-all cursor-pointer ${activeTab === tab.id
                                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500"
                                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
                                }`}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Views */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 min-h-[400px] flex items-center justify-center transition-colors">
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
                        setAccumulate={setAccumulate}
                    />
                )}

                {activeTab !== "aggregate" && activeTab !== "breaktime" && activeTab !== "come-go" && activeTab !== "extrahours" && (
                    <div className="text-center text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500 dark:text-blue-400" />
                        <p>Loading {activeTab} statistics...</p>
                    </div>
                )}
            </div>

        </div>
    );
}
