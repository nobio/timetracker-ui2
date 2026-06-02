"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Settings, Save, Server, Database, Activity, Search, Loader2, ToggleLeft, Users } from "lucide-react";
import { components } from "@/lib/api/schema";
import { useState } from "react";
import UsersTab from "@/components/members/UsersTab";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

type Toggle = components["schemas"]["Toggle"] & { id?: string, _id?: string };

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<"toggles" | "server" | "members">("toggles");

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
                <Settings className="w-8 h-8 text-blue-600 dark:text-blue-500" />
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Administration Settings</h1>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800">
                <nav className="flex space-x-8" aria-label="Tabs">
                    {[
                        { id: "toggles", label: "Toggles", icon: ToggleLeft },
                        { id: "server", label: "Server", icon: Server },
                        { id: "members", label: "Users", icon: Users },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                ? "border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-500"
                                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
                                }`}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {actionMessage && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${actionMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50'}`}>
                    {actionMessage.type === 'success' ? <Save className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                    <span>{actionMessage.text}</span>
                </div>
            )}

            <div className="min-h-[400px]">
                {/* System Toggles */}
                {activeTab === "toggles" && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden max-w-3xl">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">System Notification Toggles</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Enable or disable various system-wide notifications and behavioral flags.</p>
                            <div className="mt-4 flex justify-start">
                                <ThemeSwitcher />
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {toggles?.map((toggle) => (
                                <div key={toggle.name} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <label htmlFor={`toggle-${toggle.name}`} className="flex-1 cursor-pointer">
                                        <div className="font-medium text-slate-700 dark:text-slate-200">{toggle.name}</div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">Toggle state for {toggle.name} flag</div>
                                    </label>
                                    <div className="ml-4 flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`toggle-${toggle.name}`}
                                            className="w-5 h-5 text-blue-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-blue-500 transition-all cursor-pointer"
                                            checked={toggle.toggle as any === true || toggle.toggle === "true"}
                                            onChange={(e) => handleToggleChange(toggle, e.target.checked)}
                                            disabled={updateToggleMutation.isPending}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Admin Actions */}
                {activeTab === "server" && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden max-w-3xl">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Server Administration</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Trigger manual data processing, recalculations, and backups.</p>
                        </div>
                        <div className="p-4 space-y-4">
                            <button
                                onClick={() => triggerAction.mutate('stats')}
                                disabled={triggerAction.isPending}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group disabled:opacity-50"
                            >
                                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-3 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-800 dark:text-slate-100">Recalculate Statistics</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">Force the server to compute new busy time statistics</div>
                                </div>
                            </button>

                            <button
                                onClick={() => triggerAction.mutate('evaluate')}
                                disabled={triggerAction.isPending}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left group disabled:opacity-50"
                            >
                                <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-3 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                    <Search className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-800 dark:text-slate-100">Evaluate Data</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">Check time entries for missing records and wrong order</div>
                                </div>
                            </button>

                            <button
                                onClick={() => triggerAction.mutate('dump')}
                                disabled={triggerAction.isPending}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-left group disabled:opacity-50"
                            >
                                <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    <Server className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-800 dark:text-slate-100">Dump Data to File System</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">Export the MongoDB dataset to the local container volume</div>
                                </div>
                            </button>

                            <button
                                onClick={() => triggerAction.mutate('backup')}
                                disabled={triggerAction.isPending}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-500 dark:hover:border-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all text-left group disabled:opacity-50"
                            >
                                <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-3 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                    <Database className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-800 dark:text-slate-100">Database Backup</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">Create a secure backup representation in the database</div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* User Administration */}
                {activeTab === "members" && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                        <UsersTab />
                    </div>
                )}
            </div>
        </div>
    );
}
