# Security Policy

This document describes FellowShow's Content Security Policy and how to report vulnerabilities.

## Content Security Policy

FellowShow sets the webview CSP via `src-tauri/tauri.conf.json`. CSP applies only to the webview (JavaScript, HTML, and CSS loaded inside the Tauri window); it does **not** gate network calls made by the Rust process.

```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self' data:;
connect-src 'self';
media-src 'self' blob:;
worker-src 'self';
frame-src 'none';
frame-ancestors 'none';
object-src 'none';
base-uri 'self';
form-action 'self';
manifest-src 'self';
```

### Directive rationale

- **`default-src 'self'`** — same-origin fallback for any directive not listed.
- **`script-src 'self'`** — no inline scripts, no `eval`, no external CDNs. The frontend bundle is the only script source.
- **`style-src 'self' 'unsafe-inline'`** — `'unsafe-inline'` is required by Tailwind utility generation, React inline `style={}` props, the `<style>` block in `broadcast-output.html`, and the dynamic `<style>` element that `src/components/theme-provider.tsx` injects during theme switches to suppress transitions.
- **`img-src 'self' data: blob:`** — `data:` covers theme background images (loaded via `@tauri-apps/plugin-fs` and converted to base64 in `src/lib/theme-designer-files.ts`); `blob:` covers canvas-derived images in the broadcast output window. External HTTPS images are deliberately **not** allowed: there is no feature that accepts an HTTPS URL from a user, and allowing `https:` would open an `<img src>`-based exfil path.
- **`font-src 'self' data:`** — fonts ship bundled via `@fontsource-variable/*`; `data:` permits inline font data.
- **`connect-src 'self'`** — the frontend makes no direct external network calls. All external traffic (e.g., Deepgram STT over WebSocket in `src-tauri/crates/stt/`) is initiated from Rust and is out of scope for CSP.
- **`media-src 'self' blob:`** — audio capture and playback via MediaStream-derived blob URLs.
- **`worker-src 'self'`** — explicit; prevents workers from remote origins if any are added later.
- **`frame-src 'none'`** and **`frame-ancestors 'none'`** — the app does not use iframes and must not be embedded.
- **`object-src 'none'`** — no plugins, applets, or `<object>` content.
- **`base-uri 'self'`** — prevents `<base>` tag hijacking.
- **`form-action 'self'`** — forms cannot submit to external origins.
- **`manifest-src 'self'`** — no PWA manifest is used; lock it down.

## Threat model

### What the CSP protects against

- Script injection in the webview (reflected or stored) — no `'unsafe-inline'` or `'unsafe-eval'` in `script-src`.
- Data exfiltration via `<img>`, `<script>`, `<iframe>`, `fetch`, or WebSocket from the webview.
- Clickjacking — the app will not be framed.
- External form-target CSRF and `<base>` tag redirection.

### What the CSP does NOT cover

- Network calls from Rust (the STT crate's Deepgram WebSocket, any future `reqwest` calls). Audit Rust-side outbound traffic separately.
- Local IPC via Tauri `invoke()` — this uses custom protocols that are same-origin from the webview's perspective.
- Supply-chain risks (a compromised npm or cargo dependency that injects code at build time).

## Notes for contributors

- Do **not** add `'unsafe-eval'` or `'unsafe-inline'` to `script-src` to unblock a dev tool. Fix the tool or bundle it locally.
- If we ever render local files in `<img>` or `<video>` via `@tauri-apps/api/core.convertFileSrc`, add `asset:` (Linux/macOS) and `http://asset.localhost` (Windows) to the relevant `*-src` directive.
- If a future feature requires the webview to talk to an external API, add only the specific origin to `connect-src`. Avoid scheme-wildcards like `https:`.
- On Windows, if `invoke()` starts failing with CSP errors after a Tauri upgrade, try adding `ipc: http://ipc.localhost` to `connect-src` — Tauri v2 routes Windows IPC through that custom host.

## Reporting vulnerabilities

Email **faithfulojebiyi@gmail.com**. Please do not open public issues for security reports. Include reproduction steps and, if possible, a proof of concept.

## References

- [MDN — Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP — CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Tauri v2 Security](https://v2.tauri.app/security/)
