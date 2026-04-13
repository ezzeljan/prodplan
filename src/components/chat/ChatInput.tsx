import React, { useRef, useEffect } from "react";
import { Paperclip, Send, X } from "lucide-react";

interface ChatInputProps {
    inputValue: string;
    setInputValue: (val: string) => void;
    onSend: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isTyping: boolean;
    isStreaming: boolean;
    fileName: string | null;
    currentFile: any;
    onRemoveFile: () => void;
    isDark: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

const ChatInput: React.FC<ChatInputProps> = ({
    inputValue,
    setInputValue,
    onSend,
    onFileUpload,
    isTyping,
    isStreaming,
    fileName,
    currentFile,
    onRemoveFile,
    isDark,
    textareaRef,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canSend = (inputValue.trim() || currentFile) && !isTyping && !isStreaming;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div
            className={`w-full max-w-5xl p-2 rounded-3xl space-y-3 backdrop-blur-xl pointer-events-auto border transition-colors duration-300 ${isDark ? "bg-zinc-800/60 border-zinc-600" : "bg-white/50 border-[#e5e0d5] shadow-xl"
                }`}
        >
            {fileName && (
                <div
                    className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{
                        backgroundColor: isDark ? "#3f3f46" : "#ffffff",
                        border: "1px solid #FFC370",
                    }}
                >
                    <div
                        className="flex items-center gap-2 text-sm"
                        style={{ color: isDark ? "#fbbf24" : "#046241" }}
                    >
                        <Paperclip className="w-4 h-4" />
                        <span className="font-medium truncate max-w-50">{fileName}</span>
                    </div>
                    <button
                        onClick={onRemoveFile}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-red-500" />
                    </button>
                </div>
            )}

            <div className="flex gap-2 items-end">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileUpload}
                    className="hidden"
                    accept=".csv,.xlsx,.xls,image/*,application/pdf,.doc,.docx"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isTyping}
                    className={`p-3 rounded-2xl transition-all duration-200 ${isDark
                        ? "text-gray-400 hover:text-gray-100 hover:bg-zinc-700"
                        : "text-gray-500 hover:text-[#046241] hover:bg-[#F9F7F7]"
                        }`}
                    title="Upload file or images"
                >
                    <Paperclip className="w-[20px] h-[20px]" />
                </button>

                <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type project details or upload instructions..."
                    className={`flex-1 bg-transparent border-none focus:ring-0 text-[15px] py-3 px-1 resize-none max-h-48 custom-scrollbar transition-colors ${isDark ? "text-gray-100 placeholder-gray-500" : "text-[#133020] placeholder-[#4A5A66]"
                        }`}
                    disabled={isTyping}
                />

                <button
                    onClick={onSend}
                    disabled={!canSend}
                    data-send-btn
                    className={`p-3 rounded-2xl transition-all duration-300 shadow-sm transform active:scale-95 ${canSend
                        ? "bg-[#046241] text-white hover:bg-[#133020] shadow-md shadow-emerald-900/20"
                        : "bg-gray-200 dark:bg-zinc-700 text-gray-400 dark:text-zinc-500 cursor-not-allowed"
                        }`}
                >
                    <Send className="w-[20px] h-[20px]" />
                </button>
            </div>
        </div>
    );
};

export default ChatInput;
