import { GoogleGenAI, Type } from "@google/genai";
import { TaskType, DurationUnit, Priority } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface AIResponseTask {
  title: string;
  description: string;
  estimatedValue: number;
  estimatedUnit: string;
  priority: string;
  substeps: string[];
}

export const generateTaskBreakdown = async (taskDescription: string, type: TaskType) => {
  try {
    const prompt = `
      I need to plan a task: "${taskDescription}".
      This is a ${type === TaskType.DAILY ? 'short-term daily task' : 'long-term project'}.
      
      Please analyze this request and provide a structured plan.
      If it's a complex project, break it down into manageable sub-steps.
      Suggest a realistic duration and priority.
      
      For Duration Unit:
      - Use 'minutes' or 'hours' for DAILY tasks.
      - Use 'days' or 'weeks' for LONG_TERM tasks.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            estimatedValue: { type: Type.NUMBER },
            estimatedUnit: { type: Type.STRING, enum: ['minutes', 'hours', 'days', 'weeks'] },
            priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
            substeps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "estimatedValue", "estimatedUnit", "priority"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as AIResponseTask;
      
      // Map string unit to Enum
      let unit = DurationUnit.MINUTES;
      switch (data.estimatedUnit) {
        case 'hours': unit = DurationUnit.HOURS; break;
        case 'days': unit = DurationUnit.DAYS; break;
        case 'weeks': unit = DurationUnit.WEEKS; break;
      }

      let priority = Priority.MEDIUM;
      switch (data.priority) {
        case 'low': priority = Priority.LOW; break;
        case 'high': priority = Priority.HIGH; break;
      }

      return {
        title: data.title,
        description: data.description,
        duration: { value: data.estimatedValue, unit },
        priority,
        substeps: data.substeps || []
      };
    }
    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};