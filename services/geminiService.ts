
import OpenAI from "openai";
import { GeneratedPipeline } from "../types";

const apiKey = import.meta.env.VITE_API_KEY as string | undefined;
const apiBase = import.meta.env.VITE_API_BASE as string | undefined;
const model = (import.meta.env.VITE_MODEL as string | undefined) ?? "gwdg.mistral-large-instruct";

if (!apiKey) {
  throw new Error("Missing VITE_API_KEY. Please set it in .env.local.");
}

const client = new OpenAI({
  apiKey,
  baseURL: apiBase,
  dangerouslyAllowBrowser: true
});

const MAX_REFERENCE_CHARS = 12000;

const buildPrompt = (
  prompt: string,
  referenceFile?: { name: string; content: string },
  suggestion?: string,
  previousCode?: string
) => {
  let finalPrompt = `Primary Goal: ${prompt}\n\n`;

  if (referenceFile) {
    const content = referenceFile.content.length > MAX_REFERENCE_CHARS
      ? `${referenceFile.content.slice(0, MAX_REFERENCE_CHARS)}\n\n[Truncated after ${MAX_REFERENCE_CHARS} characters]`
      : referenceFile.content;
    finalPrompt += `Context: User provided a reference file named "${referenceFile.name}" with content:\n${content}\n\n`;
  }

  if (suggestion && previousCode) {
    finalPrompt += `Iterative Improvement: The user rejected the previous version.\nPrevious Code: ${previousCode}\n\nUser Suggestion: ${suggestion}\n\nPlease regenerate the pipeline architecture incorporating this feedback.\n\n`;
  }

  return finalPrompt.trim();
};

const parseJsonOrThrow = (content: string) => {
  try {
    return JSON.parse(content.trim());
  } catch {
    const first = content.indexOf("{");
    const last = content.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      throw new Error("AI response did not contain JSON.");
    }
    const slice = content.slice(first, last + 1);
    return JSON.parse(slice.trim());
  }
};

export const generatePipeline = async (
  prompt: string,
  referenceFile?: { name: string; content: string },
  suggestion?: string,
  previousCode?: string
): Promise<GeneratedPipeline> => {
  const userPrompt = buildPrompt(prompt, referenceFile, suggestion, previousCode);
  const systemPrompt = `You are an expert Data Engineer specializing in Data-Driven Engineering (DDE) and Model-Based Systems Engineering (MBSE).
Your task is to analyze engineering requirements and generate a complete, executable Airflow DAG and its supporting infrastructure.

Return ONLY a valid JSON object with this structure (no markdown, no extra text):
{
  "name": "Pipeline Name",
  "description": "Short explanation",
  "airflowCode": "Complete Python Airflow code",
  "requirements": ["List of pip requirements"],
  "dockerConfig": "Suggested Dockerfile content",
  "steps": [
    { "id": "task_id", "name": "Task Name", "description": "What it does", "dependencies": ["prev_task_id"] }
  ],
  "monitoringMetrics": ["Suggested metrics to track"],
  "validationSummary": [
    { "type": "info|warning|error|success", "message": "string" }
  ]
}

Focus on best practices: modularity, error handling, logging, and data validation (using libraries like Great Expectations if applicable).`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "generated_pipeline",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              airflowCode: { type: "string" },
              requirements: { type: "array", items: { type: "string" } },
              dockerConfig: { type: "string" },
              steps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" },
                    dependencies: { type: "array", items: { type: "string" } }
                  },
                  required: ["id", "name", "description", "dependencies"],
                  additionalProperties: false
                }
              },
              monitoringMetrics: { type: "array", items: { type: "string" } },
              validationSummary: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    message: { type: "string" }
                  },
                  required: ["type", "message"],
                  additionalProperties: false
                }
              }
            },
            required: [
              "name",
              "description",
              "airflowCode",
              "requirements",
              "dockerConfig",
              "steps",
              "monitoringMetrics"
            ],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response generated from AI");
    }

    return parseJsonOrThrow(content) as GeneratedPipeline;
  } catch (error) {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response generated from AI");
    }

    return parseJsonOrThrow(content) as GeneratedPipeline;
  }
};



