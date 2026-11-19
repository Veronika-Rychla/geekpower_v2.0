"use client";

import { useLayoutEffect, useState, type ReactElement } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ClampedTextProps {
  text: string;
  /** The element that shows the text; its classes do the clamping (e.g. `line-clamp-2`). */
  render: ReactElement;
}

/** Text clamped by its `render` element's classes, with the full text in a tooltip only when it is cut off. */
export function ClampedText({ text, render }: ClampedTextProps) {
  // Callback ref into state: the trigger is typed as a button but renders `render`'s element
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [isClamped, setIsClamped] = useState(false);

  useLayoutEffect(() => {
    if (!el) return;

    const measure = () =>
      setIsClamped(el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);

    measure();
    // Width changes (window resize, layout shifts) change how many lines the text needs
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, text]);

  return (
    <Tooltip disabled={!isClamped}>
      <TooltipTrigger ref={setEl} render={render}>
        {text}
      </TooltipTrigger>
      {/*
        w-max sizes the popup from its text, not from the space left where it first renders
        (before positioning), so wrapping and height don't jump when it moves into place.
        Scrolling sits on an inner div so the popup's arrow isn't clipped. The popup stays
        hoverable, so long text can be scrolled.
      */}
      <TooltipContent className="block w-max max-w-[min(28rem,calc(100vw-2rem))]">
        <div className="max-h-80 overflow-y-auto overscroll-contain break-words whitespace-pre-wrap">{text}</div>
      </TooltipContent>
    </Tooltip>
  );
}
