"use client";
import React from "react";

export type InventoryGridProps = {
  items: Record<string, number>;
  orderedKeys?: string[]; // If provided, controls item placement order
  slots?: number; // total slots (default 48 for 6x8)
  className?: string;
  // Events
  onCardDoubleClick?: (key: string) => void;
  onCardContextMenu?: (key: string, count: number, e: React.MouseEvent) => void;
  onCardDragStart?: (key: string, e: React.DragEvent) => void;
  // Icon renderer
  renderIcon?: (key: string) => React.ReactNode;
  // Optional per-slot title builder
  titleFor?: (key: string, count: number) => string;
  // Container drag/drop (e.g., target area handlers)
  onContainerDragOver?: (e: React.DragEvent) => void;
  onContainerDrop?: (e: React.DragEvent) => void;
};

export default function InventoryGrid({ items, orderedKeys, slots = 48, className = "", onCardDoubleClick, onCardContextMenu, onCardDragStart, renderIcon, titleFor, onContainerDragOver, onContainerDrop }: InventoryGridProps) {
  const keys = React.useMemo(() => {
    const arr = orderedKeys && orderedKeys.length ? orderedKeys : Object.keys(items);
    return arr.filter((k) => (items[k] ?? 0) > 0);
  }, [items, orderedKeys]);

  const total = Math.max(slots, keys.length);
  const cells = Array.from({ length: total }).map((_, idx) => {
    const key = keys[idx];
    if (!key) {
      // Empty placeholder
      return (
        <div key={`empty-${idx}`} className="relative aspect-square rounded-lg border border-white/10 bg-gradient-to-br from-gray-900/30 to-black/10" />
      );
    }
    const count = items[key] ?? 0;
    return (
      <div
        key={key + ":" + idx}
        className="relative aspect-square rounded-lg border border-white/10 bg-gradient-to-br from-gray-900 to-black/60 p-2"
        draggable={!!onCardDragStart}
        onDragStart={onCardDragStart ? (e) => onCardDragStart(key, e) : undefined}
        onDoubleClick={onCardDoubleClick ? () => onCardDoubleClick(key) : undefined}
        onContextMenu={onCardContextMenu ? (e) => { e.preventDefault(); onCardContextMenu(key, count, e); } : undefined}
        title={titleFor ? titleFor(key, count) : undefined}
      >
        <div className="flex h-full w-full items-center justify-center">
          {renderIcon ? renderIcon(key) : <span className="text-xs font-semibold">{key.substring(0, 2).toUpperCase()}</span>}
        </div>
        <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] font-semibold text-white/90 ring-1 ring-white/10">{count}</span>
      </div>
    );
  });

  return (
    <div
      className={`grid grid-cols-6 gap-3 sm:grid-cols-8 rounded border border-white/10 bg-black/40 p-3 ${className}`}
      onDragOver={onContainerDragOver}
      onDrop={onContainerDrop}
    >
      {cells}
    </div>
  );
}
