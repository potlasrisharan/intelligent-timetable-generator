"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, BrainCircuit, Loader2, ShieldCheck, Sparkles } from "lucide-react"
import { AssistantPanel } from "@/components/ai/assistant-panel"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { aiService } from "@/lib/services/ai-service"
import type { ConflictPredictionResponse, QualityReview } from "@/lib/types"

export function DashboardAiPanels() {
  const [quality, setQuality] = useState<QualityReview | null>(null)
  const [prediction, setPrediction] = useState<ConflictPredictionResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const loadInsights = async () => {
    setLoading(true)
    const [qualityResult, predictionResult] = await Promise.all([
      aiService.getQualityReview(),
      aiService.getConflictPrediction(),
    ])
    setQuality(qualityResult)
    setPrediction(predictionResult)
    setLoading(false)
    toast.info("AI insights updated", { description: `Quality score: ${qualityResult.score}/100` })
  }

  useEffect(() => {
    void loadInsights()
  }, [])

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <AssistantPanel page="dashboard" />

      <div className="space-y-6">
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl text-white">Quality score and suggestions</CardTitle>
                <p className="mt-2 text-sm text-slate-400">
                  AI-backed guidance for the next quality improvement step.
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-2xl border-white/8 bg-white/5 text-slate-100"
                onClick={() => void loadInsights()}
                disabled={loading}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}
                Refresh AI
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading || !quality ? (
              <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Scoring current timetable quality...
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-[1.2rem] border border-emerald-400/18 bg-emerald-400/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-data text-[0.68rem] uppercase tracking-[0.24em] text-emerald-200/70">
                        AI quality score
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-white">{quality.score}/100</p>
                    </div>
                    <StatusBadge tone={quality.score >= 90 ? "healthy" : quality.score >= 75 ? "warning" : "critical"}>
                      Updated {quality.generatedAt}
                    </StatusBadge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-emerald-50/85">{quality.summary}</p>
                </div>

                {quality.strengths.length > 0 ? (
                  <div className="space-y-2">
                    {quality.strengths.map((strength) => (
                      <div key={strength} className="rounded-[1.1rem] border border-white/8 bg-white/4 p-3 text-sm text-slate-300">
                        <ShieldCheck className="mr-2 inline size-4 text-emerald-300" />
                        {strength}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-3">
                  {quality.suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{suggestion.title}</p>
                        <StatusBadge tone={suggestion.impact === "high" ? "critical" : suggestion.impact === "medium" ? "warning" : "active"}>
                          {suggestion.impact} impact
                        </StatusBadge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{suggestion.detail}</p>
                    </div>
                  ))}
                </div>

                {quality.assistantNote ? (
                  <div className="rounded-[1.15rem] border border-violet-500/18 bg-violet-500/10 p-4 text-sm leading-6 text-violet-100/90">
                    <Sparkles className="mr-2 inline size-4 text-violet-300" />
                    {quality.assistantNote}
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Conflict prediction before generation</CardTitle>
            <p className="text-sm text-slate-400">
              AI checks the current data and highlights likely blockers before the next run.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading || !prediction ? (
              <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Predicting generation risks...
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-[1.2rem] border border-amber-400/18 bg-amber-400/10 p-4">
                  <p className="text-sm leading-6 text-amber-50/85">{prediction.summary}</p>
                  {prediction.assistantNote ? (
                    <p className="mt-3 text-sm leading-6 text-amber-100">{prediction.assistantNote}</p>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {prediction.predictions.map((item) => (
                    <div key={item.id} className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-medium text-white">{item.title}</p>
                        <div className="flex items-center gap-2">
                          <StatusBadge tone={item.severity === "critical" ? "critical" : item.severity === "high" ? "warning" : "active"}>
                            {item.severity}
                          </StatusBadge>
                          <span className="text-xs text-slate-400">{item.confidence}% confidence</span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
                      <div className="mt-3 rounded-[1rem] border border-amber-300/16 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                        <AlertTriangle className="mr-2 inline size-4" />
                        {item.suggestion}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
