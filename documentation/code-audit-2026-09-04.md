# Code audit and multi-media canvas

## Scope

This pass inspected media import, presentation state, canvas editing, preview-to-live payloads, media rendering and caching, speech-session cleanup, and the build-check configuration. It preserves the earlier uncommitted audit work on `codex/fix-codebase-audit`.

This is a targeted code audit, not an exhaustive security review. No tests, application runtime checks, or visual verification were performed.

## Findings fixed

| Finding | Effect | Change |
| --- | --- | --- |
| Wheel zoom supplied a partial transform to a function that fills missing offsets with zero. | Zoom moved positioned media back to the center. | Preserve existing offsets while changing scale. |
| Preview payload comparison omitted announcements and verse numbers. | Some content edits could leave preview unchanged. | Compare those fields and the complete media composition. |
| The typecheck script used an empty root TypeScript project without building its references. | App errors could pass the advertised typecheck. | Check the referenced app and tooling projects with `tsc -b`. |
| Video caches registered videos only after loading and never released unused entries. | Duplicate loads and background playback could accumulate during navigation. | Register pending loads, release inactive videos, and clean up on unmount. Thumbnail videos no longer autoplay. |
| Media imports used an all-or-nothing promise batch and silently filtered unsupported files. | One failed file hid successful imports; unsupported files appeared to do nothing. | Keep successful results and report failures or unsupported files. |
| Speech-provider completion did not signal session cancellation. | Microphone capture could outlive the provider. | Cancel the session on provider exit and wait for the microphone thread before declaring normal shutdown complete. |
| The canvas renderer did not clip transformed cover-fit media to its item frame. | A resized item could draw beyond the bounds shown by the editor. | Clip each media item to its transformed frame. |

## Multi-media workflow

1. Import an image or video as a slide and select it.
2. Choose **Add media** in the center editor. Select one or more files.
3. The files join the existing canvas. Two items start side by side; larger groups use a grid.
4. Select an item by its numbered button or click it on the canvas. Move, resize, zoom, change its fit, or remove it independently.
5. Use **Side by side** or **Arrange grid** to reset the layout. Adding files also rearranges the group.
6. Choose **Take Live** to send the complete composition. Later edits remain in preview until taken live again.

Each canvas supports up to 16 items. Locked canvases reject edits and uploads. The last item cannot be removed through the item control; remove the slide to remove the whole canvas. The existing Import action still creates separate slides.

Preview, live output, NDI canvas rendering, and thumbnails all receive the composition. Existing single-media slides and document pages retain their single-media rendering path.

## Follow-up fixes

- Broadcast transitions refresh their destination frame as media loads. They redraw current content at completion. Output readiness now waits for event listeners to register. Unready background videos use a fallback instead of interrupting text rendering.
- External file drops in the sidebar create slides. Drops on the editor add to its existing canvas. Sidebar media can also be copied into a canvas by dragging, without deleting its source.
- Desktop media compositions now persist with a versioned, validated schema. Native file-picker imports copy media into app storage so newly imported assets survive moving or deleting their original files. Saves are serialized and failures produce a visible message.
- Transcription stays mounted while operators use media, announcements, or overlays. Background scripture navigation no longer switches the active workspace. Stale asynchronous verse selections cannot overwrite newer selections.
- Startup waits for backend reset and hydration before starting transcription. Shutdown drains finalized transcript events and waits for workers before declaring the session stopped. A stop failure preserves state and prevents premature sermon completion. New sermons reset their scripture highlights, and late live-note responses cannot modify a completed session.
- Transcript following responds to content and viewport resizing. Scrolling back pauses following, and the jump button stays outside the scrolling content. Custom scrollbar thumbs remain visible when content overflows.
- Legacy scrolling-text output now schedules animation frames and shares the preview's wall clock. Ticker text has the same vertical baseline with or without a label.
- Specialized workspaces load on demand. Song catalogs ship as local JSON assets rather than large executable JavaScript chunks.

The React review guided persistent component lifetimes and scroll observation. The Rust review guided coordinated session shutdown. The data-fetching checklist guided catalog validation and retryable loading without adding an external service.

## Verification and remaining limits

### Search and credential access

- The existing Sermon input handles references and phrase searches. Its placeholder and tab layout are unchanged. Book matching accepts adjacent-letter swaps and references without a colon or space after the book name.
- Manual scripture search uses local indexed phrases and keywords across installed English translations plus the selected translation. Results resolve into the selected preview translation. Optional semantic results arrive later, with stale-query guards and bounded request caching.
- Unknown English words can match one-letter edits or adjacent-letter swaps from the Bible index vocabulary. Exact matches retain priority. This correction runs only for manual lookup, not the speech-detection loop.
- Song search indexes lyrics as well as titles, supports common topic synonyms, and prepares its worker before the Songs tab opens. Source and letter filters persist locally. The filter menu stays within the viewport and permits scrolling through every letter.
- Settings hydration no longer accesses the credential vault. Cloud transcription or an explicit Unlock saved keys action requests access. Local Whisper, ordinary settings changes, and search do not unlock keys. Keys remain in secure storage, and denied access does not overwrite them.
- Regression tests were authored but not executed. Static checks do not establish search latency or confirm native UI behavior; live-production runtime verification remains outstanding.

### Dead-code cleanup

- Removed unused store actions for audio, detections, queues, announcements, transcripts, sermon summaries, presentation transforms, and settings. Removed duplicate audio and detection state that had no consumers. Persisted settings and media compatibility fields remain unchanged.
- Removed the unused live-verse wrapper and redundant output-mode aliases. Updated their tests to target the production helpers instead.
- Replaced three copies of media render-data construction with the shared composition builder used by the editor.
- Grouped sidebar slides in one pass and reused a single title collator for song sorting.
- Corrected Knip's production entry and project patterns. The regular scan has no findings. Production-only scanning reports eight exports used by tests; their implementations also have internal production callers and are retained.
- This cleanup does not establish a runtime speedup or prove that every native or dynamically loaded path is free of dead code. Tests and visual verification were not run.

- TypeScript, ESLint, Knip, the production build, Rust formatting, and strict Clippy were checked. Regression tests were added but not run.
- The production build no longer reports oversized JavaScript chunks. The boot bundle is about 423 kB, down from about 502 kB before the follow-up.
- Desktop presentation saves have a 500 ms debounce. Forced termination during an unfinished save can still lose the latest edit. Files imported before the app-storage copy change may still depend on their original location.
- Native file picking, mixed-video playback, pointer interactions, and NDI output still need runtime verification before relying on the changes during a live event.
