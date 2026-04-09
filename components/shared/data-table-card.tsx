import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function DataTableCard({
  title,
  subtitle,
  headers,
  rows,
}: {
  title: string
  subtitle?: string
  headers: string[]
  rows: ReactNode[][]
}) {
  return (
    <Card className="glass-panel section-ring rounded-[1.4rem]">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl text-white">{title}</CardTitle>
        {subtitle ? <p className="text-sm text-slate-400">{subtitle}</p> : null}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-white/8 hover:bg-transparent">
              {headers.map((header) => (
                <TableHead key={header} className="text-[0.72rem] uppercase tracking-[0.22em] text-slate-400">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index} className="border-white/8 hover:bg-white/4">
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex} className="py-4 text-slate-200">
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
