import { describe, expect, test } from "vitest"
import config from "../../src-tauri/tauri.conf.json"

describe("Tauri asset protocol policy", () => {
  test("allows cached media through the WebView2 asset origin", () => {
    expect(config.app.security.csp).toContain("http://asset.localhost")
    expect(config.app.security.devCsp).toContain("http://asset.localhost")
  })
})
