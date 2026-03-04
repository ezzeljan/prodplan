import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Trash2, Download, FolderOpen, Search, Calendar, AlertCircle } from 'lucide-react';
import { getPlans, deletePlan, SavedPlan } from '../utils/planStorage';
import { saveAs } from 'file-saver';

export default function ProductionPlanStorage() {
    const [plans, setPlans] = useState<SavedPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const data = await getPlans();
            setPlans(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (err) {
            console.error('Failed to load plans:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (plan: SavedPlan) => {
        const blob = new Blob([plan.buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, plan.fileName);
    };

    const handleDelete = async (id: string) => {
        await deletePlan(id);
        setPlans((prev) => prev.filter((p) => p.id !== id));
        setDeleteConfirm(null);
    };

    const filtered = plans.filter((p) =>
        p.projectName.toLowerCase().includes(search.toLowerCase()) ||
        p.fileName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 h-screen overflow-y-auto bg-[#f8f9fa] dark:bg-[#171717] transition-colors duration-300">
            <div className="max-w-4xl mx-auto px-6 py-10">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(4,98,65,0.12)' }}
                        >
                            <FileSpreadsheet className="w-5 h-5" style={{ color: '#046241' }} />
                        </div>
                        <h1 className="text-2xl font-bold text-[#133020] dark:text-white">
                            Production Plans
                        </h1>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 ml-[52px]">
                        All your generated Excel production plans stored here. Click to re-download anytime.
                    </p>
                </div>

                {/* Search */}
                {plans.length > 0 && (
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search plans..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#133020] dark:text-white placeholder-gray-400 outline-none focus:ring-2 text-sm transition-all"
                            style={{ '--tw-ring-color': 'rgba(4,98,65,0.3)' } as any}
                        />
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="w-8 h-8 rounded-full border-2 border-[#046241] border-t-transparent animate-spin" />
                    </div>
                ) : plans.length === 0 ? (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                            style={{ backgroundColor: 'rgba(4,98,65,0.08)' }}
                        >
                            <FolderOpen className="w-10 h-10" style={{ color: '#046241' }} />
                        </div>
                        <h3 className="text-lg font-semibold text-[#133020] dark:text-white mb-2">
                            No plans saved yet
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
                            Generate a production plan from the Home tab and it will automatically appear here for re-download.
                        </p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <AlertCircle className="w-8 h-8 text-gray-400 mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No plans match "<span className="font-medium">{search}</span>"
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Count */}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                            {filtered.length} plan{filtered.length !== 1 ? 's' : ''} found
                        </p>

                        {filtered.map((plan) => (
                            <div
                                key={plan.id}
                                className="group flex items-center gap-4 p-4 rounded-2xl border bg-white dark:bg-zinc-800/80 dark:border-zinc-700/50 hover:shadow-md transition-all duration-200"
                                style={{ borderColor: '#e5e0d5' }}
                            >
                                {/* Icon */}
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                                    style={{ backgroundColor: 'rgba(255,195,112,0.15)' }}
                                >
                                    <FileSpreadsheet className="w-6 h-6" style={{ color: '#046241' }} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-[#133020] dark:text-white truncate">
                                        {plan.projectName}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                        {plan.fileName}
                                    </p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <Calendar className="w-3 h-3 text-gray-400" />
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            {new Date(plan.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* Download */}
                                    <button
                                        onClick={() => handleDownload(plan)}
                                        className="p-2.5 rounded-xl transition-all hover:-translate-y-0.5 active:scale-95 text-white shadow-sm"
                                        style={{ backgroundColor: '#046241' }}
                                        title="Download"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>

                                    {/* Delete */}
                                    {deleteConfirm === plan.id ? (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleDelete(plan.id)}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeleteConfirm(plan.id)}
                                            className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Always-visible download on mobile */}
                                <button
                                    onClick={() => handleDownload(plan)}
                                    className="p-2.5 rounded-xl text-white shadow-sm md:hidden"
                                    style={{ backgroundColor: '#046241' }}
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}