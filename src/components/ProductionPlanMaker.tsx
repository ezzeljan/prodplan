// src/components/ProductionPlanMaker.tsx
// CHANGED: Removed all localStorage-based session logic.
// Chat threads and messages are now persisted in the DB via chatService.ts

import React, { useState, useEffect, useRef } from "react";
import { saveAs } from "file-saver";
import { useSearchParams, Navigate } from "react-router-dom";
import {
  Bot, Plus, Download, User as UserIcon, FileSpreadsheet, Loader2,
  Paperclip, Send, X, FileText, Table, Sun, Moon,
} from "lucide-react";
import OpenAI from "openai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { savePlan } from "../utils/planStorage";

import { Message, ProjectData, ActualDataItem, FileAttachment } from "../types/production";
import { generateExcelFile } from "../utils/excelGenerator";
import { handleFileProcessing } from "../utils/fileHandlers";

// NEW: DB-based chat service (replaces loadSessions/saveSessions)
import {
  getOrCreateThread,
  saveMessage,
  deleteThread,
  deleteAllThreads,
  dbMessageToFrontend,
  type DBThread,
} from "../utils/chatService";

import ChatHistorySidebar, {
  type ChatSession,
  dbThreadToChatSession,
} from "./chat/ChatHistorySidebar";
import ProjectSetupView from "./chat/ProjectSetupView";
import ChatMessage from "./chat/ChatMessage";
import ChatInput from "./chat/ChatInput";
import FilePreview from "./chat/FilePreview";

import { useAISpreadsheet } from "../contexts/AISpreadsheetContext";
import { useAuth } from "../contexts/AuthContext";
import { useUser } from "../contexts/UserContext";
import { projectDataToSpreadsheet } from "../utils/spreadsheetConverter";
import { useNavigate } from "react-router-dom";
import { storage } from "../utils/storageProvider";
import type { UnifiedProject } from "../utils/projectStorage";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || "",
  dangerouslyAllowBrowser: true,
  defaultHeaders: {
    "HTTP-Referer": window.location.origin,
    "X-Title": "Production Plan Agent",
  },
});

// --- SYSTEM INSTRUCTION (updated with LPB model) ---
const SYSTEM_INSTRUCTION = `You are a professional Production Planning Assistant. 
          Your goal is to collect the following information from the user to generate an Excel production plan:
          1. Project Name
          2. Overall Goal (numeric value)
          3. Unit of measurement (e.g., units, hours, revenue)
          4. Start Date (YYYY-MM-DD)
          5. End Date (YYYY-MM-DD)
          6. List of Resources/Teams
          7. Preferred output cadence (per day/week/month or another custom period) exactly as described in their prompt.
          8. Project Overview (a short narrative describing the scope or purpose).
          9. Expected Output per operator (optional - if the user has a specific daily target per person).
          
          CURRENT DATE CONTEXT: Today's date is ${new Date().toLocaleDateString("en-CA")}. If the user uses relative dates like "today", "tomorrow", "yesterday", "next Monday", or "in 2 weeks", you MUST calculate and use the exact YYYY-MM-DD based on this current date.

          TARGET GENERATION:
          - If user provides a custom daily target per operator (e.g., "5 videos per day each"), use that as expectedOutputPerOperator.
          - If user wants automatic LPB (Learning-Performing-Breaking) model, set useLPBModel: true in the tool call.
          - The backend will calculate targets when targetData is not provided.

          PROJECT TIMELINE RULE:
          - A "Month" is strictly and explicitly defined as exactly 4 Weeks (28 days).
          - Do NOT use calendar weeks or calendar months.
          - Calculate weeks strictly from the start date: days 1-7 are "Week 1", days 8-14 are "Week 2", etc. (NEVER start from Week 0).
          - Use the exact formatting "Week X" in your tables and generated Excel structures. Always start counting from 1.
          
          The user may also provide 'actual' production data points (Date, Name, Actual value) directly in the chat or via file upload.
          If they provide it in text, extract it into the 'actualData' parameter.
          
          DYNAMIC SCHEMA ANALYSIS:
          Based on the project type and unit, you must suggest a set of columns for the production plan. 
          
          1. DAILY KEY COLUMNS: Define raw data tracked per resource per day. 
             - ALWAYS include EXACTLY 'Target' and 'Actual' as the column names and keys. DO NOT add units to the column name (e.g. use "Target", not "Target (Hours)").
             - Add others like 'Duration', 'Ops', or 'Variance'.
             - You can provide formulas for calculated fields (e.g., Variance: G{rowIndex}-F{rowIndex}).
          2. PLAN COLUMNS: Define daily summaries in the main plan (e.g., 'Total Target', 'Actual Ops').
          3. PIVOT COLUMNS: Define weekly aggregations (e.g., 'Total Actual', 'Avg Variance').
          4. DASHBOARD METRICS: Define high-level KPIs (e.g., 'Overall Goal', '% Completion').
          
          TABLE & COLUMN NAMES:
          - The raw data table is named 'DailyProductionTable'.
          - Base columns in 'DailyProductionTable' are: [Date (A), Name (B)].
          - Your 'dailyColumns' start at Column C (Index 3).
          - Use these names and letters EXACTLY in your formulas.
          
          WORKBOOK SHEET RULES:
          - Build four sheets in the workbook in this order: 1) "Daily Output of [Project Name]" for the raw data/overview, 2) "[Project Name] Production Plan" for the daily summaries, 3) "Pivot Tables" for aggregations, and 4) "Summary" to compare plan vs actual.
          - The first sheet must display a merged header reading "Daily Output of [Project Name]" above a two-column overview block.
          
          For every PLAN, PIVOT, and DASHBOARD item, you MUST provide an Excel formula that references the 'DailyProductionTable'.
          ALWAYS use the bracket syntax: 'DailyProductionTable[Column Name]'.
          
          Once you have the core project details (1-6), you MUST FIRST present the full architecture to the user using well-structured Markdown tables.
          
          CRITICAL: DO NOT call the 'generate_production_plan' tool immediately. You MUST present the tables and explicitly ask the user for confirmation.
          
          ONLY AFTER the user confirms the structure should you call the 'generate_production_plan' tool.
          
          IMPORTANT: You are a specialized Production Plan Agent. You must ONLY respond to queries related to production planning.
          
          When presenting table structures, you MUST format them as proper GitHub Flavored Markdown tables.`;

const getSystemInstruction = (projectName?: string, projectData?: Partial<ProjectData> | null) => {
  let base = SYSTEM_INSTRUCTION;
  if (projectName) {
    base += `\n\nCONTEXT: You are currently working ONLY for the project folder: "${projectName}". All your suggestions, plans, and technical architectures MUST be specifically for this project.`;
  }
  if (projectData?.resources && projectData.resources.length > 0) {
    base += `\n\nASSIGNED OPERATORS/RESOURCES: The following operators/resources are already assigned to this project: ${projectData.resources.join(", ")}. Use these as the primary resources/teams for the production plan.`;
  }
  return base;
};

// TOOLS array - generate_production_plan tool definition
const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "generate_production_plan",
      description: "Generate a detailed Excel production plan with daily targets, resources, and formulas. Creates a comprehensive spreadsheet with the specified project structure.",
      parameters: {
        type: "object",
        required: ["name", "goal", "unit", "startDate", "endDate", "resources", "dailyColumns"],
        properties: {
          name: {
            type: "string",
            description: "The name of the production plan/project"
          },
          goal: {
            type: "number",
            description: "The overall production goal (numeric value)"
          },
          unit: {
            type: "string",
            description: "Unit of measurement (e.g., 'units', 'hours', 'revenue')"
          },
          startDate: {
            type: "string",
            description: "Project start date in YYYY-MM-DD format"
          },
          endDate: {
            type: "string",
            description: "Project end date in YYYY-MM-DD format"
          },
          resources: {
            type: "array",
            items: { type: "string" },
            description: "List of resources/operators/teams working on this project"
          },
          overview: {
            type: "string",
            description: "Brief narrative describing the project scope or purpose"
          },
          expectedOutputPerOperator: {
            type: "string",
            description: "Custom expected output per operator (e.g., '10 units/day each'). Used for calculating daily targets if provided."
          },
          outputCadence: {
            type: "string",
            description: "Preferred output tracking period (e.g., 'per day', 'per week', 'per month')"
          },
          useLPBModel: {
            type: "boolean",
            description: "Whether to use the LPB (Learning-Performing-Breaking) model for target generation. Default: false."
          },
          dailyColumns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                header: { type: "string" },
                key: { type: "string" },
                formula: { type: "string" }
              },
              required: ["header", "key"]
            },
            description: "Daily tracking columns (e.g., {header: 'Target', key: 'target'}, {header: 'Actual', key: 'actual'}, {header: 'Variance', key: 'variance'})"
          },
          targetData: {
            type: "object",
            description: "OPTIONAL: Daily targets in format { 'YYYY-MM-DD': { resourceName: targetValue } }. If not provided, targets will be calculated automatically based on goal and resources."
          },
          actualData: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                name: { type: "string" },
                actual: { type: "number" }
              }
            },
            description: "Optional actual production data points"
          },
          columns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                header: { type: "string" },
                key: { type: "string" },
                section: { type: "string", enum: ["Target", "Actual", "Accumulative"] },
                formula: { type: "string" },
                width: { type: "number" }
              },
              required: ["header", "key", "section"]
            },
            description: "Column definitions for the main production plan"
          },
          pivotColumns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                header: { type: "string" },
                formula: { type: "string" }
              }
            },
            description: "Weekly aggregation columns"
          },
          dashboardMetrics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                formula: { type: "string" },
                value: { type: ["string", "number"] },
                format: { type: "string" }
              }
            },
            description: "High-level KPI metrics"
          }
        }
      }
    }
  }
];

export default function ProductionPlanMaker() {
  // ---- State ----
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploadedData, setUploadedData] = useState<ActualDataItem[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<FileAttachment | null>(null);
  const [currentProject, setCurrentProject] = useState<Partial<ProjectData> | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [confirmedMsgIds, setConfirmedMsgIds] = useState<Set<string>>(new Set());
  const [rejectedMsgIds, setRejectedMsgIds] = useState<Set<string>>(new Set());
  const [lastSavedProjectId, setLastSavedProjectId] = useState<string>("");
  const [isProjectStarted, setIsProjectStarted] = useState(() => {
    return !!new URLSearchParams(window.location.search).get("projectId");
  });
  const [currentProjectName, setCurrentProjectName] = useState("");

  // NEW: Active DB thread ID (number). Null when no project selected yet.
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  // NEW: Loading state for thread fetch
  const [threadLoading, setThreadLoading] = useState(false);

  const { setLastCreated } = useAISpreadsheet();
  const { authSession } = useAuth();
  const { isTeamLead } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---- Dark mode observer (unchanged) ----
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // ---- Auto-scroll to latest message ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ---- Sidebar toggle event listener ----
  useEffect(() => {
    const handleToggleHistory = () => setShowSidebar(v => !v);
    window.addEventListener("toggle-chat-history", handleToggleHistory);
    return () => window.removeEventListener("toggle-chat-history", handleToggleHistory);
  }, []);

  // ---- Cleanup streaming interval ----
  useEffect(() => {
    return () => { if (streamIntervalRef.current) clearInterval(streamIntervalRef.current); };
  }, []);

  // ---- Textarea auto-resize ----
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  /**
   * NEW: Load thread from DB when a projectId URL param is present.
   * This replaces the old localStorage session loading logic.
   */
  useEffect(() => {
    const paramProjectId = searchParams.get("projectId");
    if (!paramProjectId || !authSession) return;

    setIsProjectStarted(true);
    setLastSavedProjectId(paramProjectId);
    setThreadLoading(true);

    const load = async () => {
      try {
        // Load project name
        const projectData = await storage.getProject(paramProjectId);
        if (projectData) {
          setCurrentProjectName(projectData.name);
          setCurrentProject(projectData as Partial<ProjectData>);
        }

        // Fetch or create the DB thread for this project + team lead
        const thread = await getOrCreateThread(
          paramProjectId,
          authSession.id,
          authSession.email,
          authSession.pin
        );
        setActiveThreadId(thread.id);
        setActiveSessionId(String(thread.id));

        // Convert DB messages to frontend Message shape
        const frontendMessages = thread.messages.map(dbMessageToFrontend);
        setMessages(frontendMessages);

        // Put this thread into the sessions list for the sidebar
        const session = dbThreadToChatSession(thread);
        setSessions([session]);
      } catch (err) {
        console.error("Failed to load chat thread:", err);
      } finally {
        setThreadLoading(false);
      }
    };

    load();
  }, [searchParams, authSession]);

  /**
   * NEW: startNewSession — clears state, no more localStorage.
   * When a Team Lead picks a new project, handleStartProject is called instead.
   */
  const startNewSession = () => {
    setActiveSessionId(Date.now().toString());
    setActiveThreadId(null);
    setMessages([]);
    setIsProjectStarted(false);
    setLastSavedProjectId("");
    setCurrentProjectName("");
    setCurrentProject(null);
  };

  /**
   * NEW: Load a session from the sidebar click.
   * Fetches messages from the DB for that thread.
   */
  const loadSession = async (session: ChatSession) => {
    if (!authSession) return;
    setActiveSessionId(session.id);
    setShowSidebar(false);

    const threadId = Number(session.id);
    setActiveThreadId(threadId);

    if (session.projectId) {
      setLastSavedProjectId(session.projectId);
      setIsProjectStarted(true);
      setCurrentProjectName(session.projectName || "");

      // Fetch messages for this thread from DB
      try {
        const thread = await getOrCreateThread(
          session.projectId,
          authSession.id,
          authSession.email,
          authSession.pin
        );
        const frontendMessages = thread.messages.map(dbMessageToFrontend);
        setMessages(frontendMessages);
      } catch (err) {
        console.error("Failed to load thread messages:", err);
        setMessages([]);
      }
    } else {
      setIsProjectStarted(false);
      setLastSavedProjectId("");
      setMessages([]);
    }
  };

  /**
   * NEW: Delete a thread from the DB and remove from sidebar.
   */
  const handleDeleteSession = async (id: string) => {
    if (!authSession) return;
    try {
      await deleteThread(Number(id), authSession.email, authSession.pin);
    } catch (err) {
      console.error("Failed to delete thread:", err);
    }
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        if (updated.length > 0) loadSession(updated[updated.length - 1]);
        else startNewSession();
      }
      return updated;
    });
  };

  /**
   * NEW: Delete ALL threads for this team lead from the DB.
   */
  const handleDeleteAllSessions = async () => {
    if (!authSession) return;
    try {
      await deleteAllThreads(authSession.id, authSession.email, authSession.pin);
    } catch (err) {
      console.error("Failed to delete all threads:", err);
    }
    setSessions([]);
    startNewSession();
  };

  const handleNuclearReset = () => {
    if (confirm("This will permanently delete ALL data. Proceed?")) {
      handleDeleteAllSessions();
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  /**
   * NEW: handleStartProject — called by ProjectSetupView when TL picks a project.
   * Gets or creates a DB thread, loads existing messages.
   */
  const handleStartProject = async (projectName: string, projectId: string) => {
    if (!authSession) return;
    setCurrentProjectName(projectName);
    setLastSavedProjectId(projectId);
    setIsProjectStarted(true);
    setThreadLoading(true);

    try {
      const projectData = await storage.getProject(projectId);
      if (projectData) setCurrentProject(projectData as Partial<ProjectData>);

      // Get or create the DB thread
      const thread = await getOrCreateThread(
        projectId,
        authSession.id,
        authSession.email,
        authSession.pin
      );
      setActiveThreadId(thread.id);
      setActiveSessionId(String(thread.id));

      let frontendMessages = thread.messages.map(dbMessageToFrontend);

      // If brand new thread (no messages yet), add the greeting and save it
      if (frontendMessages.length === 0) {
        const greetingContent = `I'm now focused on **${projectName}**. \n\nPlease provide the project details (Goal, Dates, Resources, etc.) or upload an instruction file to begin building the plan.`;
        const initialMsg: Message = {
          id: Date.now().toString(),
          role: "agent",
          content: greetingContent,
        };
        frontendMessages = [initialMsg];
        setMessages(frontendMessages);

        // Persist the greeting to DB
        await saveMessage(thread.id, "agent", greetingContent, authSession.email, authSession.pin);
      } else {
        setMessages(frontendMessages);
      }

      // Update sidebar sessions list
      const session = dbThreadToChatSession(thread);
      setSessions(prev => {
        const exists = prev.find(s => s.id === String(thread.id));
        if (exists) return prev.map(s => s.id === String(thread.id) ? session : s);
        return [...prev, session];
      });
    } catch (err) {
      console.error("Failed to start project thread:", err);
    } finally {
      setThreadLoading(false);
    }
  };

  // ---- Streaming typewriter (unchanged) ----
  const typewriterEffect = (fullText: string, msgId: string) => {
    let i = 0;
    setIsStreaming(true);
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    streamIntervalRef.current = setInterval(() => {
      i += 5;
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullText.slice(0, i) } : m));
      if (i >= fullText.length) {
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
        setIsStreaming(false);
      }
    }, 5);
  };

  // ---- File processing (unchanged) ----
  const processFile = async (file: File) => {
    try {
      const processed = await handleFileProcessing(file);
      setFileName(processed.name!);
      if (processed.parsedData) setUploadedData(processed.parsedData);
      setCurrentFile(processed as FileAttachment);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error processing file.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    e.target.value = "";
  };

  const handleRemoveFile = () => {
    setFileName(null);
    setCurrentFile(null);
    setUploadedData(null);
    setPreviewImage(null);
  };

  // ---- Table proposal helpers (unchanged) ----
  const isTableProposal = (content: string) =>
    content.includes("DailyProductionTable") ||
    content.includes("Does this structure look good") ||
    content.includes("Does this proposed structure") ||
    (content.includes("confirm") && content.includes("Excel"));

  const handleConfirmStructure = (msgId: string) => {
    setConfirmedMsgIds(prev => new Set([...prev, msgId]));
    setRejectedMsgIds(prev => {
      const updated = new Set([...prev]);
      messages.forEach(m => { if (m.id !== msgId && isTableProposal(m.content)) updated.add(m.id); });
      return updated;
    });
    setInputValue("Yes, the structure looks good. Please generate the Excel file.");
    setTimeout(() => { document.querySelector<HTMLButtonElement>("[data-send-btn]")?.click(); }, 100);
  };

  const handleModifyStructure = (msgId: string) => {
    setRejectedMsgIds(prev => new Set([...prev, msgId]));
    setInputValue("I'd like to modify the structure. ");
    textareaRef.current?.focus();
  };

  /**
   * CHANGED: handleSend — now also saves each message to the DB.
   */
  const handleSend = async () => {
    if ((!inputValue.trim() && !currentFile) || isTyping || isStreaming) return;
    if (!authSession) return;

    const userContent = inputValue.trim();
    const attachment = currentFile
      ? { name: currentFile.name!, type: currentFile.type!, data: currentFile.data! }
      : undefined;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userContent || (attachment ? `[Attached: ${attachment.name}]` : ""),
      attachment,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");

    // NEW: Persist user message to DB
    if (activeThreadId) {
      saveMessage(
        activeThreadId,
        "user",
        userMsg.content,
        authSession.email,
        authSession.pin,
        { messageType: "text" }
      ).catch(err => console.error("Failed to save user message:", err));
    }

    handleRemoveFile();
    setIsTyping(true);

    try {
      // Build conversation history for OpenAI (unchanged logic)
      const history: OpenAI.ChatCompletionMessageParam[] = messages
        .filter(m => m.type !== "file" && m.type !== "preview")
        .map(m => ({
          role: m.role === "agent" ? "assistant" : "user" as const,
          content: m.content,
        })) as OpenAI.ChatCompletionMessageParam[];

      const userApiMsg: OpenAI.ChatCompletionMessageParam = {
        role: "user",
        content: attachment?.type?.startsWith("image/")
          ? [
              { type: "image_url", image_url: { url: attachment.data } } as any,
              ...(userContent ? [{ type: "text", text: userContent } as any] : []),
            ]
          : userContent || `[Attached file: ${attachment?.name}]`,
      };

      let response: OpenAI.Chat.Completions.ChatCompletion | null = null;
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        try {
          response = await openai.chat.completions.create({
            model: retries === 0 ? "google/gemini-2.0-flash-001" : "google/gemini-flash-1.5", 
            messages: [
              { role: "system", content: getSystemInstruction(currentProjectName, currentProject) } as OpenAI.ChatCompletionMessageParam,
              ...history,
              userApiMsg as OpenAI.ChatCompletionMessageParam,
            ] as OpenAI.ChatCompletionMessageParam[],
            tools: TOOLS,
            tool_choice: "auto",
            stream: false,
          });
          break; // success
        } catch (err: any) {
          if (retries < maxRetries && (err.message?.includes('fetch') || err.message?.includes('network'))) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            continue;
          }
          throw err;
        }
      }

      if (!response) {
        throw new Error("Failed to get response from AI model after retries.");
      }

      const choice = response.choices[0];
      setIsTyping(false);

      if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
        // Handle tool call (generate Excel) — unchanged logic
        const toolCall = choice.message.tool_calls[0] as any;
        const args = JSON.parse((toolCall as any).function.arguments);

        const thinkingId = Date.now().toString();
        const thinkingMsg: Message = { id: thinkingId, role: "agent", content: "⚙️ Generating your production plan..." };
        setMessages(prev => [...prev, thinkingMsg]);

        // Save "generating" placeholder to DB
        if (activeThreadId) {
          saveMessage(activeThreadId, "agent", thinkingMsg.content, authSession.email, authSession.pin)
            .catch(() => {});
        }

        try {
          const buffer = await generateExcelFile(args);
          const excelName = `${args.name || 'Production Plan'}.xlsx`;

          // Save spreadsheet to project
          const spreadsheetData = projectDataToSpreadsheet(args);
          if (lastSavedProjectId) {
            await storage.updateProjectSpreadsheet(
              lastSavedProjectId,
              { ...args, spreadsheetData, id: lastSavedProjectId, name: args.name } as any,
              authSession.email,
              authSession.pin
            );
            setLastCreated(lastSavedProjectId);
            savePlan(args);
          }

          const fileMsg: Message = {
            id: Date.now().toString(),
            role: "agent",
            content: `✅ Your production plan **${excelName}** is ready!`,
            type: "file",
            fileData: { name: excelName, buffer },
          };
          setMessages(prev => prev.map(m => m.id === thinkingId ? fileMsg : m));

          // Persist file message to DB (without binary buffer — just name)
          if (activeThreadId) {
            saveMessage(
              activeThreadId, "agent", fileMsg.content,
              authSession.email, authSession.pin,
              { messageType: "file", fileData: { name: excelName } }
            ).catch(() => {});
          }
        } catch (genErr) {
          const errMsg: Message = {
            id: Date.now().toString(),
            role: "agent",
            content: `❌ Failed to generate the Excel file. ${genErr instanceof Error ? genErr.message : ""}`,
          };
          setMessages(prev => prev.map(m => m.id === thinkingId ? errMsg : m));
          if (activeThreadId) {
            saveMessage(activeThreadId, "agent", errMsg.content, authSession.email, authSession.pin).catch(() => {});
          }
        }
      } else {
        // Normal text response — stream it with typewriter
        const agentContent = choice.message.content || "I'm not sure how to respond to that.";
        const agentMsgId = Date.now().toString();
        const agentMsg: Message = { id: agentMsgId, role: "agent", content: "" };
        setMessages(prev => [...prev, agentMsg]);
        typewriterEffect(agentContent, agentMsgId);

        // NEW: Persist agent reply to DB after typewriter completes
        if (activeThreadId) {
          saveMessage(
            activeThreadId, "agent", agentContent,
            authSession.email, authSession.pin
          ).catch(err => console.error("Failed to save agent message:", err));
        }
      }
    } catch (err) {
      setIsTyping(false);
      const errMsg: Message = {
        id: Date.now().toString(),
        role: "agent",
        content: "Sorry, I ran into an error. Please try again.",
      };
      setMessages(prev => [...prev, errMsg]);
      if (activeThreadId) {
        saveMessage(activeThreadId, "agent", errMsg.content, authSession.email, authSession.pin).catch(() => {});
      }
    }
  };

  // ---- Drag and drop (unchanged) ----
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await processFile(file);
  };

  // Guard: Admins should not access the chat interface
  const { isAdmin } = useUser();
  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Guard: Team Leads must pick a project first
  if (isTeamLead && !isProjectStarted && !searchParams.get("projectId")) {
    return (
      <ProjectSetupView
        onComplete={handleStartProject}
        onReset={handleNuclearReset}
      />
    );
  }

  return (
    <div
      className={`flex flex-col h-full relative transition-colors duration-300 ${isDark ? "bg-zinc-900" : "bg-[#F9F7F7]"}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Sidebar */}
      <ChatHistorySidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        showSidebar={showSidebar}
        onNewSession={startNewSession}
        onLoadSession={loadSession}
        onDeleteSession={handleDeleteSession}
        onDeleteAllSessions={handleDeleteAllSessions}
        onDeleteAllData={handleNuclearReset}
      />

      {/* Sidebar backdrop */}
      {showSidebar && (
        <div className="fixed inset-0 z-[59] bg-black/30" onClick={() => setShowSidebar(false)} />
      )}

      {/* Loading overlay while fetching thread */}
      {threadLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20">
          <Loader2 className="w-8 h-8 animate-spin text-[#046241]" />
        </div>
      )}

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 space-y-4">
        {messages.map(msg => (
          <ChatMessage
            key={msg.id}
            msg={msg}
            isDark={isDark}
            isStreaming={isStreaming && msg === messages[messages.length - 1]}
            confirmedMsgIds={confirmedMsgIds}
            rejectedMsgIds={rejectedMsgIds}
            onConfirm={handleConfirmStructure}
            onReject={handleModifyStructure}
            onDownload={(name, buf) => saveAs(new Blob([buf]), name)}
            onViewProject={id => navigate(`/teamlead-dashboard/projects/${id}/spreadsheet`)}
            lastSavedProjectId={lastSavedProjectId}
          />
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#046241] text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div className="p-4 rounded-[0_1rem_1rem_1rem]" style={{ backgroundColor: isDark ? "#27272a" : "#ffffff", border: isDark ? "1px solid #3f3f46" : "1px solid #e5e0d5" }}>
              <span className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-2 h-2 rounded-full bg-[#046241] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#046241]/10 border-4 border-dashed border-[#046241] rounded-xl">
          <p className="text-[#046241] font-bold text-lg">Drop file here</p>
        </div>
      )}

      {/* Chat Input */}
      <div className="flex-shrink-0 p-4 flex justify-center">
        <ChatInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSend={handleSend}
          onFileUpload={handleFileUpload}
          isTyping={isTyping}
          isStreaming={isStreaming}
          fileName={fileName}
          currentFile={currentFile}
          onRemoveFile={handleRemoveFile}
          isDark={isDark}
          textareaRef={textareaRef}
        />
      </div>
    </div>
  );
}