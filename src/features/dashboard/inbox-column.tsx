"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

/** Semantic accent for a category column — drives the icon + count colour. */
export type InboxAccent = "success" | "warning" | "destructive";

const PREVIEW_LIMIT = 4;

const ICON_COLOR: Record<InboxAccent, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

/**
 * One category of the action inbox: a colour-coded card that previews the first
 * few rows and expands the rest inline (no extra route — the dashboard keeps
 * everything in place). `rows` are pre-rendered on the server and sliced here.
 */
export function InboxColumn({
  title,
  icon,
  accent,
  rows,
}: {
  title: string;
  icon: ReactNode;
  accent: InboxAccent;
  rows: ReactNode[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, PREVIEW_LIMIT);
  const hidden = rows.length - visible.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <span className={ICON_COLOR[accent]}>{icon}</span>
          {title}
        </CardTitle>
        <Badge variant={accent}>{rows.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible}
        {hidden > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={cn(
              "flex w-full items-center justify-center gap-1 rounded-md border border-dashed px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground",
              focusRing,
            )}
          >
            <ChevronDown className="size-4" />
            {t.dashboard.showMore(hidden)}
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}
