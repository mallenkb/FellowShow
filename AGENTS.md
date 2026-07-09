# FellowShow Engineering Standards

These rules apply to human and AI contributors throughout this repository.

## TypeScript and React

- Keep TypeScript strict. Do not introduce `any`; accept `unknown` at external boundaries and narrow it before use.
- Route every Tauri command through `src/lib/ipc.ts`. Adding or changing a Rust command requires updating the `Commands` registry in the same change.
- Do not leave floating promises. Await work owned by the current flow. Intentional background work must use `void promise.catch(handler)` and surface actionable failures through UI state, a toast, or structured logging.
- Keep component files near a 400-line soft limit and one nontrivial component per file. Extract cohesive settings sections, search tabs, and designer controls rather than adding another branch to a large component.
- Avoid render-time component declarations and unnecessary effects. Derive values during render, put interaction work in event handlers, and subscribe only to the smallest Zustand state needed by a component.
- Preserve user-visible state when extracting tabs. If a tab unmount would discard meaningful work, keep it mounted and gate its effects with an `isActive` prop until that state has a dedicated store.

## State management

- Prefer module-level Zustand actions through `store.getState()` for imperative workflows.
- Theme mutations must use `updateDraftDeep` recipes. Do not reintroduce string-path mutation helpers.
- Keep persisted data versioned, minimal, plain, and serializable. Validate or sanitize values loaded from storage.

## Rust and Tauri

- Return `Result` from every fallible `#[tauri::command]`; do not panic or use `unwrap`/`expect` in production paths.
- Use `thiserror` for crate-level error types and preserve useful context at command boundaries.
- Keep Clippy pedantic clean under `-D warnings` and keep Rust formatting and tests green.
- Treat Rust command signatures as authoritative. Tauri arguments exposed to TypeScript use camelCase unless the command explicitly declares another serde naming convention.

## Tests

- Colocate tests as `*.test.ts` or `*.test.tsx`.
- Keep pure logic tests in the default Node environment. Component tests opt into jsdom with `// @vitest-environment jsdom`.
- Reuse the established mocks for `@tauri-apps/api/core`, `@tauri-apps/api/event`, and `@tauri-apps/plugin-store`.
- Test component wiring at important operator boundaries, especially preview-to-live, broadcast control, settings persistence, and import flows.

## Required checks

Before committing, run:

```sh
bun run typecheck
bun run lint
bun run test --run
bun run knip
```

Run `bun run build` after module-graph, dependency, or bundling changes. Rust changes also require formatting, workspace tests, and strict Clippy.
