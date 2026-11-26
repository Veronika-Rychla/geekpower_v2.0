import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import "./mascot.css";

/*
 * The GeekPower robot, ported from the public website
 * (geekpower_website/components/mascot/MascotArt.tsx). Keep the drawing in
 * sync with it. Colours come from the --mascot-* variables in mascot.css,
 * because this app doesn't have the website's accent palette.
 */

export interface EyeOffset {
  x: number;
  y: number;
}

/** What the chest screen shows. */
export type MascotScreen = "code" | "loading" | "shouting";

export interface MascotArtProps {
  /** "calm" is the default mascot; "wild" is the over-excited one. */
  variant?: "calm" | "wild";
  /** Idle hover, blink, antenna light and orbiting planet (CSS, honours reduced motion). */
  animated?: boolean;
  /** Bolder outline and no glow, for small sizes like the logo. */
  thin?: boolean;
  /** Calm only: the ringed planet and the hover shadow. Off = robot alone, centred. */
  scenery?: boolean;
  screen?: MascotScreen;
  /** Calm only: the pupils look left and right, like reading. */
  reading?: boolean;
  /** Wild only: big wide eyes. */
  staring?: boolean;
  /** Wild only: nervous sweat drop. */
  sweating?: boolean;
  /** Wild only: pupil offsets for the left and right eye (roughly -4…4). */
  eyes?: { left: EyeOffset; right: EyeOffset };
  className?: string;
}

const stroke = "var(--mascot-300)";
const body = "var(--mascot-900)";
const accent = "var(--mascot-500)";
const lens = "var(--mascot-800)";

/* Shared geometry (120×120 viewBox). The robot itself spans x 17–88. */
const HEAD =
  "M31 33 H79 Q88 33 88 42 V63 Q88 72 79 72 H31 Q22 72 22 63 V42 Q22 33 31 33 Z";
const TORSO =
  "M31.4 77.4 C45 76.6 65 76 75.8 77.9 C78.9 83.6 56.9 111.6 49.5 111.5 C42 111.4 34.3 83.1 31.4 77.4 Z";
const LEFT_LENS = { cx: 32, cy: 53 };
const RIGHT_LENS = { cx: 70, cy: 53 };
/** Shift that centres the robot when it is drawn without the planet. */
const CENTRED = "translate(7.5 1)";

const line = {
  stroke,
  strokeWidth: 1.6,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

function Screen({ kind }: { kind: MascotScreen }) {
  switch (kind) {
    case "loading":
      return (
        <g className="mascot-loading-dots" fill={body}>
          <circle cx={46.4} cy={86.5} r={1.5} />
          <circle cx={51.9} cy={86.5} r={1.5} />
          <circle cx={57.4} cy={86.5} r={1.5} />
        </g>
      );
    case "shouting":
      return (
        <path
          d="M44 86.5 L46.3 83 L48.6 90 L51 82.6 L53.4 90.4 L55.8 83 L58 88.5 L59.8 86.5"
          fill="none"
          {...line}
          stroke={body}
        />
      );
    case "code":
      return (
        <path
          d="M46.5 84 L44.2 86.5 L46.5 89 M53.3 83.6 L50.5 89.4 M57.3 84 L59.6 86.5 L57.3 89"
          fill="none"
          {...line}
          stroke={body}
        />
      );
  }
}

/** Torso with its chest screen. */
function Torso({ children }: { children: ReactNode }) {
  return (
    <g className="mascot-torso">
      <path d={TORSO} fill={body} {...line} />
      <rect
        x={41.4}
        y={80.3}
        width={21}
        height={12.5}
        rx={3}
        fill={accent}
        {...line}
      />
      {children}
    </g>
  );
}

export function MascotArt({
  variant = "calm",
  animated = false,
  thin = false,
  scenery = true,
  screen = variant === "wild" ? "shouting" : "code",
  reading = false,
  staring = false,
  sweating = false,
  eyes = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
  className,
}: MascotArtProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      width="100%"
      height="100%"
      aria-hidden="true"
      className={cn(
        "mascot block overflow-visible",
        thin
          ? "mascot-thin"
          : variant === "wild"
            ? "mascot-glow-strong"
            : "mascot-glow",
        animated && "mascot-animated",
        reading && "mascot-reading",
        className,
      )}
    >
      {variant === "calm" ? (
        <>
          {scenery && (
            <>
              <ellipse
                className="mascot-shadow"
                cx={50}
                cy={117}
                rx={11}
                ry={1.6}
                fill="var(--mascot-600)"
                opacity={0.5}
              />
              <g className="mascot-planet">
                <g transform="rotate(-14 101 24)">
                  <path d="M88 24 A13 3 0 0 1 114 24" fill="none" {...line} />
                  <circle cx={101} cy={24} r={7} fill={lens} {...line} />
                  <path d="M88 24 A13 3 0 0 0 114 24" fill="none" {...line} />
                </g>
              </g>
            </>
          )}
          <g transform={scenery ? undefined : CENTRED}>
            <g className="mascot-body">
              <Torso>
                <Screen kind={screen} />
              </Torso>
              <g className="mascot-head">
                {/* antenna */}
                <path
                  d="M55 28.5 C55 17 60 10.5 69.5 10.5"
                  fill="none"
                  {...line}
                />
                <circle
                  className="mascot-light"
                  cx={73.8}
                  cy={12.2}
                  r={4.2}
                  fill={accent}
                  {...line}
                />
                <rect
                  x={46}
                  y={28.5}
                  width={16}
                  height={4.5}
                  rx={1.2}
                  fill={body}
                  {...line}
                />
                <path d={HEAD} fill={body} {...line} />
                {/* glasses */}
                <circle
                  cx={LEFT_LENS.cx}
                  cy={LEFT_LENS.cy}
                  r={15}
                  fill={lens}
                  {...line}
                />
                <circle
                  cx={RIGHT_LENS.cx}
                  cy={RIGHT_LENS.cy}
                  r={15}
                  fill={lens}
                  {...line}
                />
                <path d="M47 52.5 Q51 50.5 55 52.5" fill="none" {...line} />
                {/* slightly cross-eyed, like the original drawing */}
                <g className="mascot-pupils">
                  <g className="mascot-eye">
                    <ellipse
                      cx={36.7}
                      cy={52}
                      rx={3}
                      ry={4}
                      fill="var(--mascot-text)"
                    />
                  </g>
                  <g className="mascot-eye">
                    <ellipse
                      cx={63.3}
                      cy={52}
                      rx={3}
                      ry={4}
                      fill="var(--mascot-text)"
                    />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </>
      ) : (
        <g transform={CENTRED}>
          <Torso>
            <Screen kind={screen} />
          </Torso>
          {/* short-circuiting antenna */}
          <path
            d="M55 28.5 L51 22 L58 18 L52.5 12.5 L59 8"
            fill="none"
            {...line}
          />
          <circle cx={61} cy={6.5} r={4.2} fill={accent} {...line} />
          <path
            className="mascot-spark"
            d="M66.5 2 L69.5 0 M67.5 7 L71 7.5 M63 0.5 L64 -2.5"
            fill="none"
            {...line}
          />
          <rect
            x={46}
            y={28.5}
            width={16}
            height={4.5}
            rx={1.2}
            fill={body}
            {...line}
          />
          <path d={HEAD} fill={body} {...line} />
          {/* googly glasses, mismatched */}
          <circle
            cx={LEFT_LENS.cx}
            cy={LEFT_LENS.cy}
            r={staring ? 17 : 15}
            fill="white"
            {...line}
          />
          <circle
            cx={LEFT_LENS.cx + eyes.left.x * 2}
            cy={LEFT_LENS.cy + eyes.left.y * 2}
            r={staring ? 2 : 4.5}
            fill="black"
          />
          <circle
            cx={RIGHT_LENS.cx}
            cy={RIGHT_LENS.cy}
            r={staring ? 16 : 13}
            fill="white"
            {...line}
          />
          <circle
            cx={RIGHT_LENS.cx + eyes.right.x * 2}
            cy={RIGHT_LENS.cy + eyes.right.y * 2}
            r={staring ? 1.6 : 3}
            fill="black"
          />
          <path d="M47 52.5 Q51 50.5 55 52.5" fill="none" {...line} />
          {sweating && (
            <path
              className="mascot-sweat"
              d="M16 30 C13 35 13 38 16 38 C19 38 19 35 16 30 Z"
              fill={stroke}
            />
          )}
        </g>
      )}
    </svg>
  );
}
