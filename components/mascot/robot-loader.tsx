"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { MascotArt } from "@/components/mascot/mascot-art";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/components/i18n-provider";

/** Fast loads only ever see a plain spinner; the robot comes out for slower ones. */
const ROBOT_AFTER_MS = 500;
/** After this long it's most likely Neon waking up, so say so. */
const SLOW_AFTER_MS = 6000;
const MESSAGE_EVERY_MS = 2200;

interface RobotLoaderProps {
  /** "page" fills the main area; "inline" fits inside a content column. */
  size?: "page" | "inline";
  className?: string;
}

/**
 * Loading screen: a plain spinner at first, and if the page still isn't there
 * after ROBOT_AFTER_MS, the robot doing a little show with rotating jokes.
 */
export function RobotLoader({ size = "page", className }: RobotLoaderProps) {
  const dictionary = useDictionary();
  const t = dictionary.robot;
  const messages = t.messages;
  const [showRobot, setShowRobot] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const robotTimer = setTimeout(() => setShowRobot(true), ROBOT_AFTER_MS);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => {
      clearTimeout(robotTimer);
      clearTimeout(slowTimer);
    };
  }, []);

  // Jokes rotate only once the robot is out, so the first one gets its full time
  useEffect(() => {
    if (!showRobot) return;
    const rotate = setInterval(() => setMessageIndex((index) => (index + 1) % messages.length), MESSAGE_EVERY_MS);
    return () => clearInterval(rotate);
  }, [showRobot, messages.length]);

  if (!showRobot) {
    return (
      <div
        role="status"
        className={cn(
          "flex flex-1 items-center justify-center",
          size === "page" ? "min-h-[60vh] py-16" : "min-h-80 py-10",
          className,
        )}
      >
        <Loader2 aria-hidden className="size-6 animate-spin text-muted-foreground" />
        <span className="sr-only">{dictionary.common.loading}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "robot-loader-enter flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center",
        size === "page" ? "min-h-[60vh] py-16" : "min-h-80 py-10",
        className,
      )}
    >
      <div className={cn("relative", size === "page" ? "size-40" : "size-28")}>
        <div className="robot-loader-routine size-full">
          <MascotArt animated reading screen="loading" />
        </div>
        {/* the byte it keeps tossing */}
        <span
          aria-hidden
          className="robot-loader-byte absolute top-[22%] left-[18%] rounded-[3px] px-1 font-mono text-[9px] leading-tight font-bold"
          style={{ background: "var(--theme-accent-500)", color: "var(--theme-accent-900)" }}
        >
          01
        </span>
      </div>

      <div className="flex min-h-12 flex-col items-center gap-1">
        <p key={messageIndex} className="robot-message text-sm font-medium text-foreground">
          {messages[messageIndex % messages.length]}
        </p>
        {slow && (
          <p className="robot-message text-xs text-muted-foreground">{t.slow}</p>
        )}
      </div>
      <span className="sr-only">{dictionary.common.loading}</span>
    </div>
  );
}
