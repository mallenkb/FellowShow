# Bundled document converter

FellowShow release builds stage a platform-specific LibreOffice runtime in
`runtime/`. The generated runtime is intentionally ignored by Git because it is
large and differs by operating system and CPU architecture.

Run `bun run prepare:document-converter` before packaging. The script discovers
LibreOffice in its standard installation location, or accepts an explicit
`LIBREOFFICE_BUNDLE_SOURCE` directory.

The packaged runtime retains LibreOffice's license and notice files. LibreOffice
is distributed under the Mozilla Public License 2.0; see
<https://www.libreoffice.org/licenses/>.
