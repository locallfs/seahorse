"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  activeFilterCount,
  findActiveOption,
  resolveApplyHref,
  type FiltersConfig,
} from "@/lib/filtersModel";

// One consolidated "Filters" control for listing pages. Replaces the rows of
// chips that used to sit across the top of the page. Every option navigates
// to the SAME page/URL its old chip did, so selections live in the URL:
// refreshing or sharing a filtered page keeps them, and pagination-free grids
// behave exactly as before.
//
// Desktop: dropdown panel under the button. Mobile: full-width bottom drawer.
// Accessible: real button with aria-expanded/controls, labelled dialog,
// radio-group semantics, Escape closes, focus moves in on open and returns to
// the button on close. It never covers the site header and never traps focus
// (Escape, backdrop, Close, Apply, and Clear all exit).
export default function FiltersPanel({
  config,
  activeValue,
}: {
  config: FiltersConfig;
  activeValue: string | null;
}) {
  const router = useRouter();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  // Staged selection: editing here changes nothing until "Apply Filters".
  // Closing without applying discards edits, so reopening always shows the
  // real (URL-driven) selections.
  const [pending, setPending] = useState<string | null>(activeValue);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const count = activeFilterCount(activeValue);
  const activeOption = findActiveOption(config, activeValue);

  const openPanel = () => {
    setPending(activeValue);
    setOpen(true);
  };
  const closePanel = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", onKey);
    // Move focus into the panel so keyboard users land on the controls.
    panelRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closePanel]);

  const apply = () => {
    const href = resolveApplyHref(config, pending);
    closePanel(false);
    router.push(href);
  };
  const clearAll = () => {
    setPending(null);
    closePanel(false);
    router.push(config.clearHref);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? closePanel() : openPanel())}
        className="inline-flex items-center gap-2 px-4 py-2 rounded border border-white/25 text-white text-xs tracking-wider uppercase font-medium hover:border-white/60 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Filters{count > 0 ? ` (${count})` : ""}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {activeOption && (
        <span className="ml-3 text-xs text-white/70">
          Active: <span className="text-[#FFD700] font-medium">{activeOption.label}</span>
        </span>
      )}

      {open && (
        <>
          {/* Backdrop (mobile drawer + click-away on desktop). Sits BELOW the
              fixed site header's layer, so navigation stays visible/usable. */}
          <div
            className="fixed inset-0 z-30 bg-black/50 md:bg-transparent"
            aria-hidden="true"
            onClick={() => closePanel(false)}
          />
          <div
            id={panelId}
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-label="Product filters"
            className="z-40 bg-ocean-900 border border-white/15 shadow-2xl
                       fixed inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-xl p-5
                       md:absolute md:inset-x-auto md:bottom-auto md:left-0 md:top-full md:mt-2 md:w-[26rem] md:max-h-[70vh] md:rounded-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white tracking-wide uppercase">Filters</p>
              <button
                type="button"
                onClick={() => closePanel()}
                className="text-white/70 hover:text-white text-sm px-2 py-1"
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>

            <div role="radiogroup" aria-label="Filter options" className="space-y-5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={`${panelId}-filter`}
                  checked={pending === null}
                  onChange={() => setPending(null)}
                  className="accent-[#FFD700]"
                />
                <span className={`text-sm ${pending === null ? "text-[#FFD700] font-semibold" : "text-white"}`}>
                  {config.clearLabel}
                </span>
              </label>
              {config.groups.map((group) => (
                <fieldset key={group.title}>
                  <legend className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-medium mb-2">
                    {group.title}
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {group.options.map((o) => {
                      const selected = pending === o.value;
                      return (
                        <label key={o.value} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name={`${panelId}-filter`}
                            checked={selected}
                            onChange={() => setPending(o.value)}
                            className="accent-[#FFD700]"
                          />
                          <span
                            className={`text-sm ${selected ? "text-[#FFD700] font-semibold" : "text-white"}`}
                            aria-current={activeValue === o.value ? "true" : undefined}
                          >
                            {o.label}
                            {activeValue === o.value ? (
                              <span className="sr-only"> (currently active)</span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={clearAll}
                className="px-4 py-2 text-xs tracking-wider uppercase font-medium rounded border border-white/25 text-white hover:border-white/60 transition-colors"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={apply}
                className="px-5 py-2 text-xs tracking-wider uppercase font-semibold rounded bg-[#FFD700] text-black hover:brightness-110 transition-all"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
