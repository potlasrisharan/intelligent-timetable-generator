import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConflictList } from "@/components/conflicts/conflict-list"
import { scheduleService } from "@/lib/services/schedule-service"

export default async function ConflictsPage() {
  const conflicts = await scheduleService.getConflicts()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Scheduling / conflicts"
        title="Conflicts"
        description="Review open scheduling issues and apply fixes before publishing."
        actions={
          <StatusBadge tone="warning">{conflicts.length} open items</StatusBadge>
        }
      />

      <ConflictList initialConflicts={conflicts} />
    </div>
  )
}
