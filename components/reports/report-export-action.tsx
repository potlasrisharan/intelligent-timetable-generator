"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { envConfig } from "@/lib/config"

export function ReportExportAction({ label }: { label: string }) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    const type = label.toLowerCase().includes("excel") ? "excel" : "pdf"
    
    try {
      const res = await fetch(`${envConfig.apiBaseUrl}/export/${type}?version_id=latest`)
      const contentType = res.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json()
        alert(data.message || `Exported ${label} successfully.`)
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `timetable_export_${label.replace(/\s+/g, '_').toLowerCase()}.${type === "excel" ? "csv" : "pdf"}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert(`Network error exporting ${label}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleExport}
      disabled={isExporting}
      className="mt-5 rounded-2xl border-white/8 bg-white/5 hover:bg-white/10 text-slate-100 transition-colors"
    >
      {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {isExporting ? "Preparing..." : "Prepare export"}
    </Button>
  )
}
