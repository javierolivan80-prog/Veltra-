"use client";

import { motion } from "framer-motion";
import { Lightbulb, Minus, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { formatDateLong } from "@/lib/format";
import { METRIC_UNIT, STATUS_META, type ProgressAnalysis, type WindowChange } from "@/features/exercises/progressAnalysis";

function WindowTile({ label, change, unit }: { label: string; change: WindowChange; unit: string }) {
  if (!change.hasData) {
    return (
      <div className="bg-surface rounded-2xl p-3.5">
        <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-ink-faint text-lg font-display mt-1">—</p>
        <p className="text-ink-faint text-[10px] mt-0.5">sin datos</p>
      </div>
    );
  }
  const positive = change.delta > 0;
  const negative = change.delta < 0;
  const color = positive ? "text-progress" : negative ? "text-danger" : "text-ink-dim";
  const sign = positive ? "+" : "";
  return (
    <div className="bg-surface rounded-2xl p-3.5">
      <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-display mt-1 tabular-nums ${color}`}>
        {sign}
        {change.delta} <span className="text-xs">{unit}</span>
      </p>
      {change.pct !== null ? (
        <p className={`text-[10px] mt-0.5 font-semibold ${color}`}>
          {sign}
          {change.pct}%
        </p>
      ) : null}
    </div>
  );
}

export function ProgressAnalysisCard({ analysis }: { analysis: ProgressAnalysis }) {
  const meta = STATUS_META[analysis.status];
  const unit = METRIC_UNIT[analysis.metric];
  const TrendIcon = analysis.status === "progressing" ? TrendingUp : analysis.status === "declining" || analysis.status === "plateau" ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-3xl border border-line-subtle bg-surface-raised p-5 flex flex-col gap-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}1e` }}>
            <TrendIcon size={17} style={{ color: meta.color }} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Análisis</p>
            <p className="text-base font-bold" style={{ color: meta.color }}>
              {meta.label}
            </p>
          </div>
        </div>
        {analysis.pr ? (
          <div className="flex items-center gap-1.5 rounded-full bg-record-bg px-3 py-1.5">
            <Trophy size={13} className="text-record" />
            <span className="text-record text-xs font-bold tabular-nums">
              PR {analysis.pr.value} {unit}
            </span>
          </div>
        ) : null}
      </div>

      <p className="text-ink text-[15px] leading-6">{analysis.headline}</p>

      {analysis.pacePerMonth !== null ? (
        <div className="flex items-baseline gap-2">
          <span className="text-ink-dim text-sm">Ritmo medio</span>
          <span className={`text-lg font-display tabular-nums ${analysis.pacePerMonth > 0 ? "text-progress" : analysis.pacePerMonth < 0 ? "text-danger" : "text-ink"}`}>
            {analysis.pacePerMonth > 0 ? "+" : ""}
            {analysis.pacePerMonth} {unit}/mes
          </span>
          {analysis.pacePctPerMonth !== null ? (
            <span className="text-ink-faint text-xs">
              ({analysis.pacePctPerMonth > 0 ? "+" : ""}
              {analysis.pacePctPerMonth}%/mes)
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2.5">
        <WindowTile label="30 días" change={analysis.windows.d30} unit={unit} />
        <WindowTile label="90 días" change={analysis.windows.d90} unit={unit} />
        <WindowTile label="1 año" change={analysis.windows.d365} unit={unit} />
      </div>

      {analysis.expected ? (
        <div
          className="rounded-2xl p-3.5 text-sm leading-5"
          style={{
            backgroundColor: analysis.expected.verdict === "faster" ? "#0e2a21" : analysis.expected.verdict === "slower" ? "#2e1b0c" : "#151515",
            color: analysis.expected.verdict === "faster" ? "#2ce6a0" : analysis.expected.verdict === "slower" ? "#ff9548" : "#a8a8ae",
          }}
        >
          {analysis.expected.note}
        </div>
      ) : null}

      {analysis.recommendations.length > 0 ? (
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Lightbulb size={13} className="text-ai" />
            <span className="text-ai text-xs font-bold uppercase tracking-wider">Recomendaciones</span>
          </div>
          <ul className="flex flex-col gap-2">
            {analysis.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="text-ai mt-1.5 w-1 h-1 rounded-full bg-ai shrink-0" />
                <span className="text-ink-dim text-sm leading-5">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </motion.div>
  );
}
