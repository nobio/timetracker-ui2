"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { format, isSameDay, addDays, subDays } from "date-fns";
import { Clock, Play, Square, Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2, Pencil, Map as MapIcon, X } from "lucide-react";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("@/components/Map"), {
    ssr: false,
});
import { components } from "@/lib/api/schema";
import { useState } from "react";

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

    const { data: allEntries, isLoading: isLoadingEntries, error: entriesError } = useQuery({
        queryKey: ["entries"],
        queryFn: async () => {
            const { data, error } = await apiClient.GET("/entries");
            if (error) throw new Error("Failed to fetch entries");
            return data as TimeEntry[];
        },
    });

    const { data: busyStats, isLoading: isLoadingStats } = useQuery({
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

    if (entriesError) {
        return (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                Error loading entries. Please try again.
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

    const isToday = isSameDay(selectedDate, new Date());

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-800">Time Entries</h1>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setShowMapModal(true)}
                        disabled={!hasLocation}
                        className={`flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center font-medium shadow-sm ${!hasLocation ? "opacity-50 cursor-not-allowed" : ""}`}
                        title={hasLocation ? "Show locations on map" : "No location data for this date"}
                    >
                        <MapIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Map</span>
                    </button>
                    <button
                        onClick={handleToggleTimer}
                        disabled={createEntryMutation.isPending}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors w-full sm:w-auto justify-center font-medium shadow-sm disabled:opacity-50 ${isWorking
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                    >
                        {createEntryMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isWorking ? (
                            <Square className="w-4 h-4" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                        {isWorking ? "Clock Out" : "Clock In"}
                    </button>
                </div>
            </div>

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-500 mb-1">Total (Gesamt)</p>
                    <p className="text-2xl font-bold text-slate-800">{formatMsToHoursMinutes(busyStats?.duration || 0)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-500 mb-1">Work (Arbeit)</p>
                    <p className="text-2xl font-bold text-blue-600">{formatMsToHoursMinutes(busyStats?.busytime || 0)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-500 mb-1">Pause</p>
                    <p className="text-2xl font-bold text-amber-500">{formatMsToHoursMinutes(busyStats?.pause || 0)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-500 mb-1">End (Predicted)</p>
                    <p className="text-2xl font-bold text-slate-800">{predictedEnd}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Date Navigation Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <button
                        onClick={() => setSelectedDate(prev => subDays(prev, 1))}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 font-medium text-slate-700">
                        <div
                            className="relative p-2 -m-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
                            title="Select a specific date"
                        >
                            <CalendarIcon className="w-5 h-5 text-blue-600 group-hover:text-blue-700 transition-colors" />
                            <input
                                type="date"
                                value={format(selectedDate, "yyyy-MM-dd")}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        // Parse the local date string safely
                                        const [year, month, day] = e.target.value.split('-').map(Number);
                                        setSelectedDate(new Date(year, month - 1, day));
                                    }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                        <button
                            onClick={() => setSelectedDate(new Date())}
                            className={`transition-colors ${isToday ? "cursor-default text-slate-800" : "hover:text-blue-600 cursor-pointer"}`}
                            title={isToday ? "" : "Return to Today"}
                        >
                            {isToday ? "Today" : format(selectedDate, "EEEE, MMMM d, yyyy")}
                        </button>
                    </div>

                    <button
                        onClick={() => setSelectedDate(prev => addDays(prev, 1))}
                        className="p-2 rounded-lg transition-colors text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Mobile View: Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                    {[...entries].sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()).map((entry) => (
                        <div key={entry._id || entry.entry_date} className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-medium text-slate-800">
                                        {entry.direction === "enter" ? "Clocked In" : "Clocked Out"}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        {format(new Date(entry.entry_date), "MMM d, yyyy")}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${entry.direction === "enter"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-800"
                                        }`}>
                                        {entry.direction}
                                    </span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => triggerEdit(entry)}
                                            className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-50"
                                            title="Edit Entry"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => triggerDelete(entry._id)}
                                            disabled={deleteEntryMutation.isPending}
                                            className="text-red-400 hover:text-red-600 transition-colors p-1 -mr-1 rounded-full hover:bg-red-50 disabled:opacity-50"
                                            title="Delete Entry"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600 text-sm">
                                <Clock className="w-4 h-4" />
                                {format(new Date(entry.entry_date), "HH:mm")}
                            </div>
                        </div>
                    ))}
                    {entries.length === 0 && (
                        <div className="p-12 flex flex-col items-center justify-center text-slate-500 space-y-3">
                            <div className="bg-slate-100 p-3 rounded-full">
                                <CalendarIcon className="w-6 h-6 text-slate-400" />
                            </div>
                            <p>No time entries for {isToday ? "today" : "this date"}.</p>
                        </div>
                    )}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Time
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {[...entries].sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()).map((entry) => (
                                <tr key={entry._id || entry.entry_date} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-medium">
                                        {format(new Date(entry.entry_date), "MMM d, yyyy")}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        {format(new Date(entry.entry_date), "HH:mm")}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${entry.direction === "enter"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-amber-100 text-amber-800"
                                            }`}>
                                            {entry.direction}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => triggerEdit(entry)}
                                                className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50"
                                                title="Edit Entry"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => triggerDelete(entry._id)}
                                                disabled={deleteEntryMutation.isPending}
                                                className="text-red-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50 disabled:opacity-50"
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
                                    <td colSpan={4} className="px-6 py-16 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="bg-slate-50 p-3 rounded-full">
                                                <CalendarIcon className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-base text-slate-600">No time entries for {isToday ? "today" : "this date"}.</p>
                                            {isToday && (
                                                <p className="text-sm text-slate-500">Click the Start Timer button above to begin tracking.</p>
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
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 text-center sm:text-left">
                            <div className="flex justify-center sm:justify-start mb-4">
                                <div className="bg-red-100 p-3 rounded-full text-red-600">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Time Entry</h3>
                            <p className="text-slate-600 text-sm">
                                Are you sure you want to delete this specific time tracking event? This action will completely remove it from the system and cannot be undone.
                            </p>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 rounded-b-xl border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setEntryToDelete(null)}
                                disabled={deleteEntryMutation.isPending}
                                className="w-full sm:w-auto px-4 py-2 font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors focus:ring-2 focus:ring-slate-200 focus:outline-none disabled:opacity-50"
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
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Edit Time</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="editTime" className="block text-sm font-medium text-slate-700 mb-1">
                                        Time ({entryToEdit.direction === "enter" ? "Clocked In" : "Clocked Out"})
                                    </label>
                                    <input
                                        type="time"
                                        id="editTime"
                                        value={editFormTime}
                                        onChange={(e) => setEditFormTime(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 rounded-b-xl border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setEntryToEdit(null)}
                                disabled={editEntryMutation.isPending}
                                className="w-full sm:w-auto px-4 py-2 font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors focus:ring-2 focus:ring-slate-200 focus:outline-none disabled:opacity-50"
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
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <MapIcon className="w-5 h-5 text-blue-600" />
                                Locations for {isToday ? "Today" : format(selectedDate, "MMM d, yyyy")}
                            </h3>
                            <button
                                onClick={() => setShowMapModal(false)}
                                className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-full hover:bg-slate-100"
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
