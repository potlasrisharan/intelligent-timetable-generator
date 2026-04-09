"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { WandSparkles, Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { scheduleService } from "@/lib/services/schedule-service"
import { envConfig } from "@/lib/config"

export function EditorActions() {
  const router = useRouter()
  const [isResolving, setIsResolving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleResolveOpenSlots = async () => {
    setIsResolving(true)
    try {
      await scheduleService.triggerGenerate("partial")
      // Quick mock delay to show UI loading
      await new Promise(r => setTimeout(r, 800))
      router.refresh() // Reload server component to fetch latest entries
    } catch {
      alert("Failed to re-solve open slots")
    } finally {
      setIsResolving(false)
    }
  }

  const handleExport = async (type: "pdf" | "excel") => {
    setIsExporting(true)
    try {
      const res = await fetch(`${envConfig.apiBaseUrl}/export/${type}?version_id=latest`)
      const data = await res.json()
      alert(data.message || `Exported to ${type.toUpperCase()} successfully.`)
    } catch {
      alert(`Network error exporting ${type.toUpperCase()}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="rounded-full border-white/45 bg-[rgba(255,255,255,0.01)] text-[#f8fafc]" disabled={isExporting}>
             {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export Timetable
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 border-white/45 text-[#94a3b8]">
          <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer hover:bg-[rgba(255,255,255,0.02)] hover:text-[#f8fafc]">
            <FileText className="mr-2 size-4 text-red-400" />
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("excel")} className="cursor-pointer hover:bg-[rgba(255,255,255,0.02)] hover:text-[#f8fafc]">
            <FileSpreadsheet className="mr-2 size-4 text-emerald-400" />
            Export as Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        className="rounded-full bg-[rgba(147,197,253,0.38)] text-[#f8fafc] hover:bg-[rgba(147,197,253,0.5)]"
        onClick={handleResolveOpenSlots}
        disabled={isResolving}
      >
        {isResolving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <WandSparkles className="size-4" />
        )}
        {isResolving ? "Resolving Open Slots..." : "Re-solve open slots"}
      </Button>
    </div>
  )
}
