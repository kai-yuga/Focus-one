import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Task, TimeBlock, ChatMessage, ScheduleResult, ChatScheduleResult, ReplanResult, LifeDomain } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const ensureApiKey = () => {
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
  }
};

/**
 * Generates a structured daily schedule based on sophisticated constraints.
 */
export const generateDailyPlan = async (
  tasks: Task[], 
  dayStartTime: string = "08:00", 
  dayEndTime: string = "22:00",
  context: string = "Standard planning"
): Promise<ScheduleResult> => {
  ensureApiKey();

  const prompt = `
    You are an elite productivity strategist. Create a strict, high-execution daily schedule.
    
    PARAMETERS:
    - Window: ${dayStartTime} to ${dayEndTime}
    - Context: ${context}
    - Tasks: ${JSON.stringify(tasks)}

    RULES:
    1. ANCHORS: STRICTLY respect 'fixedTime' for tasks where isFixed=true. They CANNOT move.
    2. PRIORITY: Schedule the 'non-negotiable' task during the highest energy slot available (usually morning) or immediately if replanning.
    3. FLOW: Group flexible tasks into deep work blocks (30-90m). 
    4. RECOVERY: Insert 'break' blocks (5-15m) after deep work. 
    5. SHUTDOWN: Insert a 15m 'Shutdown Routine' at the very end.
    6. NO OVERLAP: Time blocks must strictly not overlap.
    7. DOMAINS: Ensure 'domain' in output blocks matches the task's domain.
    8. REALITY: If tasks don't fit, prioritize Non-Negotiable > High > Fixed > Normal. Drop 'normal' tasks if necessary.

    OUTPUT SCHEMA (JSON):
    Return an object with 'schedule' (array) and 'explanation' (string).
    The explanation should be a calm, strict 2-sentence rationale for the schedule structure.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      explanation: { type: Type.STRING, description: "Strict rationale for the plan." },
      schedule: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING },
            label: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["work", "break", "fixed", "routine"] },
            taskId: { type: Type.STRING, nullable: true },
            energyLevel: { type: Type.STRING, enum: ["high", "medium", "low"], nullable: true },
            domain: { type: Type.STRING, enum: ["Academic", "Skill", "Health", "Spirituality", "Routine"], nullable: true }
          },
          required: ["startTime", "endTime", "label", "type"]
        }
      }
    },
    required: ["schedule", "explanation"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are a rigid, execution-focused scheduler. Do not coddle the user. Prioritize output."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const data = JSON.parse(text) as { schedule: Omit<TimeBlock, 'id' | 'isCompleted'>[], explanation: string };
    
    return {
      explanation: data.explanation,
      schedule: data.schedule.map((b, i) => ({
        ...b,
        id: `block-${Date.now()}-${i}`,
        isCompleted: false,
        taskId: b.taskId || null,
        domain: (b.domain as LifeDomain) || 'Routine'
      }))
    };
  } catch (error) {
    console.error("Plan generation failed:", error);
    return { schedule: [], explanation: "AI Generation Failed. Please try again." };
  }
};

/**
 * Adaptive Replan: Can Modify Tasks AND Schedule
 */
export const adaptiveReplan = async (
  tasks: Task[], 
  dayStartTime: string, 
  dayEndTime: string,
  context: string
): Promise<ReplanResult> => {
  ensureApiKey();

  // Safety check: if start time is after end time, assume late night extension
  let safeEndTime = dayEndTime;
  if (dayStartTime >= dayEndTime && dayEndTime !== "23:59") {
      safeEndTime = "23:59";
  }

  const prompt = `
    You are the System Controller. The user needs a schedule adjustment.
    
    CURRENT STATE:
    - Time Now: ${dayStartTime} (Schedule from here onwards)
    - End of Day: ${safeEndTime}
    - Existing Tasks: ${JSON.stringify(tasks)}
    - User Request/Context: "${context}"

    AUTHORITY:
    - You MAY add new tasks if the context implies it (e.g., "Add Gym").
    - You MAY remove tasks if user asks or time is insufficient.
    - You MUST output the FULL list of tasks (old + new) to be tracked.
    - Infer 'domain' (Academic, Skill, Health, Spirituality, Routine) for any new tasks.

    OUTPUT SCHEMA (JSON):
    {
      "explanation": "Brief status update.",
      "tasks": [ ...full list of tasks... ],
      "schedule": [ ...time blocks from ${dayStartTime} to ${safeEndTime}... ]
    }
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      explanation: { type: Type.STRING },
      tasks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            durationMinutes: { type: Type.NUMBER },
            isFixed: { type: Type.BOOLEAN },
            fixedTime: { type: Type.STRING, nullable: true },
            priority: { type: Type.STRING, enum: ["non-negotiable", "high", "normal"] },
            energyLevel: { type: Type.STRING, enum: ["high", "medium", "low"] },
            completed: { type: Type.BOOLEAN },
            domain: { type: Type.STRING, enum: ["Academic", "Skill", "Health", "Spirituality", "Routine"] }
          },
          required: ["id", "title", "durationMinutes", "isFixed", "priority", "energyLevel", "completed", "domain"]
        }
      },
      schedule: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING },
            label: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["work", "break", "fixed", "routine"] },
            taskId: { type: Type.STRING, nullable: true },
            energyLevel: { type: Type.STRING, enum: ["high", "medium", "low"], nullable: true },
            domain: { type: Type.STRING, enum: ["Academic", "Skill", "Health", "Spirituality", "Routine"], nullable: true }
          },
          required: ["startTime", "endTime", "label", "type"]
        }
      }
    },
    required: ["explanation", "tasks", "schedule"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are the execution engine. Maintain state consistency."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    
    const data = JSON.parse(text) as { 
      tasks: Task[], 
      schedule: Omit<TimeBlock, 'id' | 'isCompleted'>[], 
      explanation: string 
    };

    // Fix: Relaxed ID check. If AI returns an ID, use it. If empty, generate new.
    // This prevents mismatch where AI returns "1" but we ignored it because length < 5.
    const finalTasks = data.tasks.map((t, i) => ({
      ...t,
      id: t.id ? t.id : `new-task-${Date.now()}-${i}`
    }));

    const finalSchedule = data.schedule.map((b, i) => {
      let linkedTaskId = b.taskId;
      
      // Verification: Does this taskId exist in finalTasks?
      const taskExists = finalTasks.some(t => t.id === linkedTaskId);
      
      // If not linked or ID invalid, try to link by Title Matching
      if ((!linkedTaskId || !taskExists) && b.type === 'work') {
        const matching = finalTasks.find(t => 
          b.label.toLowerCase().includes(t.title.toLowerCase()) || 
          t.title.toLowerCase().includes(b.label.toLowerCase())
        );
        if (matching) linkedTaskId = matching.id;
      }

      return {
        ...b,
        id: `replan-block-${Date.now()}-${i}`,
        isCompleted: false,
        taskId: linkedTaskId || null,
        domain: (b.domain as LifeDomain) || 'Routine'
      };
    });

    return {
      explanation: data.explanation,
      tasks: finalTasks,
      schedule: finalSchedule
    };

  } catch (e) {
    console.error("Adaptive replan failed", e);
    return { tasks: tasks, schedule: [], explanation: "Replan failed. Please try again." };
  }
};

/**
 * Parses a conversation to extract tasks and build a schedule simultaneously.
 */
export const generateScheduleFromChat = async (
  history: ChatMessage[],
  dayStartTime: string = "08:00",
  dayEndTime: string = "22:00"
): Promise<ChatScheduleResult> => {
  ensureApiKey();

  const prompt = `
    You are a strict, smart productivity coach. The user is telling you about their day.
    Analyze the conversation to:
    1. Extract specific Tasks with domains (Academic, Skill, Health, etc).
    2. Extract Fixed Commitments.
    3. Generate a strict Time-Blocked Schedule.

    CONVERSATION HISTORY:
    ${history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}

    RULES:
    - Infer DOMAINS strictly: 'Studying'->Academic, 'Coding/Trading'->Skill, 'Gym'->Health, 'Meditation'->Spirituality.
    - If user is overwhelmed, cut low-priority tasks.
    - Insert breaks/buffers.
    - DO NOT invent tasks not implied by the user.

    OUTPUT SCHEMA (JSON):
    {
      "explanation": "Short, direct reasoning for the plan.",
      "tasks": [ { "title": "...", "durationMinutes": 60, "isFixed": false, "priority": "high", "energyLevel": "medium", "fixedTime": "HH:MM", "domain": "Academic|Skill|Health|Spirituality|Routine" } ],
      "schedule": [ { "startTime": "HH:MM", "endTime": "HH:MM", "label": "...", "type": "work|break|fixed|routine", "energyLevel": "high|medium|low", "domain": "Academic|Skill|Health|Spirituality|Routine" } ]
    }
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      explanation: { type: Type.STRING },
      tasks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            durationMinutes: { type: Type.NUMBER },
            isFixed: { type: Type.BOOLEAN },
            fixedTime: { type: Type.STRING, nullable: true },
            priority: { type: Type.STRING, enum: ["non-negotiable", "high", "normal"] },
            energyLevel: { type: Type.STRING, enum: ["high", "medium", "low"] },
            domain: { type: Type.STRING, enum: ["Academic", "Skill", "Health", "Spirituality", "Routine"] }
          },
          required: ["title", "durationMinutes", "isFixed", "priority", "energyLevel", "domain"]
        }
      },
      schedule: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING },
            label: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["work", "break", "fixed", "routine"] },
            energyLevel: { type: Type.STRING, enum: ["high", "medium", "low"], nullable: true },
            domain: { type: Type.STRING, enum: ["Academic", "Skill", "Health", "Spirituality", "Routine"], nullable: true }
          },
          required: ["startTime", "endTime", "label", "type"]
        }
      }
    },
    required: ["explanation", "tasks", "schedule"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are a rigid execution coach. Turn talk into a structured plan."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const data = JSON.parse(text) as { 
      tasks: Omit<Task, 'id' | 'completed'>[], 
      schedule: Omit<TimeBlock, 'id' | 'isCompleted' | 'taskId'>[], 
      explanation: string 
    };

    const processedTasks = data.tasks.map((t, i) => ({
      ...t,
      id: `task-${Date.now()}-${i}`,
      completed: false
    }));

    const processedSchedule = data.schedule.map((b, i) => {
      const matchingTask = processedTasks.find(t => 
        b.label.toLowerCase().includes(t.title.toLowerCase()) || 
        t.title.toLowerCase().includes(b.label.toLowerCase())
      );
      return {
        ...b,
        id: `block-${Date.now()}-${i}`,
        isCompleted: false,
        taskId: matchingTask ? matchingTask.id : null,
        domain: (b.domain as LifeDomain) || 'Routine'
      };
    });
    
    return {
      explanation: data.explanation,
      tasks: processedTasks,
      schedule: processedSchedule
    };
  } catch (error) {
    console.error("Chat planning failed:", error);
    return { tasks: [], schedule: [], explanation: "Could not generate plan from conversation." };
  }
};

export const fastChatResponse = async (
  history: ChatMessage[], 
  newMessage: string, 
  context?: string
): Promise<string> => {
  ensureApiKey();

  // HARD RULE: Input Validation
  if (!newMessage.trim() || newMessage.trim().length < 2) {
      return "Could you clarify what you mean?";
  }

  const historyContent = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  // Dynamic system instruction based on context (e.g. for Reflection vs General)
  const baseInstruction = "You are a strict but supportive productivity coach. RULES: 1. Do NOT invent user actions or feelings. 2. If input is empty/meaningless, ask for clarification. 3. Be neutral and fact-based. 4. Keep answers short.";
  const systemInstruction = context 
    ? `You are conducting an End-of-Day Review. CONTEXT OF DAY: ${context}. ${baseInstruction}`
    : baseInstruction;

  try {
    const chat = ai.chats.create({
      model: "gemini-flash-lite-latest",
      history: historyContent,
      config: { systemInstruction }
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text || "Keep pushing forward.";
  } catch (error) {
    return "Connection error. Focus on your task.";
  }
};

export interface AssistantResponse {
  text: string;
  intent: 'NONE' | 'REPLAN' | 'MARK_COMPLETE';
  replanContext?: string;
  taskId?: string;
}

export const getFloatingCoachResponse = async (
  history: ChatMessage[],
  context: string,
  userMessage: string
): Promise<AssistantResponse> => {
  ensureApiKey();

  if (!userMessage.trim()) {
      return { text: "How can I help you?", intent: 'NONE' };
  }

  // Include recent history for context awareness
  const historyText = history.slice(-8).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');

  const prompt = `
    APP CONTEXT:
    ${context}

    CONVERSATION HISTORY:
    ${historyText}

    CURRENT USER INPUT:
    "${userMessage}"

    You are a highly intelligent AI assistant embedded in a daily planner app.
    
    CAPABILITIES:
    1. GENERAL KNOWLEDGE: Answer questions about math, coding, history, science, etc. like a powerful LLM.
    2. APP CONTROL: Detect if the user wants to update their schedule.

    INTENT DETECTION RULES:
    1. MARK_COMPLETE:
       - Only if user explicitly indicates a task is done (e.g., "Done", "Finished", "Tick it").
       - YOU MUST verify the active task ID from context.
       - If valid, return intent "MARK_COMPLETE" with the taskId.
    
    2. REPLAN (Modify/Add/Push):
       - If user wants to change schedule, add tasks, is tired, or wants to push things back.
       - Return intent "REPLAN" with instruction.
    
    3. NONE:
       - EVERYTHING ELSE. General knowledge questions, academic help, definitions, motivation, or random chat.
       - Provide a helpful, intelligent, knowledgeable response in the "text" field.
       - Do not be brief if the user asks for a detailed explanation.

    OUTPUT JSON:
    {
      "text": "Your helpful response or answer here.",
      "intent": "REPLAN" | "MARK_COMPLETE" | "NONE",
      "replanContext": "...",
      "taskId": "..."
    }
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING },
      intent: { type: Type.STRING, enum: ["NONE", "REPLAN", "MARK_COMPLETE"] },
      replanContext: { type: Type.STRING, nullable: true },
      taskId: { type: Type.STRING, nullable: true }
    },
    required: ["text", "intent"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are an intelligent AI assistant. You have full access to general knowledge. You also control the user's schedule. Be helpful, smart, and efficient."
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("No response");
    
    return JSON.parse(text) as AssistantResponse;
  } catch (e) {
    console.error("Floating coach error", e);
    return { text: "I'm having trouble connecting to my brain.", intent: 'NONE' };
  }
};

export const analyzeReflection = async (completedTasks: Task[], reflectionText: string): Promise<string> => {
  ensureApiKey();
  
  // HARD RULE: Client-side Validation for trivial input
  const cleanText = reflectionText.trim();
  if (cleanText.length < 5 || /^[^\w\s]+$/.test(cleanText)) {
      return "Please share 1–2 lines about how today went so I can provide meaningful feedback.";
  }
  
  const prompt = `
    Analyze this student's day based ONLY on the provided data.
    
    DATA:
    - Tasks: ${JSON.stringify(completedTasks)}
    - Reflection: "${reflectionText}"

    STRICT ANTI-HALLUCINATION RULES:
    1. Do NOT say "You felt" or "You realized" unless explicitly stated in the Reflection.
    2. Do NOT invent events.
    3. If the reflection is too vague to analyze, simply ask: "Could you be more specific about what went well?"
    
    If valid, provide a 2-sentence summary:
    1. One thing they did well (based on data/reflection).
    2. One specific adjustment for tomorrow.

    Tone: Neutral, Clarifying, Fact-based.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Good effort today. Rest well.";
  } catch (e) {
    return "Good effort today. Rest well.";
  }
};

/**
 * Generates the Cause-and-Effect Life Summary
 */
export const generateLifeProgressSummary = async (tasks: Task[], schedule: TimeBlock[]): Promise<string> => {
    ensureApiKey();
    
    // Aggregate Data
    const domains = ["Academic", "Skill", "Health", "Spirituality"];
    const stats = domains.map(d => {
        const domainTasks = tasks.filter(t => t.domain === d);
        const completed = domainTasks.filter(t => t.completed).length;
        return `${d}: ${completed}/${domainTasks.length}`;
    }).join(", ");

    const prompt = `
      Data: ${stats}
      Schedule Status: ${schedule.filter(s => s.isCompleted).length} blocks completed.

      Generate a calm, non-judgmental "Overall Life Summary" (max 3 lines).
      Focus on CAUSE and EFFECT between domains.
      Example: "Strong academic focus is stable, but lack of physical activity is reducing energy levels."
      Do NOT gamify. Do NOT use exclamation marks.
      Do NOT invent user feelings or events not in the data.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });
        return response.text || "Tracking data insufficient for deep analysis.";
    } catch (e) {
        return "System analysis unavailable.";
    }
};