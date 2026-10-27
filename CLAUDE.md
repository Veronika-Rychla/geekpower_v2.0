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

Required env (`.env`): `DATABASE_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL` (used to build links in emails).

# Code Style

- Use 2-space indentation
- Prefer named exports
- All API routes go in app/api/
- Use server actions instead of API routes where possible
- Use Luxon's `DateTime` for dates and times instead of the built-in `Date` object. Use `Date` only at boundaries that hand it to you (e.g. Neon returns `timestamptz` as `Date`: wrap it with `DateTime.fromJSDate`)

## Structure

<!-- app/features/<name>/{components,hooks,api,__tests__} -->

Shared UI lives in `components/*`. Never duplicate it.

## Architecture

GeekPower is an English-for-IT course app (UI and lesson content are in Czech).

- **Auth & routing**: `auth.ts` configures NextAuth; the session carries `user.guid` and `user.role`. `proxy.ts` (Next 16's replacement for `middleware.ts`) sends unauthenticated users to `/` and sends authenticated users away from the public pages (`/`, `/forgot-password`, `/set-password`). There is no self-signup: admins/teachers create students, and the app emails a set-password link with a 24h token.
- **Roles**: `Admin` | `Teacher` | `User` (student). Gate with `hasAdminAccess` / `hasTeacherAccess` from `lib/utils.ts` instead of comparing role strings. Teachers and admins see all lessons; students see only lessons unlocked for them.
- **Data layer**: `app/database/index.ts` exports the Neon `sql` tagged template. It's raw SQL with no ORM and no migrations in the repo. The schema exists only in Neon; `lib/types.ts` documents the tables (`public.users`, `public.announcements`, `public.password_reset_tokens`, `progress.lessons`, `progress.sublessons`, `progress.interactions`). Reads live in `lib/data.ts`, `lib/lessons.ts` and `lib/announcements.ts`. All mutations are server actions in `lib/actions.ts`; each one checks the session/role itself and calls `revalidatePath`.
- **Lessons are files, progress is DB**: each lesson is a folder `content/lessons/<NN-slug>/`, and each sublesson is a `<NN-slug>.mdx` file inside it. Order comes from the numeric prefix. The title comes from the first markdown heading, falling back to the slug. The DB stores only slugs (unlocks, completion, interaction responses), so renaming a file orphans its progress rows.
- **MDX rendering**: `app/lessons/[lessonSlug]/[sublessonSlug]/page.tsx` compiles MDX with `next-mdx-remote/rsc` (`blockJS: false`) plus remark-gfm, remark-flexible-markers (`==highlight==`) and `lib/mdx/remark-callouts.ts` (Obsidian-style `> [!info]- Title` callouts). The only custom MDX component is `<Quiz id question options correctId>`. Quiz answers are stored in `progress.interactions` keyed by `id`, so each `id` must be unique within its sublesson. A student can complete a sublesson only after answering every quiz in it correctly. `completeSublesson` enforces this, finding quiz ids in the source with a regex.

## Design system

shadcn components (style `base-vega`, built on `@base-ui/react`, lucide icons) live in `components/ui/`; add new ones with the shadcn CLI. Use `cn()` from `lib/utils.ts` for class merging and `formatDateTime()` for showing timestamps (Czech locale).

<!-- - No hard-coded colors, px values or inline styles. -->

## Testing

No test framework is configured yet. Verify changes with `npm run lint` and `npm run build`.

<!-- - Every new component gets a `*.test.tsx` next to it.
- Test behavior, not implementation. Run `npm test` before finishing. -->

## Done means

<!-- `npm run lint && npm run typecheck && npm test` all pass. -->
