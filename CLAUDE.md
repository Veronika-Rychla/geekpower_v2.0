# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Stack

React 19, TypeScript strict, Next.js 16 (App Router) as fullstack app connected to Neon DB. Auth via NextAuth v5 (credentials + JWT), email via Resend, styling with Tailwind v4 + shadcn (Base UI primitives).
<!-- Vitest + Testing Library, -->

## Commands

- `npm run dev`: dev server on http://localhost:3000
- `npm run build`: production build (also type-checks)
- `npm run lint`: ESLint (next core-web-vitals + typescript + prettier)
- `npx tsc --noEmit`: type check only
- `npx prettier --write <path>`: format

Required env (`.env`): `DATABASE_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL` (used to build links in emails), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (blog and lesson image uploads).

# Code Style

- Use 2-space indentation
- Prefer named exports
- All API routes go in app/api/
- Use server actions instead of API routes where possible
- Dates travel through the app as ISO 8601 strings (they must be serializable to cross from server to client components). Convert DB `Date`s at the data layer with `toIso`/`toIsoOrNull`, and format or compare only via helpers in `lib/dates.ts` (Czech locale, `Europe/Prague` zone); add a helper there rather than using `Date` ad hoc. Prefer `now()`/interval math in SQL for stored data.

## Structure

<!-- app/features/<name>/{components,hooks,api,__tests__} -->

Shared UI lives in `components/*`. Never duplicate it.

## Architecture

GeekPower is an English-for-IT course app (UI and lesson content are in Czech).

- **Auth & routing**: `auth.ts` configures NextAuth; the session carries `user.guid` and `user.role`. `proxy.ts` (Next 16's replacement for `middleware.ts`) sends unauthenticated users to `/` and sends authenticated users away from the public pages (`/`, `/forgot-password`, `/set-password`). There is no self-signup: admins/teachers create students, and the app emails a set-password link with a 24h token.
- **Roles**: `Admin` | `Teacher` | `User` (student). Gate with `hasAdminAccess` / `hasTeacherAccess` from `lib/utils.ts` instead of comparing role strings. Teachers and admins see all lessons; students see only lessons unlocked for them.
- **Data layer**: `app/database/index.ts` exports the Neon `sql` tagged template. It's raw SQL with no ORM and no migrations in the repo. The schema exists only in Neon; `lib/types.ts` documents the tables (`public.users`, `public.announcements`, `public.password_reset_tokens`, `public.blog_posts`, `public.contact_messages`, `content.lessons`, `content.sublessons`, `content.sublesson_versions`, `progress.lessons`, `progress.sublessons`, `progress.interactions`). Reads live in `lib/data.ts`, `lib/lessons.ts` and `lib/announcements.ts`. All mutations are server actions in `lib/actions.ts`; each one checks the session/role itself and calls `revalidatePath`.
- **Lessons live in the DB**: `content.lessons` and `content.sublessons` (a lesson's "sections" in the UI). Each one has a `guid`, a URL `slug`, a `title`, a `position` (the display order) and `is_draft` (drafts are hidden from students). Sections store their MDX in `body`. Progress tables reference content by guid with `ON DELETE CASCADE`, so renaming a slug is safe and deleting content deletes its progress. Display numbering ("01 - …") is computed in `lib/lessons.ts` over published items only. Teachers manage everything from `/lessons` (create/rename/delete lessons and sections; new ones are added at the end; lessons and sections are reordered by drag-and-drop, sections only within their lesson, via `reorderLessons`/`reorderSublessons`, which renumber `position` in one transaction) and edit a section in the full-page editor at `/lesson-editor/[sublessonGuid]` (or `/lesson-editor/new?lesson=<guid>`, `components/lessons/editor/`). Saving a section whose title or body changed first copies the replaced content to `content.sublesson_versions` (newest 10 kept, trimmed in `updateSublesson`); the editor's History menu loads a version into the form, and saving it restores it.
- **MDX rendering**: every lesson compile goes through `lib/mdx/lesson-mdx.ts`, so the page, the editor's live preview (server-compiled, rendered in the browser with `MDXRemote`) and save-time validation all accept the same thing. JS is blocked (`blockJS: true`). The plugins are remark-gfm, remark-flexible-markers (`==highlight==`), `lib/mdx/remark-callouts.ts` (Obsidian-style `> [!info]- Title` callouts) and the blog's `remarkYoutube` (a bare YouTube URL on its own line becomes an embed). `lib/mdx/remark-lesson-components.ts` rejects, with a position, anything that would otherwise fail silently: `{expressions}` (write `\{`), imports, unknown components and malformed quizzes. It also collects the quiz definitions.
- **Quizzes**: `<Quiz id="…" correct="b"><Question>…</Question><Option id="a">…</Option>…</Quiz>`, with Markdown allowed inside the parts. Teachers insert and edit quizzes with the editor's quiz builder; with the cursor inside an existing quiz, it edits that quiz and keeps its id. Answers are graded on the server by `answerQuiz` (the correct id never reaches the browser) and stored in `progress.interactions` keyed by quiz `id`, so an id must stay unique within its section and keep the same value when the quiz is edited. A student can finish a section only after answering every quiz in it correctly, which `completeSublesson` enforces. To add a quiz kind, follow the checklist at the top of `lib/quizzes.ts`.
- **Markdown editor**: `components/markdown-editor/` (toolbar, textarea with Cloudinary image upload, write/preview tabs) is shared by the blog and lesson editors.
- **Blog**: posts are Markdown in `blog_posts.message`, written in the full-page editor (`/blog/new`, `/blog/[guid]/edit`, `components/blog/editor/`). The public JSON API in `app/api/blog/` serves them to the separate public website, which renders them with a copy of `components/blog/markdown/` + `lib/mdx/remark-callouts.ts` + `app/markdown.css`, so keep that renderer self-contained and change both sites together. A bare YouTube URL in its own paragraph becomes an embed, and a single newline is a line break (remark-breaks). Images (blog and lessons) are uploaded from the browser straight to Cloudinary with parameters signed by the `createImageUpload(folder)` action (`lib/cloudinary.ts`), and the Markdown stores the absolute Cloudinary URL.

## Design system

shadcn components (style `base-vega`, built on `@base-ui/react`, lucide icons) live in `components/ui/`; add new ones with the shadcn CLI. Use `cn()` from `lib/utils.ts` for class merging and `formatDateTime()` from `lib/dates.ts` for showing timestamps.

Colors come from the color theme, shared with the public website: `app/globals.css` defines the website's default palette as `--theme-*` variables and derives every shadcn token from them, so use the tokens (`bg-background`, `text-primary`, …) or `var(--theme-*)`, never hard-coded colors. The theme picker (`components/theme-picker.tsx`, opened from the user menu under the user's name in the header, or a palette button when signed out) saves the six picked colors in the `gp-theme` cookie on the parent domain, and the website does the same, so a pick on either site applies on both. An inline `<head>` script applies it before first paint and drops the `dark` class for a light background. `lib/theme.ts` mirrors `geekpower_website/lib/theme.ts` (cookie format, presets, ramp math), so change both together.

<!-- - No hard-coded colors, px values or inline styles. -->

## Testing

No test framework is configured yet. Verify changes with `npm run lint` and `npm run build`.

<!-- - Every new component gets a `*.test.tsx` next to it.
- Test behavior, not implementation. Run `npm test` before finishing. -->

## Done means

<!-- `npm run lint && npm run typecheck && npm test` all pass. -->
