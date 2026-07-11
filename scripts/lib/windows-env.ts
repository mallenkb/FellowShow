import { join } from "node:path"

type Environment = Record<string, string | undefined>

export function buildTauriCommand(
  bunExecutable: string,
  args: string[]
): string[] {
  return [bunExecutable, "x", "tauri", ...args]
}

export function withWindowsBuildEnvironment(
  platform: NodeJS.Platform,
  source: Environment,
  exists: (path: string) => boolean
): Environment {
  const env = { ...source }
  if (platform !== "win32") return env

  const findEnvironmentKey = (name: string) =>
    Object.keys(env).find((key) => key.toLowerCase() === name.toLowerCase())
  const programFilesKey = findEnvironmentKey("ProgramFiles")
  const programFiles = programFilesKey ? env[programFilesKey] : undefined
  if (!programFiles) return env

  const llvmBin = join(programFiles, "LLVM", "bin")
  const cmakeBin = join(programFiles, "CMake", "bin")
  const pathEntries: string[] = []

  if (exists(join(llvmBin, "libclang.dll"))) {
    env.LIBCLANG_PATH ||= llvmBin
    pathEntries.push(llvmBin)
  }
  if (exists(join(cmakeBin, "cmake.exe"))) pathEntries.push(cmakeBin)

  if (pathEntries.length > 0) {
    const pathKey = findEnvironmentKey("PATH")
    const existingPath = pathKey ? env[pathKey] : undefined
    if (pathKey && pathKey !== "PATH") delete env[pathKey]
    env.PATH = [...pathEntries, existingPath].filter(Boolean).join(";")
  }
  return env
}
