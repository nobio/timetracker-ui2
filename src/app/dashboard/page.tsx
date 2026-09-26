"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { format, isSameDay, addDays, subDays } from "date-fns";
import { Clock, Play, Square, Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2, Pencil, Map as MapIcon, X, RotateCw, Route, Plane, Ambulance, Briefcase, Coffee, CheckCircle2, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

const MapComponent = dynamic(() => import("@/components/Map"), {
    ssr: false,
});
import { components } from "@/lib/api/schema";
import { useState, type TouchEvent } from "react";

function formatMsToHoursMinutes(ms: number) {
    if (!ms || isNaN(ms)) return "00:00";
    const minutes = Math.floor(ms / 60000);
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

type TimeEntry = components["schemas"]["TimeEntry"] & { _id?: string };

export default function DashboardPage() {
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
    const [entryToEdit, setEntryToEdit] = useState<TimeEntry | null>(null);
    const [editFormTime, setEditFormTime] = useState<string>("00:00");
    const [showMapModal, setShowMapModal] = useState(false);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const PULL_THRESHOLD = 70;

    const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
        if (window.scrollY === 0 && event.touches.length === 1) {
            setTouchStartY(event.touches[0].clientY);
            setPullDistance(0);
            setIsPulling(true);
        }
    };

    const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
        if (!isPulling || touchStartY === null) return;
        const currentY = event.touches[0].clientY;
        const distance = Math.max(0, currentY - touchStartY);
        setPullDistance(Math.min(distance, 120));
    };

    const handleTouchEnd = () => {
        if (isPulling && pullDistance >= PULL_THRESHOLD) {
            refetchEntries();
            refetchStats();
        }
        setTouchStartY(null);
        setPullDistance(0);
        setIsPulling(false);
    };

    const { data: allEntries, isLoading: isLoadingEntries, isFetching: isFetchingEntries, error: entriesError, refetch: refetchEntries } = useQuery({
        queryKey: ["entries"],
        queryFn: async () => {
            const { data, error } = await apiClient.GET("/entries");
            if (error) throw new Error("Failed to fetch entries");
            return data as TimeEntry[];
        },
    });

    const { data: busyStats, isLoading: isLoadingStats, isFetching: isFetchingStats, refetch: refetchStats } = useQuery({
        queryKey: ["entries", format(selectedDate, "yyyy-MM-dd"), "busy"],
        queryFn: async () => {
            const { data, error } = await apiClient.GET("/entries", {
                // @ts-ignore: adding custom query arguments mapped to openapi types
                params: { query: { busy: selectedDate.getTime() } }
            });
            if (error) throw new Error("Failed to fetch busy stats");
            return data as unknown as { duration: number, busytime: number, pause: number, count: number };
        },
    });

    const createEntryMutation = useMutation({
        mutationFn: async (direction: "enter" | "go") => {
            const now = new Date();
            let entryDate = now;

            // If the user is on a different day, use that day but keep the current time of day
            if (!isSameDay(selectedDate, now)) {
                entryDate = new Date(selectedDate);
                entryDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
            }

            let longitude: number | undefined = undefined;
            let latitude: number | undefined = undefined;

            if ("geolocation" in navigator) {
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    longitude = position.coords.longitude;
                    latitude = position.coords.latitude;
                } catch (err) {
                    console.warn("Could not get location:", err);
                }
            }

            const { data, error } = await apiClient.POST("/entries", {
                body: {
                    direction,
                    // @ts-expect-error: The backend expects 'datetime' but the OpenAPI spec only defines 'entry_date'
                    datetime: entryDate.toISOString(),
                    longitude,
                    latitude,
                }
            });
            if (error) throw new Error("Failed to create entry");
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["entries"] });
            queryClient.invalidateQueries({ queryKey: ["entries", format(selectedDate, "yyyy-MM-dd"), "busy"] });
        }
    });

    const deleteEntryMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await apiClient.DELETE("/entries/{id}", {
                params: { path: { id } }
            });
            if (error) throw new Error("Failed to delete entry");
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["entries"] });
            queryClient.invalidateQueries({ queryKey: ["entries", format(selectedDate, "yyyy-MM-dd"), "busy"] });
            setEntryToDelete(null);
        }
    });

    const editEntryMutation = useMutation({
        mutationFn: async ({ id, datetime }: { id: string, datetime: string }) => {
            const { error } = await apiClient.PUT("/entries/{id}", {
                params: { path: { id } },
                body: {
                    direction: entryToEdit?.direction || "enter",
                    entry_date: datetime,
                    // @ts-ignore: The backend expects 'datetime' but the OpenAPI spec only defines 'entry_date'
                    datetime: datetime,
                }
            });
            if (error) throw new Error("Failed to edit entry");
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["entries"] });
            queryClient.invalidateQueries({ queryKey: ["entries", format(selectedDate, "yyyy-MM-dd"), "busy"] });
            setEntryToEdit(null);
        }
    });

    const markDayMutation = useMutation({
        mutationFn: async (mark: "vacation" | "sick-leave") => {
            const { data, error } = await apiClient.POST("/entries/mark", {
                body: {
                    entry_date: format(selectedDate, "yyyy-MM-dd"),
                    mark,
                }
            });
            if (error) throw new Error("Failed to mark day");
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["entries"] });
            queryClient.invalidateQueries({ queryKey: ["entries", format(selectedDate, "yyyy-MM-dd"), "busy"] });
        }
    });

    const triggerDelete = (id: string | undefined) => {
        if (!id) return;
        setEntryToDelete(id);
    };

    const confirmDelete = () => {
        if (entryToDelete) {
            deleteEntryMutation.mutate(entryToDelete);
        }
    };

    const triggerEdit = (entry: TimeEntry) => {
        setEntryToEdit(entry);
        setEditFormTime(format(new Date(entry.entry_date), "HH:mm"));
    };

    const confirmEdit = () => {
        if (entryToEdit && entryToEdit._id) {
            const datePart = format(new Date(entryToEdit.entry_date), "yyyy-MM-dd");
            const newDatetime = new Date(`${datePart}T${editFormTime}:00`).toISOString();
            editEntryMutation.mutate({ id: entryToEdit._id, datetime: newDatetime });
        }
    };

    if (isLoadingEntries || isLoadingStats) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Filter entries for the selected date
    const entries = allEntries?.filter(entry =>
        isSameDay(new Date(entry.entry_date), selectedDate)
    ) || [];
    // Determine if any entry for the selected date has location data
    const hasLocation = entries.some(entry => entry.latitude !== undefined && entry.longitude !== undefined);

    // The backend returns entries sorted chronologically ascending. 
    // To find if the user is currently working on the selected date, we check the latest entry on THAT day.
    const latestEntry = entries.length > 0
        ? [...entries].sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())[0]
        : undefined;
    const isWorking = latestEntry?.direction === "enter";

    const firstEntry = entries.length > 0
        ? [...entries].sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())[0]
        : undefined;

    let predictedEnd = "--:--";
    if (firstEntry && busyStats) {
        const workGoalMs = 8 * 60 * 60 * 1000;
        const endTimeMs = new Date(firstEntry.entry_date).getTime() + workGoalMs + (busyStats.pause || 0);
        predictedEnd = format(new Date(endTimeMs), "HH:mm");
    }

    const handleToggleTimer = () => {
        createEntryMutation.mutate(isWorking ? "go" : "enter");
    };

    const isActionPending = createEntryMutation.isPending || markDayMutation.isPending;
    const isToday = isSameDay(selectedDate, new Date());

    return (
        <div
            className="space-y-6"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            {/* Top error banner if fetching fails, with Retry button */}
            {entriesError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-700 dark:text-rose-400">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">Failed to load entries. Check your connection or try again.</span>
                    </div>
                    <button
                        onClick={() => {
                            refetchEntries();
                            refetchStats();
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white self-start sm:self-auto transition-colors cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Header & Action Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Time Entries</h1>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Track and manage your daily working sessions and leaves
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    {/* Mark Vacation & Sick Leave */}
                    <button
                        onClick={() => markDayMutation.mutate("vacation")}
                        disabled={isActionPending}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs sm:text-sm font-medium border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        title="Mark selected date as vacation"
                        aria-label="Vacation"
                    >
                        <Plane className="w-4 h-4" />
                        <span>Vacation</span>
                    </button>

                    <button
                        onClick={() => markDayMutation.mutate("sick-leave")}
                        disabled={isActionPending}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs sm:text-sm font-medium border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        title="Mark selected date as sick leave"
                        aria-label="Sick leave"
                    >
                        <Ambulance className="w-4 h-4" />
                        <span>Sick</span>
                    </button>

                    <button
                        onClick={() => {
                            refetchEntries();
                            refetchStats();
                        }}
                        disabled={isFetchingEntries || isFetchingStats}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        title="Reload data"
                        aria-label="Reload data"
                    >
                        <RotateCw className={`w-4 h-4 ${(isFetchingEntries || isFetchingStats) ? "animate-spin" : ""}`} />
                    </button>

                    <button
                        onClick={() => setShowMapModal(true)}
                        disabled={!hasLocation}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all ${!hasLocation ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                        title={hasLocation ? "Show locations on map" : "No location data for this date"}
                        aria-label={hasLocation ? "Show locations on map" : "No location data for this date"}
                    >
                        <MapIcon className="w-4 h-4" />
                    </button>

                    {/* Clock In / Out CTA */}
                    <button
                        onClick={handleToggleTimer}
                        disabled={isActionPending}
                        className={`flex h-10 px-4 sm:px-5 items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-sm transition-all flex-1 sm:flex-initial cursor-pointer ${isWorking
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300/80 dark:border-amber-600/40 hover:bg-amber-500/25 active:scale-95"
                            : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/25 shadow-md active:scale-95"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {createEntryMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isWorking ? (
                            <Square className="w-4 h-4 fill-current" />
                        ) : (
                            <Play className="w-4 h-4 fill-current" />
                        )}
                        <span>{isWorking ? "Clock Out" : "Clock In"}</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</span>
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatMsToHoursMinutes(busyStats?.duration || 0)}
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Gesamtzeit</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Work</span>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                            <Briefcase className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums">
                        {formatMsToHoursMinutes(busyStats?.busytime || 0)}
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Arbeitszeit</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pause</span>
                        <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                            <Coffee className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-500 dark:text-amber-400 tabular-nums">
                        {formatMsToHoursMinutes(busyStats?.pause || 0)}
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Pausenzeit</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">End (Est.)</span>
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                        {predictedEnd}
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Vorhersage Feierabend</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-colors">
                {/* Date Navigation Header */}
                <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
                    <button
                        onClick={() => setSelectedDate(prev => subDays(prev, 1))}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-colors cursor-pointer"
                        aria-label="Previous day"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2 sm:gap-3 font-semibold text-slate-800 dark:text-slate-100">
                        <div
                            className="relative p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer group"
                            title="Select a specific date"
                        >
                            <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                            <input
                                type="date"
                                value={format(selectedDate, "yyyy-MM-dd")}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const [year, month, day] = e.target.value.split('-').map(Number);
                                        setSelectedDate(new Date(year, month - 1, day));
                                    }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                        <span className="text-sm sm:text-base font-semibold">
                            {isToday ? "Today, " : ""}
                            <span className="sm:hidden">{format(selectedDate, "MMM d, yyyy")}</span>
                            <span className="hidden sm:inline">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                        </span>
                        {!isToday && (
                            <button
                                onClick={() => setSelectedDate(new Date())}
                                className="ml-1 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-lg transition-colors cursor-pointer"
                                title="Jump to Today"
                            >
                                Today
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setSelectedDate(prev => addDays(prev, 1))}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-colors cursor-pointer"
                        aria-label="Next day"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Mobile View: Cards */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {[...entries].sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()).map((entry) => (
                        <div key={entry._id || entry.entry_date} className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                                        {entry.direction === "enter" ? "Clocked In" : "Clocked Out"}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {format(new Date(entry.entry_date), "MMM d, yyyy")}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${entry.direction === "enter"
                                        ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                                        : "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                                        }`}>
                                        {entry.direction === "enter" ? "In" : "Out"}
                                    </span>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => triggerEdit(entry)}
                                            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                                            title="Edit Entry"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => triggerDelete(entry._id)}
                                            disabled={deleteEntryMutation.isPending}
                                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 cursor-pointer"
                                            title="Delete Entry"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm font-medium">
                                <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                <span className="tabular-nums font-semibold">{format(new Date(entry.entry_date), "HH:mm")}</span>
                            </div>
                        </div>
                    ))}
                    {entries.length === 0 && (
                        <div className="p-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-3">
                            <div className="bg-slate-100 dark:bg-slate-800 p-3.5 rounded-2xl">
                                <CalendarIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                            </div>
                            <p className="text-sm font-medium">No time entries for {isToday ? "today" : "this date"}.</p>
                        </div>
                    )}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200/80 dark:divide-slate-800">
                        <thead className="bg-slate-50/80 dark:bg-slate-800/40">
                            <tr>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Date
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Time
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Type
                                </th>
                                <th scope="col" className="relative px-6 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200/80 dark:divide-slate-800">
                            {[...entries].sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()).map((entry) => (
                                <tr key={entry._id || entry.entry_date} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 font-medium">
                                        {format(new Date(entry.entry_date), "MMM d, yyyy")}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                            <span className="tabular-nums font-semibold">{format(new Date(entry.entry_date), "HH:mm")}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${entry.direction === "enter"
                                            ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                                            : "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                                            }`}>
                                            {entry.direction === "enter" ? "Clocked In" : "Clocked Out"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => triggerEdit(entry)}
                                                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                                                title="Edit Entry"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => triggerDelete(entry._id)}
                                                disabled={deleteEntryMutation.isPending}
                                                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 cursor-pointer"
                                                title="Delete Entry"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {entries.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="bg-slate-100 dark:bg-slate-800 p-3.5 rounded-2xl">
                                                <CalendarIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                                            </div>
                                            <p className="text-base font-medium text-slate-700 dark:text-slate-300">No time entries for {isToday ? "today" : "this date"}.</p>
                                            {isToday && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Click the Clock In button above to begin tracking.</p>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {entryToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="p-6 text-center sm:text-left">
                            <div className="flex justify-center sm:justify-start mb-4">
                                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full text-red-600 dark:text-red-500">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Delete Time Entry</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">
                                Are you sure you want to delete this specific time tracking event? This action will completely remove it from the system and cannot be undone.
                            </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 rounded-b-xl border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setEntryToDelete(null)}
                                disabled={deleteEntryMutation.isPending}
                                className="w-full sm:w-auto px-4 py-2 font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 focus:outline-none disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={deleteEntryMutation.isPending}
                                className="w-full sm:w-auto px-4 py-2 font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deleteEntryMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Delete Entry
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Entry Modal */}
            {entryToEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-500">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Edit Time</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="editTime" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Time ({entryToEdit.direction === "enter" ? "Clocked In" : "Clocked Out"})
                                    </label>
                                    <input
                                        type="time"
                                        id="editTime"
                                        value={editFormTime}
                                        onChange={(e) => setEditFormTime(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 rounded-b-xl border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setEntryToEdit(null)}
                                disabled={editEntryMutation.isPending}
                                className="w-full sm:w-auto px-4 py-2 font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 focus:outline-none disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmEdit}
                                disabled={editEntryMutation.isPending}
                                className="w-full sm:w-auto px-4 py-2 font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {editEntryMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Map Modal */}
            {showMapModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <MapIcon className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                                Locations for {isToday ? "Today" : format(selectedDate, "MMM d, yyyy")}
                            </h3>
                            <button
                                onClick={() => setShowMapModal(false)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <MapComponent
                                locations={entries
                                    .filter(e => e.latitude && e.longitude)
                                    .map(e => ({
                                        lat: e.latitude!,
                                        lng: e.longitude!,
                                        label: `${format(new Date(e.entry_date), "HH:mm")} - ${e.direction === "enter" ? "Clocked In" : "Clocked Out"}`
                                    }))}
                            />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
