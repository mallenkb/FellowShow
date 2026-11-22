import { createHash } from "node:crypto"
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const version = "0.13.7"
const release = `https://releases.astral.sh/github/uv/releases/download/${version}`
const source = `https://raw.githubusercontent.com/astral-sh/uv/${version}`
const checksums = new Map([
  [
    "x86_64",
    "0cdc5b38fe5a8168ed6a25814f5ba43c21d313dd3187314fccb37b7cec46e021",
  ],
  [
    "aarch64",
    "505d9e65e7692bac3ddf98c66754aa26c5050c409c184af30a881a0a72cc85e3",
  ],
  ["i686", "fa2abbf16f7d12cb01c9b7f313d843218fbd91a9d3fab487cc06a1d6765b27bf"],
])
const arch = process.env.TAURI_ENV_ARCH
const checksum = arch && checksums.get(arch)
if (!checksum) {
  throw new Error(
    `Unsupported Windows uv build architecture: ${arch ?? "unspecified"}`
  )
}

async function download(url: string, checksum: string, path: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) })
  if (!response.ok) {
    throw new Error(`Could not download ${url}: HTTP ${response.status}`)
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (createHash("sha256").update(bytes).digest("hex") !== checksum) {
    throw new Error(`Checksum mismatch for ${url}`)
  }
  await writeFile(path, bytes)
}

const runtime = resolve(import.meta.dir, "../vendor/uv/runtime")
const staging = await mkdtemp(join(tmpdir(), "fellowshow-uv-"))
try {
  const archive = join(staging, "uv.zip")
  await download(`${release}/uv-${arch}-pc-windows-msvc.zip`, checksum, archive)
  await download(
    `${source}/LICENSE-MIT`,
    "860e3d7a86b84e6a7012c7a635fc64df475cebc6cce34dfeb73a5982ec58176c",
    join(staging, "LICENSE-MIT")
  )
  await download(
    `${source}/LICENSE-APACHE`,
    "c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4",
    join(staging, "LICENSE-APACHE")
  )

  const extract = Bun.spawn(
    ["tar.exe", "-xf", archive, "-C", staging, "uv.exe"],
    {
      stdout: "inherit",
      stderr: "inherit",
    }
  )
  if ((await extract.exited) !== 0) {
    throw new Error(
      "Could not extract uv.exe from the Windows release archive."
    )
  }
  await mkdir(runtime, { recursive: true })
  for (const file of ["uv.exe", "LICENSE-MIT", "LICENSE-APACHE"]) {
    await copyFile(join(staging, file), join(runtime, file))
  }
  console.log(`Staged uv ${version} for Windows ${arch}`)
} finally {
  await rm(staging, { recursive: true, force: true })
}
