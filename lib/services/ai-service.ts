import type {
  AiChatMessage,
  AiChatResponse,
  AutoRescheduleResult,
  ConflictPredictionResponse,
  ConstraintRule,
  QualityReview,
} from "@/lib/types"
import { getJsonWithFallback, postJsonWithFallback } from "@/lib/services/api-client"

const AI_TIMEOUT_MS = 15000

const fallbackQualityReview: QualityReview = {
  generatedAt: "local fallback",
  score: 88,
  summary: "Quality looks solid overall, but the next improvement should focus on unresolved conflicts and draft course readiness.",
  strengths: [
    "Compactness is already healthy for the strongest sections.",
    "Room utilization is within a workable range for most teaching spaces.",
  ],
  suggestions: [
    {
      id: "fallback-quality-conflict",
      title: "Resolve the top open conflict",
      detail: "The biggest quality jump will come from clearing the most severe unresolved issue first.",
      impact: "high",
      category: "quality",
    },
    {
      id: "fallback-quality-draft",
      title: "Finalize draft course data",
      detail: "Confirming draft and review courses before generation will reduce avoidable scheduling churn.",
      impact: "medium",
      category: "quality",
    },
  ],
  assistantNote: "Resolve the highest-severity blocker first, then regenerate with cleaner course inputs.",
}

const fallbackConflictPrediction: ConflictPredictionResponse = {
  generatedAt: "local fallback",
  summary: "A few blockers are likely before the next generation run.",
  predictions: [
    {
      id: "fallback-pred-capacity",
      title: "Capacity pressure is likely",
      detail: "Combined or high-enrollment blocks may need a larger room before generation succeeds cleanly.",
      severity: "high",
      confidence: 82,
      affected: ["Large sections", "Shared rooms"],
      suggestion: "Reserve larger rooms early for the heaviest combined classes.",
    },
    {
      id: "fallback-pred-overload",
      title: "Faculty overload may recur",
      detail: "At least one faculty timetable appears likely to exceed the comfortable daily limit.",
      severity: "medium",
      confidence: 76,
      affected: ["High-load faculty"],
      suggestion: "Spread theory blocks across more days before the next full run.",
    },
  ],
  assistantNote: "Fix the high-confidence room and overload blockers before you run the next full generation.",
}

export const aiService = {
  async getQualityReview(): Promise<QualityReview> {
    return getJsonWithFallback("/ai/quality-review", fallbackQualityReview, {
      timeoutMs: AI_TIMEOUT_MS,
    })
  },

  async getConflictPrediction(): Promise<ConflictPredictionResponse> {
    return getJsonWithFallback("/ai/conflict-prediction", fallbackConflictPrediction, {
      timeoutMs: AI_TIMEOUT_MS,
    })
  },

  async getConstraintRules(): Promise<ConstraintRule[]> {
    return getJsonWithFallback("/ai/constraint-rules", [], {
      timeoutMs: AI_TIMEOUT_MS,
    })
  },

  async chat(message: string, history: AiChatMessage[] = [], page?: string): Promise<AiChatResponse> {
    return postJsonWithFallback(
      "/ai/chat",
      { message, history, page },
      {
        ok: true,
        reply: "I can help summarize risks, explain the quality score, and suggest what to fix before the next generation.",
        suggestedPrompts: [
          "What should I fix before the next generation?",
          "Why is the quality score not higher?",
          "Which conflict is the most urgent?",
        ],
      },
      { timeoutMs: AI_TIMEOUT_MS },
    )
  },

  async autoReschedule(conflictId: string): Promise<AutoRescheduleResult> {
    return postJsonWithFallback(
      `/ai/auto-reschedule/${conflictId}`,
      {},
      {
        ok: true,
        applied: false,
        conflictId,
        resolution: "",
        summary: "AI could not apply an automatic reschedule right now.",
        changes: [],
        assistantNote: "Try a manual fix or refresh the AI analysis after updating the schedule inputs.",
      },
      { timeoutMs: AI_TIMEOUT_MS },
    )
  },

  async autoRescheduleAll(): Promise<{ ok: boolean; resolvedCount: number; failedCount: number; message: string }> {
    return postJsonWithFallback(
      "/ai/auto-reschedule-all",
      {},
      {
        ok: true,
        resolvedCount: 0,
        failedCount: 0,
        message: "Fallback auto-reschedule all resolved 0 conflicts.",
      },
      { timeoutMs: 30000 }
    )
  },
}
