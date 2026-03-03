import React, { useState } from 'react';
import { ProjectData } from '../types/production';
import { Edit2, Check, FileSpreadsheet, X, Plus, Trash2 } from 'lucide-react';

interface PlanPreviewProps {
    initialData: ProjectData;
    onGenerate: (data: ProjectData) => void;
    isDark: boolean;
}

export default function PlanPreview({ initialData, onGenerate, isDark }: PlanPreviewProps) {
    const [data, setData] = useState<ProjectData>(initialData);
    const [isEditing, setIsEditing] = useState(false);

    const handleBasicChange = (field: keyof ProjectData, value: string | number) => {
        setData((prev) => ({ ...prev, [field]: value }));
    };

    const handleResourceAdd = () => {
        setData((prev) => ({ ...prev, resources: [...prev.resources, 'New Resource'] }));
    };

    const handleResourceChange = (index: number, value: string) => {
        const newResources = [...data.resources];
        newResources[index] = value;
        setData((prev) => ({ ...prev, resources: newResources }));
    };

    const handleResourceRemove = (index: number) => {
        setData((prev) => ({
            ...prev,
            resources: prev.resources.filter((_, i) => i !== index),
        }));
    };

    return (
        <div className={`w-full rounded-2xl border ${isDark ? 'bg-zinc-800/50 border-white/10 text-gray-200' : 'bg-white border-gray-200 text-gray-800'} overflow-hidden shadow-sm`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-white/10 bg-zinc-800' : 'border-gray-100 bg-gray-50'}`}>
                <h3 className="font-semibold flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                    Plan Structure Preview
                </h3>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isEditing
                        ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                        : (isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300')
                        }`}
                >
                    {isEditing ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    {isEditing ? 'Done Editing' : 'Edit Structure'}
                </button>
            </div>

            <div className="p-5 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <h4 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Project Name" isEditing={isEditing} isDark={isDark}>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => handleBasicChange('name', e.target.value)}
                                    className={inputClasses(isDark)}
                                />
                            ) : (
                                <p className="font-medium">{data.name}</p>
                            )}
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Goal" isEditing={isEditing} isDark={isDark}>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={data.goal}
                                        onChange={(e) => handleBasicChange('goal', Number(e.target.value))}
                                        className={inputClasses(isDark)}
                                    />
                                ) : (
                                    <p className="font-medium">{data.goal}</p>
                                )}
                            </Field>
                            <Field label="Unit" isEditing={isEditing} isDark={isDark}>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={data.unit}
                                        onChange={(e) => handleBasicChange('unit', e.target.value)}
                                        className={inputClasses(isDark)}
                                    />
                                ) : (
                                    <p className="font-medium">{data.unit}</p>
                                )}
                            </Field>
                        </div>
                        <Field label="Start Date" isEditing={isEditing} isDark={isDark}>
                            {isEditing ? (
                                <input
                                    type="date"
                                    value={data.startDate}
                                    onChange={(e) => handleBasicChange('startDate', e.target.value)}
                                    className={inputClasses(isDark)}
                                />
                            ) : (
                                <p className="font-medium">{data.startDate}</p>
                            )}
                        </Field>
                        <Field label="End Date" isEditing={isEditing} isDark={isDark}>
                            {isEditing ? (
                                <input
                                    type="date"
                                    value={data.endDate}
                                    onChange={(e) => handleBasicChange('endDate', e.target.value)}
                                    className={inputClasses(isDark)}
                                />
                            ) : (
                                <p className="font-medium">{data.endDate}</p>
                            )}
                        </Field>
                    </div>
                </div>

                {/* Resources */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Resources / Teams</h4>
                        {isEditing && (
                            <button onClick={handleResourceAdd} className="text-emerald-500 hover:text-emerald-400 p-1 flex items-center text-sm gap-1">
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {data.resources.map((res, idx) => (
                            <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'}`}>
                                {isEditing ? (
                                    <>
                                        <input
                                            type="text"
                                            value={res}
                                            onChange={(e) => handleResourceChange(idx, e.target.value)}
                                            className={`bg-transparent outline-none w-24 text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                                        />
                                        <button onClick={() => handleResourceRemove(idx)} className="text-red-400 hover:text-red-500">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-sm font-medium">{res}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Columns Preview (Read Only for brevity, too complex to build full builder inline) */}
                {!isEditing && (
                    <div className="space-y-2 pt-2">
                        <h4 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Plan Columns</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {data.columns.map((col, idx) => (
                                <span key={idx} className={`text-xs px-2 py-1 rounded bg-opacity-20 border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                                    {col.header}
                                </span>
                            ))}
                            <span className={`text-xs px-2 py-1 rounded border border-dashed ${isDark ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'}`}>
                                + {data.dailyColumns.length} daily metrics
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className={`p-4 border-t flex justify-end ${isDark ? 'border-white/10 bg-zinc-800/80' : 'border-gray-100 bg-gray-50'}`}>
                <button
                    onClick={() => onGenerate(data)}
                    disabled={isEditing}
                    className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${isEditing
                        ? 'opacity-50 cursor-not-allowed bg-gray-500 text-white'
                        : 'bg-[#046241] hover:bg-[#034d33] text-white shadow-md hover:shadow-lg'
                        }`}
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Generate Excel Plan
                </button>
            </div>
        </div>
    );
}

// Helpers
function Field({ label, children, isEditing, isDark }: { label: string, children: React.ReactNode, isEditing: boolean, isDark: boolean }) {
    return (
        <div className={`p-3 rounded-xl border transition-colors ${isEditing ? (isDark ? 'border-emerald-500/30' : 'border-emerald-200') : 'border-transparent'}`}>
            <span className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
            {children}
        </div>
    );
}

function inputClasses(isDark: boolean) {
    return `w-full bg-transparent border-b outline-none pb-1 focus:border-emerald-500 ${isDark ? 'border-zinc-600 text-white' : 'border-gray-300 text-gray-900'}`;
}
