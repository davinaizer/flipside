"use client";

import { useSyncExternalStore } from "react";
import { FOCUS_RING, PRESSED } from "@/ui/button/button-class";
import { Icon } from "@/ui/icons/Icon";
import { readCollapsed, subscribeCollapsed, writeCollapsed } from "./sidebar-state";

/** Collapse toggle in the top bar (U4). It shares the sidebar's state through sidebar-state, so the two never pass props. */
export function SidebarToggle() {
  // The server snapshot is expanded, so hydration matches; the remembered choice applies right after.
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  return <SidebarToggleView collapsed={collapsed} onToggle={() => writeCollapsed(!collapsed)} />;
}

export function SidebarToggleView({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label="Sidebar"
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className={`flex size-11 items-center justify-center rounded-full text-on-surface hover:bg-surface-container-high active:bg-surface-container-highest ${PRESSED} ${FOCUS_RING}`}
    >
      <Icon name={collapsed ? "panelLeftOpen" : "panelLeft"} />
    </button>
  );
}
