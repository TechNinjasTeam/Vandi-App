"use client"

import { Bar, BarChart, ReferenceArea, XAxis, YAxis } from "recharts"

import { Card } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"

import type { DashboardView } from "./use-dashboard"

const config = {
  fixed: { label: "Fixos", color: "var(--chart-1)" },
  singles: { label: "Avulsos", color: "var(--chart-2)" },
  empty: { label: "Vazios", color: "var(--chart-4)" },
} satisfies ChartConfig

type Props = { weeks: DashboardView["weeks"]; selected: number; onSelect: (index: number) => void }

export function WeeklyOccupancyChart({ weeks, selected, onSelect }: Props) {
  const detail = weeks[selected]
  const labels = weeks.map((w) => w.label)

  return (
    <Card role="region" aria-labelledby="weekly-title">
      <div className="flex flex-col gap-1 px-4">
        <h2 id="weekly-title" className="titulo-card">
          Lugares ocupados por semana
        </h2>
        <p className="apoio text-muted-foreground">Toque numa barra para ver os números da semana.</p>
      </div>
      <div className="mx-4 flex flex-col gap-2 rounded-lg bg-muted p-3" role="status" aria-live="polite">
        <span className="legenda text-muted-foreground">{detail.detailTitle}</span>
        <div className="grid grid-cols-3 gap-2">
          <Figure swatch="bg-chart-1" label="Fixos" value={detail.fixed} />
          <Figure swatch="bg-chart-2" label="Avulsos" value={detail.singles} />
          <Figure swatch="border border-border bg-card" label="Vazios" value={detail.empty} />
        </div>
      </div>
      <div className="relative mx-4">
        <ChartContainer config={config} className="aspect-auto h-[180px] w-full" aria-hidden="true">
          <BarChart data={weeks.map((w) => ({ ...w.values, label: w.label }))} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap={6}>
            <YAxis hide />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--chart-4)" }}
              interval={0}
              tick={({ x, y, payload, index }) => (
                <text
                  x={x}
                  y={y}
                  dy={14}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={index === selected ? 900 : 700}
                  fill={index === selected ? "var(--foreground)" : "var(--muted-foreground)"}
                >
                  {payload.value}
                </text>
              )}
            />
            <ReferenceArea
              x1={labels[selected]}
              x2={labels[selected]}
              fill="transparent"
              stroke="var(--chart-5)"
              strokeWidth={2}
              radius={8}
              ifOverflow="visible"
            />
            <Bar dataKey="fixed" stackId="week" fill="var(--color-fixed)" isAnimationActive={false} />
            <Bar dataKey="singles" stackId="week" fill="var(--color-singles)" isAnimationActive={false} />
            <Bar dataKey="empty" stackId="week" fill="var(--color-empty)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
        <div className="absolute inset-0 grid grid-cols-8">
          {weeks.map((w, i) => (
            <button
              key={w.values.weekStart}
              type="button"
              aria-pressed={i === selected}
              aria-label={w.ariaLabel}
              onClick={() => onSelect(i)}
              className="h-full rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
            />
          ))}
        </div>
      </div>
    </Card>
  )
}

function Figure({ swatch, label, value }: { swatch: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="legenda flex items-center gap-1.5 text-muted-foreground">
        <span aria-hidden="true" className={`size-3 rounded-[4px] ${swatch}`} />
        {label}
      </span>
      <span className="titulo-card">{value}</span>
    </div>
  )
}
