"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Translations } from "@/lib/i18n";
import type { AvailableStep } from "@/types";
import { X, Check, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface StepPickerProps {
  t: Translations;
  open: boolean;
  date: string; // YYYY-MM-DD
  onClose: () => void;
  onAdd: (stepIds: string[]) => void;
}

// ---------------------------------------------------------------------------
// StepRow — individual step with checkbox, project info, and step text
// ---------------------------------------------------------------------------
function StepRow({
  step,
  selected,
  onToggle,
}: {
  step: AvailableStep;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[#334155]/40 transition-colors text-left"
    >
      {/* Checkbox — square with check icon when selected */}
      <span
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
          selected
            ? "bg-[#86EFAC] border-[#86EFAC]"
            : "border-[#475569] bg-transparent"
        }`}
      >
        {selected && <Check className="w-3.5 h-3.5 text-[#0F172A]" strokeWidth={3} />}
      </span>

      <div className="flex-1 min-w-0">
        {/* Project badge — color dot + emoji + project name */}
        {step.project && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: step.project.color }}
            />
            <span className="text-xs">{step.project.emoji}</span>
            <span className="text-xs text-[#64748B] truncate">
              {step.project.name}
            </span>
          </div>
        )}

        {/* Task name (dimmed, smaller) */}
        <p className="text-xs text-[#64748B] truncate">{step.taskName}</p>

        {/* Step text — prefer user-edited text over original */}
        <p className="text-sm text-[#F8FAFC] leading-snug">
          {step.userEditedText || step.text}
        </p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// StepPicker — main modal component
// ---------------------------------------------------------------------------
export default function StepPicker({
  t,
  open,
  date,
  onClose,
  onAdd,
}: StepPickerProps) {
  // -- State -----------------------------------------------------------------
  const [steps, setSteps] = useState<AvailableStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string | null>(null); // null = "All"

  // -- Fetch available steps when modal opens --------------------------------
  /* eslint-disable react-hooks/set-state-in-effect -- Reset+fetch pattern on modal open is intentional */
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setSelectedIds(new Set());
    setActiveFilter(null);

    fetch(`/api/planner/available?date=${date}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSteps(data.steps ?? []);
      })
      .catch(() => {
        if (!cancelled) setSteps([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, date]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // -- Derived data ----------------------------------------------------------

  // Unique projects for filter chips
  const projects = useMemo(() => {
    const map = new Map<string, { id: string; name: string; emoji: string; color: string }>();
    for (const s of steps) {
      if (s.project && !map.has(s.project.id)) {
        map.set(s.project.id, s.project);
      }
    }
    return Array.from(map.values());
  }, [steps]);

  // Steps from yesterday (shown at top with rollover header)
  const yesterdaySteps = useMemo(
    () =>
      steps.filter(
        (s) => s.fromYesterday && (activeFilter === null || s.projectId === activeFilter)
      ),
    [steps, activeFilter]
  );

  // Regular (non-yesterday) steps
  const regularSteps = useMemo(
    () =>
      steps.filter(
        (s) => !s.fromYesterday && (activeFilter === null || s.projectId === activeFilter)
      ),
    [steps, activeFilter]
  );

  // -- Handlers --------------------------------------------------------------

  const toggleStep = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllYesterday = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const s of yesterdaySteps) next.add(s.id);
      return next;
    });
  }, [yesterdaySteps]);

  const handleAdd = useCallback(() => {
    if (selectedIds.size === 0) return;
    onAdd(Array.from(selectedIds));
  }, [selectedIds, onAdd]);

  // -- Don't render anything when closed -------------------------------------
  if (!open) return null;

  return (
    // Fixed overlay with dark backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="relative w-full max-w-lg bg-[#1E293B] border border-[#334155] rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-[#F8FAFC]">
            {t.planner.addSteps}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ---- Project filter chips (horizontally scrollable) ---- */}
        {projects.length > 0 && (
          <div className="px-5 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
            {/* "All" chip */}
            <button
              type="button"
              onClick={() => setActiveFilter(null)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeFilter === null
                  ? "bg-[#86EFAC] text-[#0F172A]"
                  : "bg-[#334155] text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              {t.planner.filterAll}
            </button>

            {/* One chip per project */}
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveFilter(p.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeFilter === p.id
                    ? "bg-[#86EFAC] text-[#0F172A]"
                    : "bg-[#334155] text-[#94A3B8] hover:text-[#F8FAFC]"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
        )}

        {/* ---- Scrollable step list ---- */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {loading ? (
            // Loading spinner
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#86EFAC] animate-spin" />
            </div>
          ) : steps.length === 0 ? (
            // Empty state — all steps already planned
            <p className="text-center text-sm text-[#64748B] py-12">
              {t.planner.noAvailable}
            </p>
          ) : (
            <>
              {/* Yesterday's incomplete steps with rollover header */}
              {yesterdaySteps.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-[#FCD34D]">
                        {t.planner.rolloverTitle}
                      </p>
                      <p className="text-[10px] text-[#64748B]">
                        {t.planner.rolloverSubtitle}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={selectAllYesterday}
                      className="text-xs text-[#86EFAC] hover:text-[#86EFAC]/80 font-medium transition-colors"
                    >
                      {t.planner.selectAll}
                    </button>
                  </div>

                  {yesterdaySteps.map((step) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      selected={selectedIds.has(step.id)}
                      onToggle={() => toggleStep(step.id)}
                    />
                  ))}

                  {/* Divider between yesterday and regular steps */}
                  {regularSteps.length > 0 && (
                    <div className="border-t border-[#334155] my-2 mx-3" />
                  )}
                </div>
              )}

              {/* Regular (non-yesterday) steps */}
              {regularSteps.map((step) => (
                <StepRow
                  key={step.id}
                  step={step}
                  selected={selectedIds.has(step.id)}
                  onToggle={() => toggleStep(step.id)}
                />
              ))}
            </>
          )}
        </div>

        {/* ---- Footer: "Add to plan (N)" button ---- */}
        <div className="px-5 py-4 border-t border-[#334155]">
          <button
            type="button"
            onClick={handleAdd}
            disabled={selectedIds.size === 0}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              selectedIds.size > 0
                ? "bg-[#86EFAC] text-[#0F172A] hover:bg-[#86EFAC]/90"
                : "bg-[#334155] text-[#475569] cursor-not-allowed"
            }`}
          >
            {t.planner.addToPlan}
            {selectedIds.size > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0F172A]/20 text-xs">
                {selectedIds.size}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
