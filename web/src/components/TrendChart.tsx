"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { THRESHOLD_C, type Reading } from "@/lib/types";

type Props = {
  history: Reading[];
};

export function TrendChart({ history }: Props) {
  const data = history.map((r) => ({
    time: new Date(r.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    temp: r.t,
    hum: r.h,
  }));

  return (
    <section className="panel">
      <p className="eyebrow">Last hour trend</p>
      <h2 className="section-title mt-1">Temperature history</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {data.length === 0
          ? "Leave the bridge running to fill this chart."
          : `${data.length} live samples in the last hour.`}
      </p>
      <div className="mt-4 h-64 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md bg-[var(--panel-soft)] text-sm text-[var(--muted)]">
            No readings yet — start the Python bridge (or `--sim`).
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(28, 42, 36, 0.08)" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#5c6b64" }} minTickGap={40} />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "#5c6b64" }}
                unit="°"
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "#f7f3eb",
                  border: "1px solid #d5cdc0",
                  borderRadius: 8,
                }}
              />
              <ReferenceLine y={THRESHOLD_C} stroke="#c45c26" strokeDasharray="4 4" label="25°C" />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="#1f6b4a"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
