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


import { useAISpreadsheet } from "../contexts/AISpreadsheetContext";
import { projectDataToSpreadsheet } from "../utils/spreadsheetConverter";
import { useNavigate } from "react-router-dom";
import { storage } from "../utils/storageProvider";
import type { UnifiedProject } from "../utils/projectStorage";
import { clearAllProjects } from "../utils/projectStorage";
import { clearAllPlans } from "../utils/planStorage";

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
  const [lastSavedProjectId, setLastSavedProjectId] = useState<string>('');
  const [isProjectStarted, setIsProjectStarted] = useState(false);
  const [currentProjectName, setCurrentProjectName] = useState('');

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
    const paramProjectId = searchParams.get('projectId');

    if (paramProjectId) {
        setIsProjectStarted(true);
        setLastSavedProjectId(paramProjectId);
        
        const existingSession = stored.find(s => s.projectId === paramProjectId);
        if (existingSession) {
            setActiveSessionId(existingSession.id);
            setMessages(existingSession.messages);
        } else {
            const newId = Date.now().toString();
            setActiveSessionId(newId);
            setMessages([]);
        }
        
        storage.getProject(paramProjectId).then(p => {
            if (p) {
                setCurrentProjectName(p.name);
                setCurrentProject(p as Partial<ProjectData>);
            }
        });
        
        if (stored.length > 0) setSessions(stored);
        return;
    }

    if (stored.length > 0) {
      setSessions(stored);
      const last = stored[stored.length - 1];
      setActiveSessionId(last.id);
      setMessages(last.messages);
      if (last.projectId) {
          setLastSavedProjectId(last.projectId);
          setIsProjectStarted(true);
          storage.getProject(last.projectId).then(p => {
              if (p) setCurrentProjectName(p.name);
          });
      } else {
          setIsProjectStarted(false);
          setLastSavedProjectId('');
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
                projectName: currentProjectName, // ✅ FIX: persist project name
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
            projectName: currentProjectName, // ✅ FIX: persist project name
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

  const handleStartProject = async (projectName: string) => {
    setCurrentProjectName(projectName);
    const projectId = `proj-${Date.now()}`;
    setLastSavedProjectId(projectId);
    setIsProjectStarted(true);

    const initialProject: UnifiedProject = {
      id: projectId,
      name: projectName,
      goal: 0,
      unit: '',
      startDate: new Date().toLocaleDateString('en-CA'),
      endDate: new Date().toLocaleDateString('en-CA'),
      resources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      spreadsheetData: { columns: [], rows: [], merges: [] },
      status: 'draft',
      outputs: [],
    };

    await storage.saveProject(initialProject);

    const initialMsg: Message = {
      id: Date.now().toString(),
      role: 'agent',
      content: `I've created the project folder for **${projectName}**. I'm now focused exclusively on this workspace. \n\nPlease provide the project details (Goal, Dates, Resources, etc.) or upload an instruction file to begin building the plan.`,
    };
    setMessages([initialMsg]);

    // ✅ FIX: immediately save the new session with projectName so the sidebar shows it correctly
    const newSessionId = activeSessionId || Date.now().toString();
    setSessions((prev) => {
      const filtered = prev.filter((s) => !deletedSessionsRef.current.has(s.id));
      const exists = filtered.find((s) => s.id === newSessionId);
      let updated: ChatSession[];
      if (exists) {
        updated = filtered.map((s) =>
          s.id === newSessionId
            ? { ...s, projectId, projectName, messages: [initialMsg], title: 'New Chat' }
            : s
        );
      } else {
        updated = [
          ...filtered,
          {
            id: newSessionId,
            title: 'New Chat',
            createdAt: new Date().toISOString(),
            messages: [initialMsg],
            projectId,
            projectName, // ✅ FIX: include projectName from the start
          },
        ];
      }
      saveSessions(updated);
      return updated;
    });
  };

  const handleModifyStructure = (msgId: string) => {
    setRejectedMsgIds((prev) => new Set([...prev, msgId]));
    setInputValue("I'd like to modify the structure. ");
    textareaRef.current?.focus();
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
            content: m.content || (m.type === 'file' ? `[Generated File: ${m.fileData?.name}]` : "Processing..."),
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
            model: retries === 0 ? "google/gemini-2.0-flash-001" : "google/gemini-flash-1.5", 
            messages: openAiMessages,
            tools: TOOLS,
            tool_choice: "auto",
          });
          break;
        } catch (err: any) {
          if (retries < maxRetries && (err.message?.includes('fetch') || err.message?.includes('network'))) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
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
              projectData = JSON.parse(toolCall.function.arguments) as ProjectData;
            } catch (e) {
              console.error("Malformed JSON in tool call arguments:", toolCall.function.arguments);
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
            const generatedText = message.content
              ? message.content + "\n\n"
              : "";

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

            let savedProjectId = '';
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
                status: 'active',
                outputs: [],
              };
              await storage.saveProject(unifiedProject);
              setLastCreated(savedProjectId);
              setLastSavedProjectId(savedProjectId);
            } catch (convError) {
              console.warn('Could not save to project storage:', convError);
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
        `Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewSession = () => {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    setIsStreaming(false);
    const newId = Date.now().toString();
    setActiveSessionId(newId);
    setMessages([]);
    setLastSavedProjectId('');
    setIsProjectStarted(false);
    setCurrentProjectName('');
    setUploadedData(null);
    setFileName(null);
    setCurrentFile(null);
    setCurrentProject(null);
    setShowSidebar(false);
  };

  const loadSession = (session: ChatSession) => {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    setIsStreaming(false);
    setActiveSessionId(session.id);
    setMessages(session.messages);
    if (session.projectId) {
      setLastSavedProjectId(session.projectId);
      setIsProjectStarted(true);
      // ✅ FIX: use stored projectName first, fall back to fetching from storage
      if (session.projectName) {
        setCurrentProjectName(session.projectName);
      } else {
        storage.getProject(session.projectId).then(p => {
          if (p) setCurrentProjectName(p.name);
        });
      }
    } else {
      setLastSavedProjectId('');
      setIsProjectStarted(false);
      setCurrentProjectName('');
    }
    setUploadedData(null);
    setFileName(null);
    setCurrentFile(null);
    setCurrentProject(null);
    setShowSidebar(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    deletedSessionsRef.current.add(sessionId);
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      saveSessions(updated);
      return updated;
    });
    if (sessionId === activeSessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId);
      if (remaining.length > 0) {
        loadSession(remaining[remaining.length - 1]);
      } else {
        startNewSession();
      }
    }
  };

  const handleDeleteAllSessions = () => {
    sessions.forEach(s => deletedSessionsRef.current.add(s.id));
    setSessions([]);
    saveSessions([]);
    startNewSession();
  };

  const handleNuclearReset = async () => {
    await clearAllProjects();
    await clearAllPlans();
    saveSessions([]);
    setSessions([]);
    startNewSession();
    alert("Application reset successfully. All data has been wiped.");
  };

  return (
    <div
      className={`w-full h-[calc(100vh-4rem)] md:h-screen flex overflow-hidden relative transition-colors duration-300 ${isDark ? "bg-[#151516]" : "bg-[#F9F7F7]"
        }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        const relatedTarget = e.relatedTarget as Node | null;
        if (!e.currentTarget.contains(relatedTarget)) setIsDragging(false);
      }}
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
            </div>

          </div>
        </div>

        {/* ── Messages Container ── */}
        <div
          className={`flex-1 overflow-y-auto pt-28 pb-40 px-4 sm:px-8 md:px-16 lg:px-24 xl:px-32 space-y-6 relative z-10 ${messages.length === 0 ? "hidden" : ""
            }`}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
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
                        border: isDark
                          ? "1px solid #3f3f46"
                          : "1px solid #e5e0d5",
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
                        p: ({ children }: any) => (
                          <p className="mb-2 last:mb-0">{children}</p>
                        ),
                        strong: ({ children }: any) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        ul: ({ children }: any) => (
                          <ul className="list-disc list-inside mb-2 space-y-1">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }: any) => (
                          <ol className="list-decimal list-inside mb-2 space-y-1">
                            {children}
                          </ol>
                        ),
                        li: ({ children }: any) => (
                          <li className="text-sm">{children}</li>
                        ),
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
                            style={{
                              borderColor: isDark ? "#3f3f46" : "#e5e0d5",
                            }}
                          >
                            <table className="w-full text-xs border-collapse">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }: any) => (
                          <thead style={{ backgroundColor: "#046241" }}>
                            {children}
                          </thead>
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
                            style={{
                              borderColor: isDark ? "#3f3f46" : "#e5e0d5",
                            }}
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
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Attachment Preview */}
                  {msg.attachment && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      {msg.attachment.type.startsWith("image/") ? (
                        <div
                          className="relative group cursor-pointer overflow-hidden rounded-lg border border-white/20 w-fit"
                          onClick={() =>
                            setPreviewImage({
                              url: msg.attachment!.data,
                              name: msg.attachment!.name,
                            })
                          }
                        >
                          <img
                            src={msg.attachment.data}
                            alt={msg.attachment.name}
                            className="block max-w-full h-auto max-h-75 transition-transform group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isDark
                            ? "bg-white/5 border-white/10 hover:bg-white/10"
                            : "bg-white/10 border-white/20 hover:bg-white/20"
                            }`}
                          onClick={() =>
                            downloadAttachment(
                              msg.attachment!.data,
                              msg.attachment!.name,
                            )
                          }
                        >
                          <div className="p-2 bg-white/20 rounded-md">
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {msg.attachment.name}
                            </p>
                            <p className="text-xs text-white/70">
                              Click to download
                            </p>
                          </div>
                          <Download className="w-4 h-4 text-white/70" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm / Modify buttons */}
                {msg.role === "agent" &&
                  msg.type !== "file" &&
                  isTableProposal(msg.content) &&
                  !confirmedMsgIds.has(msg.id) &&
                  !rejectedMsgIds.has(msg.id) &&
                  !isStreaming &&
                  msg.content.length > 50 && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => handleConfirmStructure(msg.id)}
                        className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:-translate-y-0.5 active:scale-95 shadow-sm flex items-center justify-center gap-2"
                        style={{ backgroundColor: "#046241" }}
                      >
                        ✅ Looks good, generate file
                      </button>
                      <button
                        onClick={() => handleModifyStructure(msg.id)}
                        className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all hover:opacity-90 hover:-translate-y-0.5 active:scale-95 shadow-sm flex items-center justify-center gap-2"
                        style={{
                          backgroundColor: isDark ? "#3f3f46" : "#f0ede6",
                          color: "#046241",
                          border: "1px solid #046241",
                        }}
                      >
                        ✏️ Modify structure
                      </button>
                    </div>
                  )}

                {/* Confirmed badge */}
                {confirmedMsgIds.has(msg.id) && (
                  <div
                    className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg w-fit"
                    style={{
                      backgroundColor: "rgba(4,98,65,0.1)",
                      color: "#046241",
                    }}
                  >
                    ✅ Structure confirmed — generating file...
                  </div>
                )}

                {/* Download Section or External Links */}
                {(msg.type === "file" || msg.type === "google-sheet") && msg.fileData && !isStreaming && (
                  msg.type === "google-sheet" ? (
                    <a
                      href={msg.fileData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl w-full transition-opacity text-left hover:opacity-90"
                      style={{
                        backgroundColor: "#FFC370",
                        border: "1px solid #FFB347",
                        textDecoration: "none"
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
                      >
                        <FileSpreadsheet
                          className="w-6 h-6"
                          style={{ color: "#133020" }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{ color: "#133020" }}>
                          {msg.fileData.name}
                        </p>
                        <p className="text-xs" style={{ color: "#046241" }}>
                          Click to open in a new tab
                        </p>
                      </div>
                    </a>
                  ) : (
                    <button
                      onClick={() =>
                        handleDownload(msg.fileData!.name, msg.fileData!.buffer)
                      }
                      className="flex items-center gap-3 p-4 rounded-xl w-full transition-opacity text-left hover:opacity-90"
                      style={{
                        backgroundColor: "#FFC370",
                        border: "1px solid #FFB347",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
                      >
                        <FileSpreadsheet
                          className="w-6 h-6"
                          style={{ color: "#133020" }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium" style={{ color: "#133020" }}>
                          {msg.fileData!.name}
                        </p>
                        <p className="text-xs" style={{ color: "#046241" }}>
                          Click to download
                        </p>
                      </div>
                      <Download
                        className="w-5 h-5 shrink-0"
                        style={{ color: "#133020" }}
                      />
                    </button>
                  )
                )}

                {/* View in Spreadsheet button */}
                {(msg.type === "file" || msg.type === "google-sheet") && msg.fileData && !isStreaming && lastSavedProjectId && (
                  <button
                    onClick={() => navigate(`/projects/${lastSavedProjectId}`)}
                    className="flex items-center gap-3 p-3 rounded-xl w-full transition-all text-left hover:opacity-90 mt-2"
                    style={{
                      backgroundColor: '#046241',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                    >
                      <Table className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-white">View in Spreadsheet</p>
                      <p className="text-[11px] text-white/70">Open in the editable web spreadsheet</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
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
          <div
            className={`w-full max-w-5xl p-2 rounded-3xl space-y-3 backdrop-blur-xl pointer-events-auto border transition-colors duration-300 ${isDark ? "bg-zinc-800/60 border-zinc-600"
              : "bg-white/50 border-[#e5e0d5] shadow-xl"
              }`}
          >
            {fileName && (
              <div
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #FFC370",
                }}
              >
                <div
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "#046241" }}
                >
                  <Paperclip className="w-4 h-4" />
                  <span className="font-medium truncate max-w-50">
                    {fileName}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setFileName(null);
                    setUploadedData(null);
                    setCurrentFile(null);
                  }}
                  className="hover:opacity-70"
                  style={{ color: "#FFB347" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 mb-0.5 rounded-full transition-opacity hover:opacity-70"
                title="Upload file (CSV, Excel, PDF, Doc, PPT, Image)"
              >
                <Paperclip className="w-5 h-5 text-[#4A5A66]" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv, .xlsx, .xls, .pdf, .docx, .doc, .pptx, .ppt, .txt, .md, .json, image/*"
                className="hidden"
              />
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your project details..."
                disabled={isTyping || isStreaming}
                className={`flex-1 px-4 py-3 rounded-2xl outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-none backdrop-blur-sm ${isDark
                  ? "bg-zinc-900/40 text-gray-100 placeholder-zinc-500"
                  : "bg-white/60 text-[#133020] placeholder-gray-500"
                  }`}
                style={{
                  border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(229, 224, 213, 0.5)",
                  maxHeight: "120px",
                  overflowY: "auto",
                }}
              />
              <button
                data-send-btn
                onClick={handleSendMessage}
                disabled={
                  (!inputValue.trim() && !currentFile) ||
                  isTyping ||
                  isStreaming
                }
                className="p-3 mb-0.5 rounded-full transition-opacity disabled:opacity-50 disabled:cursor-not-allowed border border-white/40"
                style={{ backgroundColor: isDark ? "#FFFFFF" : "#000000" }}
              >
                <Send
                  className={`w-5 h-5 ${isDark ? "text-[#4A5A66]" : "text-white"}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Image Preview Modal */}
        {previewImage && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="relative max-w-full max-h-full flex flex-col items-center">
              <div className="absolute top-4 right-4 flex gap-3 z-10">
                <button
                  onClick={() =>
                    downloadAttachment(previewImage.url, previewImage.name)
                  }
                  className="p-3 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-all border border-white/20 shadow-lg hover:scale-105"
                  title="Download"
                >
                  <Download className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-3 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-all border border-white/20 shadow-lg hover:scale-105"
                  title="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
              />
              <p className="mt-4 text-white/80 font-medium">
                {previewImage.name}
              </p>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}