"use client"

import { startTransition, useMemo, useState } from "react"
import { Bot, Loader2, SendHorizonal, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { aiService } from "@/lib/services/ai-service"
import type { AiChatMessage } from "@/lib/types"

function initialPrompts(page?: string) {
  if (page === "conflicts") {
    return [
      "Which conflict should I fix first?",
      "Can you explain the overload risk?",
      "What is the safest auto-reschedule candidate?",
    ]
  }

  return [
    "Why is the quality score not higher?",
    "What should I fix before generation?",
    "Summarize the timetable risks for me.",
  ]
}

export function AssistantPanel({
  page,
  title = "AI scheduling assistant",
  description = "Ask for priorities, tradeoffs, or a quick reading of the current timetable state.",
}: {
  page?: string
  title?: string
  description?: string
}) {
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      role: "assistant",
      content: "I can help explain schedule quality, predict blockers before generation, and point you to the best next fix.",
    },
  ])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [prompts, setPrompts] = useState(initialPrompts(page))

  const visibleMessages = useMemo(() => messages.slice(-6), [messages])

  const sendMessage = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || isSending) {
      return
    }

    const nextHistory = [...messages, { role: "user" as const, content: trimmed }]
    setMessages(nextHistory)
    setInput("")
    setIsSending(true)

    startTransition(() => {
      void aiService.chat(trimmed, nextHistory, page).then((response) => {
        setMessages((current) => [...current, { role: "assistant", content: response.reply }])
        if (response.suggestedPrompts.length > 0) {
          setPrompts(response.suggestedPrompts)
        }
        setIsSending(false)
      })
    })
  }

  return (
    <Card className="glass-panel section-ring rounded-[1.5rem]">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
            <Bot className="size-5 text-violet-300" />
          </div>
          <div>
            <CardTitle className="text-xl text-white">{title}</CardTitle>
            <CardDescription className="text-slate-400">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[340px] space-y-3 overflow-y-auto pr-1">
          {visibleMessages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === "assistant"
                  ? "rounded-[1.15rem] border border-violet-500/18 bg-violet-500/10 p-4 text-sm leading-6 text-violet-50/90"
                  : "rounded-[1.15rem] border border-white/8 bg-white/4 p-4 text-sm leading-6 text-slate-200"
              }
            >
              <p className="mb-2 font-data text-[0.68rem] uppercase tracking-[0.22em] text-slate-400">
                {message.role === "assistant" ? "Assistant" : "You"}
              </p>
              <p>{message.content}</p>
            </div>
          ))}
          {isSending ? (
            <div className="rounded-[1.15rem] border border-violet-500/18 bg-violet-500/10 p-4 text-sm text-violet-100">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Thinking through the timetable...
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-slate-300 transition hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white"
              onClick={() => void sendMessage(prompt)}
            >
              <Sparkles className="mr-1 inline size-3" />
              {prompt}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask the assistant about conflicts, quality, or auto-rescheduling..."
            className="min-h-24 rounded-2xl border-white/8 bg-white/4 text-slate-100"
          />
          <div className="flex justify-end">
            <Button
              className="rounded-2xl"
              onClick={() => void sendMessage(input)}
              disabled={isSending || !input.trim()}
            >
              {isSending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
