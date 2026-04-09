"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { scheduleService } from "@/lib/services/schedule-service"
import { Loader2 } from "lucide-react"

type Props = {
  isOpen: boolean
  onClose: () => void
  day: string
  timeslotId: string
  sectionId: string
  onSuccess: () => void
}

export function ManualClassModal({ isOpen, onClose, day, timeslotId, sectionId, onSuccess }: Props) {
  const [courseCode, setCourseCode] = useState("")
  const [courseName, setCourseName] = useState("")
  const [facultyName, setFacultyName] = useState("")
  const [roomName, setRoomName] = useState("")
  const [type, setType] = useState<"THEORY" | "LAB">("THEORY")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!courseCode || !facultyName || !roomName) {
        alert("Please fill necessary fields (Code, Faculty, Room)")
        return
    }
    
    setIsSubmitting(true)
    try {
      await scheduleService.addManualEntry({
        day,
        timeslotId,
        sectionId,
        courseCode,
        courseName: courseName || courseCode,
        facultyName,
        roomName,
        type
      })
      onSuccess()
      onClose()
    } catch {
      alert("Failed to assign class manually")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] border-white/50 text-[#1a1a1a]">
        <DialogHeader>
          <DialogTitle>Add Class Manually</DialogTitle>
          <DialogDescription className="text-[#526277]">
            Assign a class to {day} - {timeslotId.toUpperCase()} for section {sectionId}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="text-xs text-[#475569]">Course Code</Label>
            <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="CS101" className="border-white/45 bg-[rgba(255,255,255,0.2)] text-[#1a1a1a]" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-[#475569]">Course Name</Label>
            <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Introduction to Computer Science" className="border-white/45 bg-[rgba(255,255,255,0.2)] text-[#1a1a1a]" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-[#475569]">Faculty Name</Label>
            <Input value={facultyName} onChange={(e) => setFacultyName(e.target.value)} placeholder="Dr. Smith" className="border-white/45 bg-[rgba(255,255,255,0.2)] text-[#1a1a1a]" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-[#475569]">Room Name</Label>
            <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="L-101" className="border-white/45 bg-[rgba(255,255,255,0.2)] text-[#1a1a1a]" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-[#475569]">Type</Label>
            <div className="flex w-fit gap-2 rounded-full border border-white/45 bg-[rgba(255,255,255,0.16)] p-1">
              <button onClick={() => setType("THEORY")} className={`rounded-full px-3 py-1 text-xs transition-colors ${type === "THEORY" ? "border border-white/45 bg-[rgba(89,148,255,0.26)] font-medium text-[#1a1a1a]" : "text-[#64748b] hover:bg-[rgba(255,255,255,0.18)]"}`}>THEORY</button>
              <button onClick={() => setType("LAB")} className={`rounded-full px-3 py-1 text-xs transition-colors ${type === "LAB" ? "border border-white/45 bg-[rgba(89,148,255,0.26)] font-medium text-[#1a1a1a]" : "text-[#64748b] hover:bg-[rgba(255,255,255,0.18)]"}`}>LAB</button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={onClose} className="text-[#475569] hover:bg-[rgba(255,255,255,0.2)] hover:text-[#1a1a1a]" disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-[rgba(89,148,255,0.32)] text-[#1a1a1a] hover:bg-[rgba(89,148,255,0.42)]" disabled={isSubmitting}>
             {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
             Save Placement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
