import { Building2, FlaskConical, Layers3 } from "lucide-react"
import { DataTableCard } from "@/components/shared/data-table-card"
import { MetricCard } from "@/components/shared/metric-card"
import { MiniBarList } from "@/components/shared/mini-bar-list"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { roomService } from "@/lib/services/room-service"

export default async function RoomsPage() {
  const rooms = await roomService.getRooms()

  const rows = rooms.map((room) => [
    <div key={`${room.id}-name`}>
      <p className="font-medium text-white">{room.name}</p>
      <p className="mt-1 text-sm text-slate-400">{room.block}</p>
    </div>,
    <div key={`${room.id}-type`} className="text-slate-300">
      {room.roomType}
    </div>,
    <div key={`${room.id}-capacity`} className="text-slate-300">
      {room.capacity} seats
    </div>,
    <StatusBadge key={`${room.id}-util`} tone={room.utilization > 78 ? "healthy" : room.utilization > 66 ? "warning" : "inactive"}>
      {room.utilization}% used
    </StatusBadge>,
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration / rooms"
        title="Room inventory, capacity, and utilization"
        description="Keep classrooms, labs, and large halls aligned with section size, lab requirements, and utilization targets before you publish."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Rooms in inventory" value={String(rooms.length)} detail="Academic blocks and specialized labs." icon={Building2} progress={72} />
        <MetricCard label="Lab spaces" value={String(rooms.filter((room) => room.roomType === "LAB").length)} detail="Critical for practical chaining." icon={FlaskConical} tone="amber" progress={79} />
        <MetricCard label="Large hall coverage" value={String(rooms.filter((room) => room.capacity >= 100).length)} detail="Supports combined sections and overflow demand." icon={Layers3} progress={64} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DataTableCard
          title="Room allocation board"
          subtitle="Room type, capacity, and current utilization."
          headers={["Room", "Type", "Capacity", "Utilization"]}
          rows={rows}
        />
        <MiniBarList
          title="Top utilized spaces"
          subtitle="Rooms with the highest current usage."
          data={rooms.map((room) => ({ label: room.name, value: room.utilization, emphasis: room.block }))}
          tone="amber"
        />
      </div>
    </div>
  )
}
