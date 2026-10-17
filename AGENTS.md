<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UI copy

Menus, buttons, status and other app chrome default to plain English: the learner is a beginner. An Italian version is a setting ("Menu language" on the home screen), so write every chrome string as a pair with `useT()` from `src/lib/locale.ts`: `t("Lessons", "Lezioni")`. Lesson content stays Italian either way.

## Versions and releases

Every PR bumps `version` in `package.json`: patch for fixes, minor for new features, major only when asked. When it lands on `main`, `.github/workflows/release.yml` tags it and publishes a GitHub release (`vX.Y.Z`) with generated notes. The home screen shows the running version and commit in tiny type at the very bottom, to check which release a phone has.
