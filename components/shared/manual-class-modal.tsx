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
    } catch (e) {
      alert("Failed to assign class manually")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Add Class Manually</DialogTitle>
          <DialogDescription className="text-slate-400">
            Assign a class to {day} - {timeslotId.toUpperCase()} for section {sectionId}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="text-xs text-slate-300">Course Code</Label>
            <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="CS101" className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-slate-300">Course Name</Label>
            <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Introduction to Computer Science" className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-slate-300">Faculty Name</Label>
            <Input value={facultyName} onChange={(e) => setFacultyName(e.target.value)} placeholder="Dr. Smith" className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-slate-300">Room Name</Label>
            <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="L-101" className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-slate-300">Type</Label>
            <div className="flex gap-2 p-1 bg-white/5 rounded-md w-fit border border-white/10">
              <button onClick={() => setType("THEORY")} className={`px-3 py-1 rounded-sm text-xs transition-colors ${type === "THEORY" ? "bg-white/10 text-white font-medium" : "text-slate-400 hover:bg-white/5"}`}>THEORY</button>
              <button onClick={() => setType("LAB")} className={`px-3 py-1 rounded-sm text-xs transition-colors ${type === "LAB" ? "bg-white/10 text-white font-medium" : "text-slate-400 hover:bg-white/5"}`}>LAB</button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={onClose} className="hover:bg-white/5 hover:text-white" disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-500 text-white" disabled={isSubmitting}>
             {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
             Save Placement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
