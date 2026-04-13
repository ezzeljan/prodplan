import React, { useState, useEffect, useRef } from "react";
import { saveAs } from "file-saver";
import { useSearchParams } from "react-router-dom";
import {
  Bot,
  Plus,
  Download,
  User as UserIcon,
  FileSpreadsheet,
  Loader2,
  Paperclip,
  Send,
  X,
  FileText,
  Table,
  Sun,
  Moon,
} from "lucide-react";
import OpenAI from "openai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { savePlan } from "../utils/planStorage";

// Modular Imports
import {
  Message,
  ProjectData,
  ActualDataItem,
  FileAttachment,
} from "../types/production";
import { generateExcelFile } from "../utils/excelGenerator";
import { handleFileProcessing } from "../utils/fileHandlers";
import {
  ChatSession,
  loadSessions,
  saveSessions,
  generateSessionTitle,
} from "./chat/ChatHistorySidebar";
import ChatHistorySidebar from "./chat/ChatHistorySidebar";
import ProjectSetupView from "./chat/ProjectSetupView";
import ChatMessage from "./chat/ChatMessage";
import ChatInput from "./chat/ChatInput";
import FilePreview from "./chat/FilePreview";

import { useAISpreadsheet } from "../contexts/AISpreadsheetContext";
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
          9. Expected output per operator (if the user already has a per-person expectation).
          
          CURRENT DATE CONTEXT: Today's date is ${new Date().toLocaleDateString("en-CA")}. If the user uses relative dates like "today", "tomorrow", "yesterday", "next Monday", or "in 2 weeks", you MUST calculate and use the exact YYYY-MM-DD based on this current date.

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
          - The first sheet must display a merged header reading "Daily Output of [Project Name]" above a two-column overview block. That overview block must include rows for Project Name, Project Overview, Expected Output per operator (when provided), Start Date, and End Date with the value column spanning the remaining width so it auto-fits.
          - The Date, Operator Name, and Output per [cadence] columns on the first sheet should contain direct values (no helper formulas) so the sheet behaves like a daily output log. The 'Daily
          
          Table' stays on this sheet below the overview block and still powers the formulas on the other sheets.
          - The Summary sheet must include these columns: No., Task, Plan (Time/hrs/min), Plan (Task), Actual (Time/hrs/min), Actual (Task), Balance, Completion Rate, and Remarks. Use formulas that pull aggregated data from the DailyProductionTable ranges for the Plan/Actual columns, compute Balance as Plan task minus Actual task, display Completion Rate as Actual/Plan (with error protection), auto-number the rows, and list remarks/statuses such as Completed, Completed ahead of plan, In progress, Delayed, and At risk.

          For every PLAN, PIVOT, and DASHBOARD item, you MUST provide an Excel formula that references the 'DailyProductionTable'.
          ALWAYS use the bracket syntax: 'DailyProductionTable[Column Name]'. For example: 'SUM(DailyProductionTable[Target])'.
          Use {rowIndex} for relative row references in Plan/Pivot.
          
          Once you have the core project details (1-6), you MUST FIRST present the full architecture to the user using well-structured Markdown tables that mirror the exact structure of the columns you will generate. Use clear headings with emojis like "📊 1. Daily Output of [Project Name]", "📈 2. [Project Name] Production Plan", "📊 3. Pivot Tables", and "🎯 4. Summary". Format the tables beautifully. Ensure that the 'Target' field is explicitly displayed as a column in the DailyProductionTable, and populate the table with realistic example values for all fields (apply the **LPB method (Learning, Performance, Breakthrough)** for target distribution: targets should increase gradually over the timeline instead of being uniform. Ensure the sum of these daily targets still matches the **Overall Goal** exactly).
          
          CRITICAL RULES FOR VISUALIZED TABLES:
          - The 'Actual Output' (or 'Actual') columns MUST remain entirely empty in the example tables.
          - ONLY the 'Target' values should be filled in with realistic generated numbers.
          - Ensure that all columns containing numbers are properly right-aligned using GitHub Flavored Markdown syntax (e.g., |---:|).
          - The data and structure displayed in these visualized Markdown tables MUST exactly match what will be generated in the final Excel file and Google Drive.
          
          CRITICAL: DO NOT call the 'generate_production_plan' tool immediately. You MUST present the tables and explicitly ask the user for confirmation (e.g., "Does this structure look good? Would you like me to generate the Excel file?").
          
          ONLY AFTER the user confirms the structure (and makes no further adjustments) should you call the 'generate_production_plan' tool to generate the Excel file. (Ensure the 'dailyColumns' includes the Target column with the exact key 'target'). YOU MUST populate the 'targetData' array with the exact per-day, per-operator targets from your proposed LPB Markdown schedule so the Excel file exactly matches the chat preview. Ensure the output is valid JSON without trailing commas.

          IMPORTANT: You are a specialized Production Plan Agent. You must ONLY respond to queries related to production planning, project scheduling, and Excel generation for these plans. 
          If a user asks about unrelated topics (e.g., weather, general knowledge, jokes, other software), politely decline and redirect them back to production planning.
          
          Be conversational and helpful within your domain. If information is missing, ask for it.

          When presenting table structures, you MUST format them as proper GitHub Flavored Markdown tables with a header separator row. Example:
          | Column 1 | Column 2 | Column 3 |
          |----------|----------|----------|
          | value 1  | value 2  | value 3  |

          Never use any other format for tables. Always include the |---|---| separator row.`;

const getSystemInstruction = (projectName?: string) => {
  let base = SYSTEM_INSTRUCTION;
  if (projectName) {
    base += `\n\nCONTEXT: You are currently working ONLY for the project folder: "${projectName}". All your suggestions, plans, and technical architectures MUST be specifically for this project. When the user asks for changes, you should assume they refer to this project's spreadsheets.`;
  }
  return base;
};

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "generate_production_plan",
      description:
        "Generates the production planning Excel file once core project details and column structure are confirmed.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The name of the project" },
          goal: { type: "number", description: "The total numeric goal" },
          unit: {
            type: "string",
            description: "The unit of measurement (e.g., 'units', 'hours')",
          },
          startDate: {
            type: "string",
            description: "Start date in YYYY-MM-DD format",
          },
          endDate: {
            type: "string",
            description: "End date in YYYY-MM-DD format",
          },
          resources: {
            type: "array",
            items: { type: "string" },
            description: "List of names of teams or individuals",
          },
          overview: {
            type: "string",
            description: "Brief description of the project's scope or purpose.",
          },
          expectedOutputPerOperator: {
            type: "string",
            description: "Optional per-operator expectation if the user has one.",
          },
          outputCadence: {
            type: "string",
            description: "Preferred cadence such as 'per day', 'per week', or any custom period.",
          },
          columns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                header: {
                  type: "string",
                  description: "The display name of the column",
                },
                key: {
                  type: "string",
                  description: "A unique key for the column",
                },
                section: {
                  type: "string",
                  enum: ["Target", "Actual", "Accumulative"],
                  description: "Which section the column belongs to",
                },
                formula: {
                  type: "string",
                  description:
                    "Excel formula referencing DailyProductionTable. Use {rowIndex} for the current row.",
                },
              },
              required: ["header", "key", "section", "formula"],
              additionalProperties: false,
            },
          },
          dailyColumns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                header: { type: "string" },
                key: { type: "string" },
                formula: { type: "string" },
              },
              required: ["header", "key"],
            },
          },
          pivotColumns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                header: { type: "string" },
                formula: { type: "string" },
              },
              required: ["header", "formula"],
            },
          },
          dashboardMetrics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                formula: { type: "string" },
                value: {
                  description: "Use when you only need to display a static value instead of a formula.",
                  type: ["number", "string"],
                },
                format: { type: "string" },
              },
              required: ["label"],
              additionalProperties: false,
            },
          },
          actualData: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                name: { type: "string" },
                actual: { type: "number" },
              },
              required: ["date", "name", "actual"],
            },
          },
          targetData: {
            type: "object",
            description: "A compact map of daily targets: { 'YYYY-MM-DD': { 'Resource Name': targetNumber } }. This MUST exactly match the targets shown in your final confirmed Markdown preview.",
            additionalProperties: {
              type: "object",
              additionalProperties: { type: "number" }
            }
          },
        },
        required: [
          "name",
          "goal",
          "unit",
          "startDate",
          "endDate",
          "resources",
          "columns",
        ],
      },
    },
  },
];

export default function ProductionPlanMaker() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploadedData, setUploadedData] = useState<ActualDataItem[] | null>(
    null,
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<FileAttachment | null>(null);
  const [currentProject, setCurrentProject] =
    useState<Partial<ProjectData> | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark",
  );
  const [confirmedMsgIds, setConfirmedMsgIds] = useState<Set<string>>(
    new Set(),
  );
  const [rejectedMsgIds, setRejectedMsgIds] = useState<Set<string>>(new Set());
  const [lastSavedProjectId, setLastSavedProjectId] = useState<string>("");
  const [isProjectStarted, setIsProjectStarted] = useState(false);
  const [currentProjectName, setCurrentProjectName] = useState("");

  const { setLastCreated } = useAISpreadsheet();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const deletedSessionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const stored = loadSessions();
    const paramProjectId = searchParams.get("projectId");

    if (paramProjectId) {
      setIsProjectStarted(true);
      setLastSavedProjectId(paramProjectId);

      const existingSession = stored.find((s) => s.projectId === paramProjectId);
      if (existingSession) {
        setActiveSessionId(existingSession.id);
        setMessages(existingSession.messages);
      } else {
        const newId = Date.now().toString();
        setActiveSessionId(newId);
        setMessages([]);
      }

      storage.getProject(paramProjectId).then((p) => {
        if (p) {
          setCurrentProjectName(p.name);
          setCurrentProject(p as Partial<ProjectData>);
        }
      });

      if (stored.length > 0) setSessions(stored);
      return;
    }

    if (stored.length > 0) {
      const filtered = stored.filter(s => !deletedSessionsRef.current.has(s.id));
      if (filtered.length > 0) {
        setSessions(filtered);
        const last = filtered[filtered.length - 1];
        setActiveSessionId(last.id);
        setMessages(last.messages);
        if (last.projectId) {
          setLastSavedProjectId(last.projectId);
          setIsProjectStarted(true);
          storage.getProject(last.projectId).then((p) => {
            if (p) setCurrentProjectName(p.name);
          });
        }
      } else {
        setActiveSessionId(Date.now().toString());
      }
    } else {
      setActiveSessionId(Date.now().toString());
    }
  }, [searchParams]);

  useEffect(() => {
    if (!activeSessionId) return;
    setSessions((prev) => {
      const filtered = prev.filter(
        (s) => !deletedSessionsRef.current.has(s.id),
      );
      const exists = filtered.find((s) => s.id === activeSessionId);
      let updated: ChatSession[];
      if (exists) {
        updated = filtered.map((s) =>
          s.id === activeSessionId
            ? {
              ...s,
              messages,
              title: generateSessionTitle(messages),
              projectId: lastSavedProjectId,
              projectName: currentProjectName,
            }
            : s,
        );
      } else {
        updated = [
          ...filtered,
          {
            id: activeSessionId,
            title: generateSessionTitle(messages),
            createdAt: new Date().toISOString(),
            messages,
            projectId: lastSavedProjectId,
            projectName: currentProjectName,
          },
        ];
      }
      saveSessions(updated);
      return updated;
    });
  }, [messages, activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const handleToggleHistory = () => setShowSidebar((v) => !v);
    window.addEventListener("toggle-chat-history", handleToggleHistory);
    return () =>
      window.removeEventListener("toggle-chat-history", handleToggleHistory);
  }, []);

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  const startNewSession = () => {
    const newId = Date.now().toString();
    setActiveSessionId(newId);
    setMessages([]);
    setIsProjectStarted(false);
    setLastSavedProjectId("");
    setCurrentProjectName("");
    setCurrentProject(null);
  };

  const loadSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages || []);
    if (session.projectId) {
      setLastSavedProjectId(session.projectId);
      setIsProjectStarted(true);
      setCurrentProjectName(session.projectName || "");
    } else {
      setIsProjectStarted(false);
      setLastSavedProjectId("");
      setCurrentProjectName("");
    }
    setShowSidebar(false);
  };

  const handleDeleteSession = (id: string) => {
    deletedSessionsRef.current.add(id);
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveSessions(updated);
      if (activeSessionId === id) {
        if (updated.length > 0) {
          loadSession(updated[updated.length - 1]);
        } else {
          startNewSession();
        }
      }
      return updated;
    });
  };

  const handleDeleteAllSessions = () => {
    setSessions([]);
    saveSessions([]);
    startNewSession();
  };

  const handleNuclearReset = () => {
    if (confirm("This will permanently delete ALL data, sessions, and files. Proceed?")) {
      handleDeleteAllSessions();
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const isTableProposal = (content: string) => {
    return (
      content.includes("DailyProductionTable") ||
      content.includes("Does this structure look good") ||
      content.includes("Does this proposed structure") ||
      (content.includes("confirm") && content.includes("Excel"))
    );
  };

  const handleConfirmStructure = (msgId: string) => {
    setConfirmedMsgIds((prev) => new Set([...prev, msgId]));
    setRejectedMsgIds((prev) => {
      const updated = new Set([...prev]);
      messages.forEach((m) => {
        if (m.id !== msgId && isTableProposal(m.content)) {
          updated.add(m.id);
        }
      });
      return updated;
    });
    setInputValue(
      "Yes, the structure looks good. Please generate the Excel file.",
    );
    setTimeout(() => {
      const sendBtn =
        document.querySelector<HTMLButtonElement>("[data-send-btn]");
      sendBtn?.click();
    }, 100);
  };

  const handleModifyStructure = (msgId: string) => {
    setRejectedMsgIds((prev) => new Set([...prev, msgId]));
    setInputValue("I'd like to modify the structure. ");
    textareaRef.current?.focus();
  };

  const handleStartProject = async (projectName: string) => {
    setCurrentProjectName(projectName);
    const projectId = `proj-${Date.now()}`;
    setLastSavedProjectId(projectId);
    setIsProjectStarted(true);

    const initialProject: UnifiedProject = {
      id: projectId,
      name: projectName,
      goal: 0,
      unit: "",
      startDate: new Date().toLocaleDateString("en-CA"),
      endDate: new Date().toLocaleDateString("en-CA"),
      resources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      spreadsheetData: { columns: [], rows: [], merges: [] },
      status: "draft",
      outputs: [],
    };

    await storage.saveProject(initialProject);

    const initialMsg: Message = {
      id: Date.now().toString(),
      role: "agent",
      content: `I've created the project folder for **${projectName}**. I'm now focused exclusively on this workspace. \n\nPlease provide the project details (Goal, Dates, Resources, etc.) or upload an instruction file to begin building the plan.`,
    };
    setMessages([initialMsg]);

    const newSessionId = activeSessionId || Date.now().toString();
    setSessions((prev) => {
      const filtered = prev.filter((s) => !deletedSessionsRef.current.has(s.id));
      const exists = filtered.find((s) => s.id === newSessionId);
      let updated: ChatSession[];
      if (exists) {
        updated = filtered.map((s) =>
          s.id === newSessionId
            ? {
              ...s,
              projectId,
              projectName,
              messages: [initialMsg],
              title: "New Chat",
            }
            : s,
        );
      } else {
        updated = [
          ...filtered,
          {
            id: newSessionId,
            title: "New Chat",
            createdAt: new Date().toISOString(),
            messages: [initialMsg],
            projectId,
            projectName,
          },
        ];
      }
      saveSessions(updated);
      return updated;
    });
  };

  const typewriterEffect = (fullText: string, msgId: string) => {
    let i = 0;
    setIsStreaming(true);
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    streamIntervalRef.current = setInterval(() => {
      i += 5;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, content: fullText.slice(0, i) } : m,
        ),
      );
      if (i >= fullText.length) {
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
        setIsStreaming(false);
      }
    }, 5);
  };

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
    if (!file) return;
    await processFile(file);
    e.target.value = "";
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !currentFile) || isTyping || isStreaming) return;

    const contextPreamble = currentProject
      ? `[CURRENT PROJECT STATE: Name="${currentProject.name || "?"}", Goal=${currentProject.goal || "?"}, Unit="${currentProject.unit || "?"}", Dates=${currentProject.startDate || "?"}/${currentProject.endDate || "?"}, Resources=${currentProject.resources?.join(",") || "?"}]\n`
      : "";

    const fileMetadata = currentFile?.metadata || "";
    const fullPrompt = `${contextPreamble}${inputValue}${fileMetadata}`;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content:
        inputValue ||
        (currentFile
          ? `Shared ${currentFile.type.startsWith("image/") ? "an image" : "a file"}: ${currentFile.name}`
          : ""),
      attachment: currentFile
        ? {
          name: currentFile.name,
          type: currentFile.type,
          data: currentFile.data,
        }
        : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setCurrentFile(null);
    setFileName(null);
    setIsTyping(true);

    try {
      const openAiMessages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: getSystemInstruction(currentProjectName) },
        ...messages.map((m) => {
          if (m.attachment && m.attachment.type.startsWith("image/")) {
            return {
              role: m.role === "user" ? "user" : "assistant",
              content: [
                { type: "text", text: m.content || "Attached image" },
                { type: "image_url", image_url: { url: m.attachment.data } },
              ],
            } as OpenAI.ChatCompletionMessageParam;
          }
          return {
            role: m.role === "user" ? "user" : "assistant",
            content:
              m.content ||
              (m.type === "file"
                ? `[Generated File: ${m.fileData?.name}]`
                : "Processing..."),
          } as OpenAI.ChatCompletionMessageParam;
        }),
      ];

      if (userMsg.attachment && userMsg.attachment.type.startsWith("image/")) {
        openAiMessages.push({
          role: "user",
          content: [
            { type: "text", text: fullPrompt },
            { type: "image_url", image_url: { url: userMsg.attachment.data } },
          ],
        });
      } else {
        openAiMessages.push({ role: "user", content: fullPrompt });
      }

      let response;
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        try {
          response = await openai.chat.completions.create({
            model:
              retries === 0
                ? "google/gemini-2.0-flash-001"
                : "google/gemini-flash-1.5",
            messages: openAiMessages,
            tools: TOOLS,
            tool_choice: "auto",
          });
          break;
        } catch (err: any) {
          if (
            retries < maxRetries &&
            (err.message?.includes("fetch") || err.message?.includes("network"))
          ) {
            retries++;
            await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
            continue;
          }
          throw err;
        }
      }

      if (!response) throw new Error("No response from AI");

      const message = response.choices[0]?.message;

      if (message?.tool_calls && message.tool_calls.length > 0) {
        for (const call of message.tool_calls) {
          const toolCall = call as any;
          if (
            toolCall.type === "function" &&
            toolCall.function.name === "generate_production_plan"
          ) {
            let projectData: ProjectData;
            try {
              projectData = JSON.parse(
                toolCall.function.arguments,
              ) as ProjectData;
            } catch (e) {
              console.error(
                "Malformed JSON in tool call arguments:",
                toolCall.function.arguments,
              );
              throw e;
            }
            setCurrentProject(projectData);

            const combinedActualData = [...(projectData.actualData || [])];
            if (uploadedData) {
              uploadedData.forEach((upItem) => {
                const exists = combinedActualData.some(
                  (c) => c.date === upItem.date && c.name === upItem.name,
                );
                if (!exists) combinedActualData.push(upItem);
              });
            }
            projectData.actualData =
              combinedActualData.length > 0 ? combinedActualData : undefined;
            const buffer = await generateExcelFile(projectData);

            const msgId = Date.now().toString();
            const generatedText = message.content ? message.content + "\n\n" : "";

            const successText = `${generatedText}I've generated the production plan for **${projectData.name}**. You can download the Excel file below or view it in the web spreadsheet.`;
            setMessages((prev) => [
              ...prev,
              {
                id: msgId,
                role: "agent",
                content: "",
                type: "file",
                fileData: {
                  name: `${projectData.name.replace(/\s+/g, "_")}_Production_Planning.xlsx`,
                  buffer: buffer,
                },
              },
            ]);
            typewriterEffect(successText, msgId);

            await savePlan({
              id: Date.now().toString(),
              projectName: projectData.name,
              fileName: `${projectData.name.replace(/\s+/g, "_")}_Production_Planning.xlsx`,
              createdAt: new Date().toISOString(),
              buffer: buffer,
            });

            let savedProjectId = "";
            try {
              const spreadsheetData = projectDataToSpreadsheet(projectData);
              savedProjectId = lastSavedProjectId || `proj-${Date.now()}`;
              const unifiedProject: UnifiedProject = {
                id: savedProjectId,
                name: projectData.name,
                overview: projectData.overview,
                goal: projectData.goal,
                unit: projectData.unit,
                startDate: projectData.startDate,
                endDate: projectData.endDate,
                resources: projectData.resources,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                spreadsheetData,
                status: "active",
                outputs: [],
              };
              await storage.saveProject(unifiedProject);
              setLastCreated(savedProjectId);
              setLastSavedProjectId(savedProjectId);
            } catch (convError) {
              console.warn("Could not save to project storage:", convError);
            }
          }
        }
      } else {
        const textResponse =
          message?.content ||
          "I'm sorry, I didn't quite get that. Could you please provide more details about your project?";
        const msgId = Date.now().toString();
        setMessages((prev) => [
          ...prev,
          { id: msgId, role: "agent", content: "" },
        ]);
        typewriterEffect(textResponse, msgId);
      }
    } catch (error) {
      console.error("OpenRouter Error:", error);
      const msgId = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        { id: msgId, role: "agent", content: "" },
      ]);
      typewriterEffect(
        `Something went wrong: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        msgId,
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleDownload = (fileName: string, buffer: any) => {
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, fileName);
  };

  const downloadAttachment = (dataUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`flex h-full w-full relative transition-colors duration-300 ${isDark ? "bg-[#151516]" : "bg-[#F9F7F7]"}`}
      onDragEnter={() => setIsDragging(true)}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) await processFile(file);
      }}
    >
      {/* ── Sidebar ── */}
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
      {showSidebar && (
        <div
          className="fixed inset-0 z-55 bg-black/40"
          onClick={() => setShowSidebar(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main Chat ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {!isProjectStarted ? (
          <ProjectSetupView
            onComplete={handleStartProject}
            onReset={handleNuclearReset}
          />
        ) : (
          <>
            {/* Background blobs */}
            <div
              className={`absolute top-[5%] left-[5%] w-100 h-100 rounded-full blur-[100px] pointer-events-none ${isDark ? "bg-zinc-800/20" : "bg-slate-200/40"
                }`}
            />
            <div
              className={`absolute bottom-[20%] right-[10%] w-125 h-125 rounded-full blur-[120px] pointer-events-none ${isDark ? "bg-zinc-700/10" : "bg-zinc-200/30"
                }`}
            />

            {/* Drag Overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-50 bg-blue-600/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                <div className="bg-white p-8 rounded-3xl shadow-2xl border-2 border-blue-500 border-dashed flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <Download className="w-8 h-8 animate-bounce" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">
                      Drop files here
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      CSV, Excel, PDF, Docs, or Images
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl p-2 pr-3 flex justify-between items-center ${isDark ? "bg-[#3f3f46]/90 border border-[#3f3f46] shadow-md" : "bg-[#F3F5F7]/95 border border-[#E8ECEF] shadow-sm"} backdrop-blur-2xl rounded-full z-20`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: "#046241" }}
                >
                  <Bot className="w-6 h-6" />
                </div>
                <div className="flex flex-col justify-center gap-1">
                  <h1
                    className={`text-[15px] font-bold leading-none ${isDark ? "text-gray-100" : "text-[#133020]"}`}
                  >
                    {currentProjectName || "Production Plan Agent"}
                  </h1>
                  <div
                    className={`text-[11px] leading-none flex items-center gap-1.5 ${isDark ? "text-emerald-400" : "text-[#046241]"}`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: "#046241" }}
                    ></span>
                    Powered by Lifewood AI (v1.1)
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-center pl-4">
                <div className={`flex items-center gap-2 px-2 py-1.5 rounded-full ${isDark ? "bg-zinc-800" : "bg-[#EAECEF]"}`}>
                  <button
                    onClick={() => {
                      startNewSession();
                      setShowSidebar(false);
                    }}
                    className={`p-1.5 rounded-full transition-colors ${isDark
                      ? "hover:bg-zinc-700 text-gray-300"
                      : "hover:bg-white text-[#4A5A66] hover:shadow-sm"
                      }`}
                    title="New Chat"
                  >
                    <Plus className="w-[18px] h-[18px]" />
                  </button>
                  <button
                    onClick={() => setIsDark(!isDark)}
                    className={`p-1.5 rounded-full transition-colors ${isDark
                      ? "hover:bg-zinc-700 text-gray-300"
                      : "hover:bg-white text-[#4A5A66] hover:shadow-sm"
                      }`}
                    title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  >
                    {isDark ? (
                      <Sun className="w-[18px] h-[18px]" />
                    ) : (
                      <Moon className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>

              </div>
            </div>

            {/* ── Messages Container ── */}
            <div
              className={`flex-1 overflow-y-auto pt-28 pb-40 px-4 sm:px-8 md:px-16 lg:px-24 xl:px-32 space-y-6 relative z-10 ${messages.length === 0 ? "hidden" : ""}`}
            >
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  isDark={isDark}
                  isStreaming={isStreaming}
                  confirmedMsgIds={confirmedMsgIds}
                  rejectedMsgIds={rejectedMsgIds}
                  onConfirm={(id) => handleConfirmStructure(id)}
                  onReject={(id) => handleModifyStructure(id)}
                  onDownload={(name, buf) => handleDownload(name, buf)}
                  onViewProject={(id) => navigate(`/projects/${id}`)}
                  lastSavedProjectId={lastSavedProjectId}
                />
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: "#046241" }}
                  >
                    <Bot className="w-5 h-5" />
                  </div>
                  <div
                    className="p-4 rounded-2xl shadow-sm flex items-center gap-2"
                    style={{
                      backgroundColor: isDark ? "#27272a" : "#ffffff",
                      border: isDark ? "1px solid #3f3f46" : "1px solid #e5e0d5",
                    }}
                  >
                    <Loader2
                      className="w-4 h-4 animate-spin"
                      style={{ color: "#046241" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: isDark ? "#f4f4f5" : "#133020" }}
                    >
                      Processing your request...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Input Area Dock ── */}
            <div
              className={
                messages.length === 0
                  ? "absolute inset-0 flex flex-col items-center justify-center p-4 z-20 pointer-events-none"
                  : `absolute bottom-0 left-0 w-full pb-6 pt-12 px-4 flex justify-center z-20 pointer-events-none bg-linear-to-t ${isDark
                    ? "from-[#151516] via-[#151516]/90"
                    : "from-[#F9F7F7] via-[#F9F7F7]/90"
                  } to-transparent transition-colors duration-300`
              }
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center pointer-events-auto mb-6">
                  <h2
                    className={`text-3xl md:text-5xl font-normal tracking-tight text-center transition-colors duration-300 ${isDark ? "text-gray-100" : "text-[#133020]"}`}
                  >
                    What's on the agenda today?
                  </h2>
                </div>
              )}
              <ChatInput
                inputValue={inputValue}
                setInputValue={setInputValue}
                onSend={handleSendMessage}
                onFileUpload={handleFileUpload}
                isTyping={isTyping}
                isStreaming={isStreaming}
                fileName={fileName}
                currentFile={currentFile}
                onRemoveFile={() => {
                  setFileName(null);
                  setCurrentFile(null);
                  setUploadedData(null);
                }}
                isDark={isDark}
                textareaRef={textareaRef}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}