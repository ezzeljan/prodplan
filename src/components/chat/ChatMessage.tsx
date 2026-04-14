import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Bot,
    User as UserIcon,
    FileSpreadsheet,
    Download,
    Check,
    X,
    Table,
} from "lucide-react";
import { Message } from "../../types/production";

interface ChatMessageProps {
    msg: Message;
    isDark: boolean;
    isStreaming?: boolean;
    confirmedMsgIds?: Set<string>;
    rejectedMsgIds?: Set<string>;
    onConfirm?: (msgId: string) => void;
    onReject?: (msgId: string) => void;
    onDownload?: (fileName: string, buffer: any) => void;
    onViewProject?: (projectId: string) => void;
    lastSavedProjectId?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
    msg,
    isDark,
    isStreaming,
    confirmedMsgIds,
    rejectedMsgIds,
    onConfirm,
    onReject,
    onDownload,
    onViewProject,
    lastSavedProjectId,
}) => {
    const isAgent = msg.role === "agent";
    const isConfirmed = confirmedMsgIds?.has(msg.id);
    const isRejected = rejectedMsgIds?.has(msg.id);

    const isTableProposal = (content: string) => {
        return (
            content.includes("DailyProductionTable") ||
            content.includes("Does this structure look good") ||
            content.includes("Does this proposed structure") ||
            (content.includes("confirm") && content.includes("Excel"))
        );
    };

    return (
        <div className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white"
                style={{
                    backgroundColor: msg.role === "agent" ? "#046241" : "#133020",
                }}
            >
                {msg.role === "agent" ? (
                    <Bot className="w-5 h-5" />
                ) : (
                    <UserIcon className="w-5 h-5" />
                )}
            </div>

            {/* Bubble + buttons */}
            <div className="max-w-[80%] space-y-2">
                {/* Message bubble */}
                <div
                    className="p-4 shadow-sm"
                    style={
                        msg.role === "agent"
                            ? {
                                backgroundColor: isDark ? "#27272a" : "#ffffff",
                                color: isDark ? "#f4f4f5" : "#133020",
                                borderRadius: "0 1rem 1rem 1rem",
                                border: isDark ? "1px solid #3f3f46" : "1px solid #e5e0d5",
                            }
                            : {
                                backgroundColor: "#133020",
                                color: "#ffffff",
                                borderRadius: "1rem 0 1rem 1rem",
                            }
                    }
                >
                    <div
                        className={`leading-relaxed prose prose-sm max-w-none ${isDark ? "prose-invert text-gray-200" : ""
                            }`}
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
                                strong: ({ children }: any) => (
                                    <strong className="font-semibold">{children}</strong>
                                ),
                                ul: ({ children }: any) => (
                                    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                                ),
                                ol: ({ children }: any) => (
                                    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                                ),
                                li: ({ children }: any) => <li className="text-sm">{children}</li>,
                                code: ({ children }: any) => (
                                    <code
                                        className="px-1 rounded text-xs font-mono"
                                        style={{
                                            backgroundColor: isDark ? "#3f3f46" : "#F9F7F7",
                                            color: isDark ? "#e4e4e7" : "#133020",
                                        }}
                                    >
                                        {children}
                                    </code>
                                ),
                                table: ({ children }: any) => (
                                    <div
                                        className="overflow-x-auto my-3 rounded-xl border"
                                        style={{ borderColor: isDark ? "#3f3f46" : "#e5e0d5" }}
                                    >
                                        <table className="w-full text-xs border-collapse">{children}</table>
                                    </div>
                                ),
                                thead: ({ children }: any) => (
                                    <thead style={{ backgroundColor: "#046241" }}>{children}</thead>
                                ),
                                th: ({ children }: any) => (
                                    <th className="px-3 py-2 text-left font-bold text-white whitespace-nowrap border-r border-white/20 last:border-r-0">
                                        {children}
                                    </th>
                                ),
                                tbody: ({ children }: any) => <tbody>{children}</tbody>,
                                tr: ({ children }: any) => (
                                    <tr
                                        className="border-t"
                                        style={{ borderColor: isDark ? "#3f3f46" : "#e5e0d5" }}
                                    >
                                        {children}
                                    </tr>
                                ),
                                td: ({ children }: any) => (
                                    <td
                                        className="px-3 py-2 border-r last:border-r-0"
                                        style={{
                                            borderColor: isDark ? "#3f3f46" : "#e5e0d5",
                                            color: isDark ? "#d4d4d8" : "#133020",
                                        }}
                                    >
                                        {children}
                                    </td>
                                ),
                            }}
                        >
                            {msg.content || ""}
                        </ReactMarkdown>
                    </div>

                    {/* Structure confirmation buttons */}
                    {isAgent &&
                        isTableProposal(msg.content || "") &&
                        !isStreaming &&
                        !isConfirmed &&
                        !isRejected && (
                            <div className="mt-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <button
                                    onClick={() => onConfirm?.(msg.id)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#046241] text-white text-[13px] font-semibold hover:bg-[#133020] transition-colors shadow-sm"
                                >
                                    <Check className="w-4 h-4" />
                                    Looks good, generate file
                                </button>
                                <button
                                    onClick={() => onReject?.(msg.id)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e5e0d5] bg-white text-[#133020] text-[13px] font-medium hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    <X className="w-4 h-4 text-red-500" />
                                    Modify structure
                                </button>
                            </div>
                        )}

                    {/* Inline Attachment (Images/Files) */}
                    {msg.attachment && (
                        <div className="mt-3 space-y-2">
                            {msg.attachment.type.startsWith("image/") ? (
                                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                                    <img
                                        src={msg.attachment.data}
                                        alt={msg.attachment.name}
                                        className="max-w-full h-auto max-h-64 object-contain mx-auto"
                                    />
                                </div>
                            ) : (
                                <div
                                    className={`flex items-center gap-3 p-3 rounded-xl border ${msg.role === "user" ? "bg-white/10 border-white/20 text-white" : "bg-gray-50 dark:bg-zinc-800 border-gray-100 dark:border-zinc-700 text-gray-700 dark:text-gray-300"}`}
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${msg.role === "user" ? "bg-white/20" : "bg-white dark:bg-zinc-700 shadow-sm text-[#046241]"}`}>
                                        <FileSpreadsheet className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-bold truncate">{msg.attachment.name}</p>
                                        <p className="text-[10px] uppercase font-black tracking-wider opacity-60">
                                            Attachment
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Action button for Generated Files */}
                {msg.type === "file" && msg.fileData && !isStreaming && (
                    <div className="space-y-2">
                        {/* Download button — disabled if buffer was lost after a page refresh */}
                        <button
                            onClick={() => {
                                if (msg.fileData!.buffer) {
                                    onDownload?.(msg.fileData!.name, msg.fileData!.buffer);
                                }
                            }}
                            disabled={!msg.fileData.buffer}
                            className="flex items-center gap-3 p-4 rounded-xl w-full transition-opacity text-left"
                            style={{
                                backgroundColor: msg.fileData.buffer ? "#FFC370" : "#d4a853",
                                border: "1px solid #FFB347",
                                opacity: msg.fileData.buffer ? 1 : 0.55,
                                cursor: msg.fileData.buffer ? "pointer" : "not-allowed",
                            }}
                        >
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
                            >
                                <FileSpreadsheet className="w-6 h-6" style={{ color: "#133020" }} />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-sm" style={{ color: "#133020" }}>
                                    {msg.fileData.name}
                                </p>
                                <p className="text-xs" style={{ color: "#046241" }}>
                                    {msg.fileData.buffer ? "Click to download" : "File download unavailable after refresh — use View in Spreadsheet"}
                                </p>
                            </div>
                            <Download className="w-5 h-5 shrink-0" style={{ color: "#133020" }} />
                        </button>

                        {lastSavedProjectId && (
                            <button
                                onClick={() => onViewProject?.(lastSavedProjectId)}
                                className="flex items-center gap-3 p-3 rounded-xl w-full transition-all text-left hover:opacity-90 bg-[#046241] border border-white/15"
                            >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/15">
                                    <Table className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm text-white">
                                        View in Spreadsheet
                                    </p>
                                    <p className="text-[11px] text-white/70">
                                        Open in the editable web spreadsheet
                                    </p>
                                </div>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatMessage;