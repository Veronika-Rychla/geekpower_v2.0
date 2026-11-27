"use client";

import { Check, ChevronDown, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/dates";
import type { SavedStamp, SublessonVersionSummary } from "@/lib/lessons";

interface VersionHistoryMenuProps {
  current: SavedStamp;
  versions: SublessonVersionSummary[];
  /** The version loaded into the editor, or null for the current one. */
  loadedGuid: string | null;
  disabled?: boolean;
  onSelectCurrent: () => void;
  onSelectVersion: (version: SublessonVersionSummary) => void;
}

/** Lists a section's saved versions; picking one loads it into the editor (nothing is saved until Save). */
export function VersionHistoryMenu({
  current,
  versions,
  loadedGuid,
  disabled,
  onSelectCurrent,
  onSelectVersion,
}: VersionHistoryMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
          />
        }
      >
        <History />
        History
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Saved versions</DropdownMenuLabel>
          <VersionItem
            stamp={current}
            label="Current"
            selected={loadedGuid === null}
            onClick={onSelectCurrent}
          />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {versions.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              No earlier versions yet. Each save keeps the previous one (up to
              10).
            </p>
          ) : (
            versions.map((version) => (
              <VersionItem
                key={version.guid}
                stamp={version}
                selected={loadedGuid === version.guid}
                onClick={() => onSelectVersion(version)}
              />
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function VersionItem({
  stamp,
  label,
  selected,
  onClick,
}: {
  stamp: SavedStamp;
  label?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem onClick={onClick}>
      <Check className={selected ? undefined : "invisible"} />
      <span className="flex min-w-0 flex-col">
        <span>
          {formatDateTime(stamp.savedAt)}
          {label && <span className="text-muted-foreground"> · {label}</span>}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {stamp.savedBy ?? "Unknown author"}
        </span>
      </span>
    </DropdownMenuItem>
  );
}
