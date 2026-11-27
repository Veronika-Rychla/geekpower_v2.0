"use client";

import { useRef, useState } from "react";
import { Palette, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDictionary } from "@/components/i18n-provider";
import {
  applyTheme,
  readThemeColors,
  resetTheme,
  restoreTheme,
  saveTheme,
  themeColors,
  themePresets,
  type ThemeColor,
  type ThemeColors,
  type ThemePreset,
} from "@/lib/theme";

type ThemePickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the popover hangs from, when it has no `trigger` of its own (e.g. the user menu). */
  anchor?: React.RefObject<Element | null>;
  /** A button that toggles the picker. */
  trigger?: React.ReactElement;
};

/**
 * The same color picker as on the public website; the pick is shared with it
 * (see lib/theme.ts). Colors preview live, and anything not applied is
 * dropped when the picker closes.
 */
export function ThemePicker({
  open,
  onOpenChange,
  anchor,
  trigger,
}: ThemePickerProps) {
  const close = () => {
    restoreTheme();
    onOpenChange(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      {trigger && <PopoverTrigger render={trigger} />}
      <PopoverContent
        anchor={anchor}
        align="end"
        sideOffset={8}
        className="max-h-[calc(100vh-86px)] w-[min(340px,calc(100vw-32px))] gap-5 overflow-y-auto p-6"
      >
        <ThemePickerPanel
          onCancel={close}
          onApplied={() => onOpenChange(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

/** A palette button with the picker, for when there's no user menu to open it from. */
export function ThemePickerButton() {
  const [open, setOpen] = useState(false);
  const t = useDictionary().theme;

  return (
    <ThemePicker
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={t.button}>
          <Palette />
        </Button>
      }
    />
  );
}

/** Mounts each time the picker opens, so it starts from the colors in effect. */
function ThemePickerPanel({
  onCancel,
  onApplied,
}: {
  onCancel: () => void;
  onApplied: () => void;
}) {
  const t = useDictionary().theme;
  const [colors, setColors] = useState<ThemeColors>(readThemeColors);
  const applying = useRef(false);

  const preview = (next: ThemeColors) => {
    setColors(next);
    applyTheme(next);
  };

  const change = (color: ThemeColor, value: string) =>
    preview({ ...colors, [color]: value });

  const apply = () => {
    if (applying.current) return;
    applying.current = true;
    saveTheme(colors);
    onApplied();
  };

  const reset = () => {
    resetTheme();
    setColors(readThemeColors());
  };

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <PopoverTitle className="text-lg">{t.title}</PopoverTitle>
          <PopoverDescription>{t.intro}</PopoverDescription>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="-mt-1 -mr-2"
          aria-label={t.cancel}
          onClick={onCancel}
        >
          <X />
        </Button>
      </div>

      <div
        className="grid grid-cols-3 gap-2"
        role="group"
        aria-label={t.presetsLabel}
      >
        {(Object.entries(themePresets) as [ThemePreset, ThemeColors][]).map(
          ([id, preset]) => (
            <button
              key={id}
              type="button"
              onClick={() => preview(preset)}
              aria-pressed={themeColors.every((c) => colors[c] === preset[c])}
              className="flex flex-col items-start gap-1.5 rounded-md p-2 text-left text-xs ring-1 ring-border hover:bg-muted aria-pressed:ring-primary"
            >
              <span
                className="flex h-5 w-full overflow-hidden rounded-sm"
                style={{ background: preset.bg }}
              >
                <span className="flex-1" />
                <span
                  className="w-1/3"
                  style={{ background: preset.surface }}
                />
                <span className="w-1/4" style={{ background: preset.accent }} />
              </span>
              {t.presets[id]}
            </button>
          ),
        )}
      </div>

      <div className="flex flex-col gap-2">
        {themeColors.map((color) => (
          <label
            key={color}
            className="flex cursor-pointer items-center gap-2.5 rounded-md p-2 ring-1 ring-border hover:bg-muted"
          >
            <input
              type="color"
              value={colors[color]}
              onChange={(e) => change(color, e.target.value)}
              className="size-8 shrink-0 cursor-pointer rounded-sm border-0 bg-transparent p-0"
            />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-sm">{t.colors[color]}</span>
              <span className="font-mono text-xs text-muted-foreground uppercase">
                {colors[color]}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          variant="ghost"
          className="mr-auto text-muted-foreground"
          onClick={reset}
        >
          {t.reset}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button onClick={apply}>{t.apply}</Button>
      </div>
    </>
  );
}
