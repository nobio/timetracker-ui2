"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Settings, Save, Server, Database, Activity, Search, Loader2 } from "lucide-react";
import { components } from "@/lib/api/schema";
import { useState } from "react";

type Toggle = components["schemas"]["Toggle"] & { id?: string, _id?: string };

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const { data: toggles, isLoading } = useQuery({
        queryKey: ["toggles"],
        queryFn: async () => {
            const { data, error } = await apiClient.GET("/toggles");
            if (error) throw new Error("Failed to fetch toggles");
            return data as Toggle[];
        },
    });

    const updateToggleMutation = useMutation({
        mutationFn: async (toggle: Toggle) => {
            const { error } = await apiClient.PUT("/toggles/{id}", {
                params: { path: { id: toggle._id || toggle.id || "" } },
                body: toggle
            });
            if (error) throw new Error("Failed to update toggle");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["toggles"] });
        },
        onError: () => {
            showActionMessage("error", "Failed to update toggle");
        }
    });

    const triggerAction = useMutation({
        mutationFn: async (action: 'stats' | 'dump' | 'backup' | 'evaluate') => {
            let res;
            if (action === 'stats') {
                res = await apiClient.PUT("/stats");
            } else if (action === 'dump') {
                res = await apiClient.POST("/entries/dump");
            } else if (action === 'backup') {
                res = await apiClient.POST("/entries/backup");
            } else if (action === 'evaluate') {
                res = await apiClient.POST("/entries/error/evaluate");
            }
            if (res?.error) throw new Error(res.error as string);
            return res?.data;
        },
        onSuccess: (data: any) => {
            showActionMessage("success", data?.message || data?.size ? `${data.size || ''} items processed. ${data.message || ''}` : "Action completed successfully");
        },
        onError: (e) => {
            showActionMessage("error", "Action failed: " + e.message);
        }
    });

    const showActionMessage = (type: 'success' | 'error', text: string) => {
        setActionMessage({ type, text });
        setTimeout(() => setActionMessage(null), 3000);
    };

    const handleToggleChange = (toggle: Toggle, newValue: boolean) => {
        updateToggleMutation.mutate({ ...toggle, toggle: newValue as any });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-slate-800">Administration Settings</h1>
            </div>

            {actionMessage && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${actionMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {actionMessage.type === 'success' ? <Save className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                    <span>{actionMessage.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Toggles */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="text-lg font-semibold text-slate-800">System Notification Toggles</h2>
                        <p className="text-sm text-slate-500">Enable or disable various system-wide notifications and behavioral flags.</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {toggles?.map((toggle) => (
                            <div key={toggle.name} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                <label htmlFor={`toggle-${toggle.name}`} className="flex-1 cursor-pointer">
                                    <div className="font-medium text-slate-700">{toggle.name}</div>
                                    <div className="text-sm text-slate-500">Toggle state for {toggle.name} flag</div>
                                </label>
                                <div className="ml-4 flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`toggle-${toggle.name}`}
                                        className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 transition-all cursor-pointer"
                                        checked={toggle.toggle as any === true || toggle.toggle === "true"}
                                        onChange={(e) => handleToggleChange(toggle, e.target.checked)}
                                        disabled={updateToggleMutation.isPending}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Admin Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="text-lg font-semibold text-slate-800">Server Administration</h2>
                        <p className="text-sm text-slate-500">Trigger manual data processing, recalculations, and backups.</p>
                    </div>
                    <div className="p-4 space-y-4">
                        <button
                            onClick={() => triggerAction.mutate('stats')}
                            disabled={triggerAction.isPending}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group disabled:opacity-50"
                        >
                            <div className="bg-blue-100 text-blue-600 p-3 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-semibold text-slate-800">Recalculate Statistics</div>
                                <div className="text-sm text-slate-500">Force the server to compute new busy time statistics</div>
                            </div>
                        </button>

                        <button
                            onClick={() => triggerAction.mutate('evaluate')}
                            disabled={triggerAction.isPending}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left group disabled:opacity-50"
                        >
                            <div className="bg-purple-100 text-purple-600 p-3 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <Search className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-semibold text-slate-800">Evaluate Data</div>
                                <div className="text-sm text-slate-500">Check time entries for missing records and wrong order</div>
                            </div>
                        </button>

                        <button
                            onClick={() => triggerAction.mutate('dump')}
                            disabled={triggerAction.isPending}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group disabled:opacity-50"
                        >
                            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <Server className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-semibold text-slate-800">Dump Data to File System</div>
                                <div className="text-sm text-slate-500">Export the MongoDB dataset to the local container volume</div>
                            </div>
                        </button>

                        <button
                            onClick={() => triggerAction.mutate('backup')}
                            disabled={triggerAction.isPending}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-rose-500 hover:bg-rose-50 transition-all text-left group disabled:opacity-50"
                        >
                            <div className="bg-rose-100 text-rose-600 p-3 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                <Database className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-semibold text-slate-800">Database Backup</div>
                                <div className="text-sm text-slate-500">Create a secure backup representation in the database</div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
