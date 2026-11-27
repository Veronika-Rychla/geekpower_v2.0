// Visitor-picked color theme, shared with the public website
// (geekpower_website/lib/theme.ts). Both sites store the six picked colors in
// the same cookie on the parent domain, so a theme picked on geekpower.cz also
// applies on app.geekpower.cz and the other way round. Keep the cookie name,
// its format, the color list and the presets in sync with the website.
//
// The cookie itself is written by lib/shared-cookie.ts. Preset and color
// names are translated in messages/*.json (`theme`).
//
// The defaults live in app/globals.css as `--theme-*` variables. A saved theme
// overrides them inline on <html>, and the shadcn tokens are derived from them.

import { writeSharedCookie } from "@/lib/shared-cookie";

/** `<bg>-<surface>-<text>-<accent>-<neutral>-<section-glow>`, hex without `#`. */
export const themeCookie = "gp-theme";
const cookieMaxAge = 60 * 60 * 24 * 365;

/** Colors the picker exposes, in cookie order. */
export const themeColors = [
  "bg",
  "surface",
  "text",
  "accent",
  "neutral",
  "section-glow",
] as const;
export type ThemeColor = (typeof themeColors)[number];
export type ThemeColors = Record<ThemeColor, string>;

/** Ready-made color sets (same as the website's). */
export const themePresets = {
  amethyst: {
    bg: "#17121f",
    surface: "#221a2e",
    text: "#ece6f5",
    accent: "#a87ee8",
    neutral: "#9a90ab",
    "section-glow": "#3d2466",
  },
  violet: {
    bg: "#130f1c",
    surface: "#1e1830",
    text: "#ebe7f7",
    accent: "#8b5cf6",
    neutral: "#918ba8",
    "section-glow": "#35227a",
  },
  royal: {
    bg: "#120a24",
    surface: "#1d1238",
    text: "#efe6ff",
    accent: "#a46bff",
    neutral: "#958aae",
    "section-glow": "#4a1d9e",
  },
  indigo: {
    bg: "#0e0b1a",
    surface: "#181330",
    text: "#e8e4ff",
    accent: "#7c5cff",
    neutral: "#8e89b0",
    "section-glow": "#2e1f80",
  },
  iris: {
    bg: "#10121f",
    surface: "#1a1d30",
    text: "#e6e8f7",
    accent: "#8e88f0",
    neutral: "#8f93ad",
    "section-glow": "#2b2f80",
  },
  wisteria: {
    bg: "#15141c",
    surface: "#201f2a",
    text: "#eae9f2",
    accent: "#a99be6",
    neutral: "#9a98ab",
    "section-glow": "#3a3466",
  },
  neon: {
    bg: "#0b0710",
    surface: "#150e1e",
    text: "#f3eaff",
    accent: "#bf5af2",
    neutral: "#9a8cab",
    "section-glow": "#4d1477",
  },
  orchid: {
    bg: "#1b1220",
    surface: "#271a2d",
    text: "#f4e9f7",
    accent: "#d28cf0",
    neutral: "#a896ad",
    "section-glow": "#4a2257",
  },
  dusk: {
    bg: "#1b1420",
    surface: "#271d2e",
    text: "#f3e9f0",
    accent: "#b07fd0",
    neutral: "#a8939f",
    "section-glow": "#5a2a5e",
  },
  plum: {
    bg: "#1a1118",
    surface: "#261924",
    text: "#f2e6ef",
    accent: "#c06bb0",
    neutral: "#a5919f",
    "section-glow": "#4f1f47",
  },
  eggplant: {
    bg: "#1d1220",
    surface: "#2a1a2e",
    text: "#f1e6f2",
    accent: "#9d5bb8",
    neutral: "#a28fa6",
    "section-glow": "#4b1e55",
  },
  mauve: {
    bg: "#1a1619",
    surface: "#262025",
    text: "#efe9ee",
    accent: "#b48aa8",
    neutral: "#a0959d",
    "section-glow": "#4a3346",
  },
  midnight: {
    bg: "#0a0812",
    surface: "#141022",
    text: "#ffffff",
    accent: "#8b5cf6",
    neutral: "#9590aa",
    "section-glow": "#2c1a66",
  },
  ultraviolet: {
    bg: "#08050f",
    surface: "#130c20",
    text: "#ffffff",
    accent: "#9d4dff",
    neutral: "#968cad",
    "section-glow": "#3d1580",
  },
  nebula: {
    bg: "#0d0a16",
    surface: "#18122a",
    text: "#ffffff",
    accent: "#b37dff",
    neutral: "#9a91b0",
    "section-glow": "#3b2178",
  },
  obsidian: {
    bg: "#050407",
    surface: "#100d16",
    text: "#ffffff",
    accent: "#7c4dff",
    neutral: "#8f8a9c",
    "section-glow": "#24145c",
  },
  galaxy: {
    bg: "#0c0716",
    surface: "#170e28",
    text: "#ffffff",
    accent: "#a855f7",
    neutral: "#9a8db0",
    "section-glow": "#43177a",
  },
  velvet: {
    bg: "#100812",
    surface: "#1c1020",
    text: "#ffffff",
    accent: "#c04cf0",
    neutral: "#a08ca8",
    "section-glow": "#4a1660",
  },
  lavender: {
    bg: "#f3f0f8",
    surface: "#fbfaff",
    text: "#231d30",
    accent: "#6d4cc2",
    neutral: "#6e6880",
    "section-glow": "#ddd2f5",
  },
  lilac: {
    bg: "#f6f2fa",
    surface: "#ffffff",
    text: "#2a2233",
    accent: "#8455c9",
    neutral: "#776f82",
    "section-glow": "#e6d9f7",
  },
  heather: {
    bg: "#efeaf0",
    surface: "#f9f6fa",
    text: "#2b2430",
    accent: "#7a4a8c",
    neutral: "#75697a",
    "section-glow": "#dccbe3",
  },
} satisfies Record<string, ThemeColors>;
export type ThemePreset = keyof typeof themePresets;

// paintTheme, readThemeCookie and themeVars must not reference anything
// outside themselves: themeScript inlines their source into <head>.

/** Every CSS variable a set of picked colors overrides, ramps included. */
export function themeVars(colors: ThemeColors): Record<string, string> {
  const channels = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const mix = (hex: string, amount: number, toward: number) =>
    "#" +
    channels(hex)
      .map((c) =>
        Math.round(toward + (c - toward) * amount)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  const [r, g, b] = channels(colors.bg);
  // 100–300 read as "text on the ground" and 700–900 as "tinted fills", so on
  // a light ground the ramps run the other way.
  const flip = 0.299 * r + 0.587 * g + 0.114 * b > 140;
  // Mix ratios of the base color, matched to the default ramps:
  // 100–400 mix with white, 600–900 with black.
  const steps = [
    [100, 0.08, 255],
    [200, 0.24, 255],
    [300, 0.43, 255],
    [400, 0.7, 255],
    [600, 0.8, 0],
    [700, 0.62, 0],
    [800, 0.44, 0],
    [900, 0.29, 0],
  ];
  const vars: Record<string, string> = {
    "--theme-bg": colors.bg,
    "--theme-surface": colors.surface,
    "--theme-text": colors.text,
    "--theme-section-glow": colors["section-glow"],
  };
  for (const ramp of ["accent", "neutral"] as const) {
    const hex = colors[ramp];
    vars[`--theme-${ramp}`] = hex;
    vars[`--theme-${ramp}-500`] = hex;
    for (const [n, amount, toward] of steps) {
      vars[`--theme-${ramp}-${flip ? 1000 - n : n}`] = mix(hex, amount, toward);
    }
  }
  return vars;
}

/** The saved colors, or null for the defaults. */
export function readThemeCookie(name: string): ThemeColors | null {
  const match = document.cookie.match(
    new RegExp(
      "(?:^|;\\s*)" + name + "=([0-9a-fA-F]{6}(?:-[0-9a-fA-F]{6}){5})(?:;|$)",
    ),
  );
  if (!match) return null;
  const [bg, surface, text, accent, neutral, glow] = match[1]
    .toLowerCase()
    .split("-")
    .map((hex) => "#" + hex);
  return { bg, surface, text, accent, neutral, "section-glow": glow };
}

/** Sets colors on <html> (null = the defaults), and the `dark` class to match the ground. */
export function paintTheme(
  colors: ThemeColors | null,
  varsOf: typeof themeVars,
) {
  const root = document.documentElement;
  for (const name of Array.from(root.style)) {
    if (name.startsWith("--theme-")) root.style.removeProperty(name);
  }
  if (!colors) {
    root.classList.add("dark");
    return;
  }
  const vars = varsOf(colors);
  for (const name in vars) root.style.setProperty(name, vars[name]);
  const [r, g, b] = [1, 3, 5].map((i) =>
    parseInt(colors.bg.slice(i, i + 2), 16),
  );
  root.classList.toggle("dark", 0.299 * r + 0.587 * g + 0.114 * b <= 140);
}

/** The saved theme as an inline <head> script, so it applies before first paint. */
export const themeScript = `try{(${paintTheme})((${readThemeCookie})(${JSON.stringify(themeCookie)}),${themeVars})}catch(e){}`;

/** The colors currently in effect, whether default or saved. */
export function readThemeColors(): ThemeColors {
  const style = getComputedStyle(document.documentElement);
  // A canvas normalizes any CSS color to the #rrggbb that <input type="color"> needs.
  const ctx = document.createElement("canvas").getContext("2d")!;
  const colors = {} as ThemeColors;
  for (const color of themeColors) {
    ctx.fillStyle = style
      .getPropertyValue(
        color === "neutral" ? "--theme-neutral-500" : `--theme-${color}`,
      )
      .trim();
    colors[color] = ctx.fillStyle;
  }
  return colors;
}

/** Preview colors without saving them. */
export function applyTheme(colors: ThemeColors) {
  paintTheme(colors, themeVars);
}

/** Drop an unsaved preview: back to the saved theme, or the defaults. */
export function restoreTheme() {
  paintTheme(readThemeCookie(themeCookie), themeVars);
}

function writeThemeCookie(value: string | null) {
  writeSharedCookie(themeCookie, value, cookieMaxAge);
}

export function saveTheme(colors: ThemeColors) {
  applyTheme(colors);
  writeThemeCookie(
    themeColors.map((color) => colors[color].slice(1)).join("-"),
  );
}

/** Back to the defaults from globals.css. */
export function resetTheme() {
  writeThemeCookie(null);
  paintTheme(null, themeVars);
}
