"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { components } from "@/lib/api/schema";
import { Plus, Pencil, Trash2, KeyRound, Loader2, X } from "lucide-react";

type UniqueUser = components["schemas"]["UniqueUser"];
type FullUser = components["schemas"]["FullUser"];
type User = components["schemas"]["User"];

export default function UsersTab() {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<UniqueUser | null>(null);
    const [userToDelete, setUserToDelete] = useState<UniqueUser | null>(null);
    const [userToPassword, setUserToPassword] = useState<UniqueUser | null>(null);

    const [formData, setFormData] = useState({
        username: "",
        name: "",
        mailAddress: "",
        password: ""
    });

    const { data: users, isLoading } = useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const { data, error } = await apiClient.GET("/users");
            if (error) throw new Error("Failed to fetch users");
            // The backend returns { count, users } but the OpenAPI spec incorrectly states an array is returned directly
            return ((data as any)?.users || data || []) as UniqueUser[];
        }
    });

    const createMutation = useMutation({
        mutationFn: async (newUser: FullUser) => {
            const { error } = await apiClient.POST("/users", { body: newUser });
            if (error) throw new Error("Failed to create user");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setIsCreateModalOpen(false);
            resetForm();
        }
    });

    const editMutation = useMutation({
        mutationFn: async ({ id, user }: { id: string, user: User }) => {
            const { error } = await apiClient.PUT("/users/{id}", { 
                params: { path: { id } },
                body: user 
            });
            if (error) throw new Error("Failed to update user");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setUserToEdit(null);
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await apiClient.DELETE("/users/{id}", { 
                params: { path: { id } } 
            });
            if (error) throw new Error("Failed to delete user");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setUserToDelete(null);
        }
    });

    const passwordMutation = useMutation({
        mutationFn: async ({ id, password }: { id: string, password: string }) => {
            const { error } = await apiClient.PUT("/users/{id}/password", { 
                params: { path: { id } },
                body: { password }
            });
            if (error) throw new Error("Failed to update password");
        },
        onSuccess: () => {
            setUserToPassword(null);
            resetForm();
        }
    });

    const resetForm = () => {
        setFormData({ username: "", name: "", mailAddress: "", password: "" });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData as FullUser);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userToEdit && userToEdit.id) {
            editMutation.mutate({ 
                id: userToEdit.id, 
                user: {
                    username: formData.username,
                    name: formData.name,
                    mailAddress: formData.mailAddress
                }
            });
        }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userToPassword && userToPassword.id) {
            passwordMutation.mutate({ id: userToPassword.id, password: formData.password });
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">User Management</h2>
                <button
                    onClick={() => {
                        resetForm();
                        setIsCreateModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add User
                </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Username</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                        {Array.isArray(users) && users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-200">{user.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{user.mailAddress}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setFormData({ username: user.username || "", name: user.name || "", mailAddress: user.mailAddress || "", password: "" });
                                                setUserToEdit(user);
                                            }}
                                            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                            title="Edit User"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFormData({ ...formData, password: "" });
                                                setUserToPassword(user);
                                            }}
                                            className="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 p-2 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                                            title="Set Password"
                                        >
                                            <KeyRound className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setUserToDelete(user)}
                                            className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                            title="Delete User"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {(!Array.isArray(users) || users.length === 0) && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                                    No users found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create User Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Create New User</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSubmit}>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                                    <input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                                    <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                    <input type="email" required value={formData.mailAddress} onChange={e => setFormData({ ...formData, mailAddress: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                                    <input type="password" required minLength={5} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                                    {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {userToEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Edit User</h3>
                            <button onClick={() => setUserToEdit(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                                    <input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                                    <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                    <input type="email" required value={formData.mailAddress} onChange={e => setFormData({ ...formData, mailAddress: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                                <button type="button" onClick={() => setUserToEdit(null)} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                                <button type="submit" disabled={editMutation.isPending} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                                    {editMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Set Password Modal */}
            {userToPassword && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Set Password</h3>
                            <button onClick={() => setUserToPassword(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handlePasswordSubmit}>
                            <div className="p-4 space-y-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400">Enter a new password for <span className="font-semibold text-slate-800 dark:text-slate-200">{userToPassword.username}</span>.</p>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                                    <input type="password" required minLength={5} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                                <button type="button" onClick={() => setUserToPassword(null)} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                                <button type="submit" disabled={passwordMutation.isPending} className="px-4 py-2 text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
                                    {passwordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Set Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="p-6 text-center">
                            <div className="flex justify-center mb-4">
                                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full text-red-600 dark:text-red-500">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Delete User</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">
                                Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-200">{userToDelete.username}</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                            <button onClick={() => setUserToDelete(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50">Cancel</button>
                            <button onClick={() => userToDelete.id && deleteMutation.mutate(userToDelete.id)} disabled={deleteMutation.isPending} className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
