"use client"

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts"

import { Card } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"

import type { DashboardView } from "./use-dashboard"

const config = { percent: { label: "Faltas", color: "var(--chart-3)" } } satisfies ChartConfig

// Dia sem dado ("–") ganha só o tracinho de base
const BASE_BAR = 0.4

export function AbsenceChart({ days, phrase }: { days: DashboardView["absenceDays"]; phrase: string | null }) {
  const data = days.map((d) => ({ ...d, bar: d.percent ?? BASE_BAR }))
  const summary = days.map((d) => `${d.label} ${d.text}`).join(", ")

  return (
    <Card role="region" aria-labelledby="absence-title">
      <div className="flex flex-col gap-1 px-4">
        <h2 id="absence-title" className="titulo-card">
          Em que dia mais alunos faltam
        </h2>
        {phrase && <p className="apoio text-muted-foreground">{phrase}</p>}
      </div>
      <ChartContainer
        config={config}
        className="mx-4 aspect-auto h-[170px] w-auto"
        role="img"
        aria-label={`Faltas a cada 100 alunos fixos: ${summary}`}
      >
        <BarChart data={data} margin={{ top: 20, right: 0, bottom: 0, left: 0 }} barCategoryGap={8}>
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
                fontWeight={data[index]?.peak ? 900 : 700}
                fill={data[index]?.peak ? "var(--foreground)" : "var(--muted-foreground)"}
              >
                {payload.value}
              </text>
            )}
          />
          <Bar dataKey="bar" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.percent === null ? "var(--chart-4)" : d.peak ? "var(--chart-1)" : "var(--chart-3)"} />
            ))}
            <LabelList dataKey="text" position="top" fontSize={11} fontWeight={900} fill="var(--foreground)" />
          </Bar>
        </BarChart>
      </ChartContainer>
      <p className="legenda px-4 text-muted-foreground">
        Quantos avisaram falta a cada 100 alunos fixos, na média das últimas 8 semanas. – = a rota não roda nesse dia.
      </p>
    </Card>
  )
}
