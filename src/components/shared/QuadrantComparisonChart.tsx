"use client";

import {
  CartesianGrid,
  LabelList,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { DialogComparisonPoint } from "@/types/dialog";

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DialogComparisonPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-md border bg-white p-3 text-sm shadow-lg">
      <p className="font-semibold">{point.label}</p>
      <p className="mt-1 text-slate-600">{point.detail}</p>
      <p className="mt-1 text-slate-500">{point.category}</p>
    </div>
  );
}

export function QuadrantComparisonChart({
  title,
  description,
  points,
  xLabel,
  yLabel,
  xThreshold,
  yThreshold,
  riskMode = false,
}: {
  title: string;
  description: string;
  points: DialogComparisonPoint[];
  xLabel: string;
  yLabel: string;
  xThreshold: number;
  yThreshold: number;
  riskMode?: boolean;
}) {
  return (
    <section className="rounded-lg border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700">Perlu perhatian</span>
      </div>
      {points.length === 0 ? <p className="mt-4 text-sm text-slate-600">Tiada data sepadan.</p> : null}
      <div className="mt-4 h-80 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 24, right: 20, bottom: 28, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            {riskMode ? (
              <ReferenceArea x1={0} x2={xThreshold} y1={yThreshold} y2={100} fill="#fff1f2" strokeOpacity={0} />
            ) : (
              <ReferenceArea x1={0} x2={xThreshold} y1={0} y2={yThreshold} fill="#fff7ed" strokeOpacity={0} />
            )}
            <ReferenceLine x={xThreshold} stroke="#94a3b8" strokeDasharray="4 4" />
            <ReferenceLine y={yThreshold} stroke="#94a3b8" strokeDasharray="4 4" />
            <XAxis
              type="number"
              dataKey="x"
              name={xLabel}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              label={{ value: xLabel, position: "insideBottom", offset: -18 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yLabel}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              label={{ value: yLabel, angle: -90, position: "insideLeft" }}
            />
            <ZAxis type="number" dataKey="risk" range={[70, 260]} />
            <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={points} fill={riskMode ? "#be123c" : "#0f766e"}>
              <LabelList dataKey="label" position="top" className="fill-slate-700 text-xs" />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
