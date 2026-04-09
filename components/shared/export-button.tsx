"use client"

import { useState } from "react"
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { envConfig } from "@/lib/config"

export function ExportTimetableButton() {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (type: "pdf" | "excel") => {
    setIsExporting(true)
    try {
      const res = await fetch(`${envConfig.apiBaseUrl}/export/${type}?version_id=latest`)
      
      const contentType = res.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json()
        alert(data.message || `Exported to ${type.toUpperCase()} successfully.`)
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `timetable_export.${type === "excel" ? "csv" : "pdf"}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert(`Network error exporting ${type.toUpperCase()}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-full border-white/45 bg-[rgba(255,255,255,0.18)] text-[#1a1a1a]" disabled={isExporting}>
            {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Export Timetable
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 border-white/45 text-[#334155]">
        <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer hover:bg-[rgba(255,255,255,0.22)] hover:text-[#1a1a1a]">
          <FileText className="mr-2 size-4 text-red-400" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")} className="cursor-pointer hover:bg-[rgba(255,255,255,0.22)] hover:text-[#1a1a1a]">
          <FileSpreadsheet className="mr-2 size-4 text-emerald-400" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
