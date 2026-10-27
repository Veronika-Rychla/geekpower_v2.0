@AGENTS.md

## Stack

React 19, TypeScript strict, Vite, Next.js as fullstack app connected to Neon DB.
<!-- Vitest + Testing Library, -->

# Code Style

- Use 2-space indentation
- Prefer named exports
- All API routes go in app/api/
- Use server actions instead of API routes where possible
- Use Luxon's `DateTime` for dates and times instead of the built-in `Date` object. Use `Date` only at boundaries that hand it to you (e.g. Neon returns `timestamptz` as `Date`: wrap it with `DateTime.fromJSDate`)

## Structure

<!-- app/features/<name>/{components,hooks,api,__tests__} -->

Shared UI lives in `components/*`. Never duplicate it.

## Design system

<!-- - No hard-coded colors, px values or inline styles. -->

## Testing

<!-- - Every new component gets a `*.test.tsx` next to it.
- Test behavior, not implementation. Run `npm test` before finishing. -->

## Done means

<!-- `npm run lint && npm run typecheck && npm test` all pass. -->
