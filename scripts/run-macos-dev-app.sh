#!/bin/sh
set -eu

executable=$1
shift
case "$executable" in
  /*) ;;
  *) executable="$PWD/$executable" ;;
esac

tauri_dir=$(CDPATH='' cd "$(dirname "$0")/../src-tauri" && pwd)
build_dir=$(dirname "$executable")
binary_name=$(basename "$executable")
bundle="$build_dir/Fellow Show Dev.app"
stage=$(mktemp -d "$build_dir/.fellowshow-dev.XXXXXX")
trap 'rm -rf "$stage"' EXIT
contents="$stage/Fellow Show Dev.app/Contents"
resources="$contents/Resources"
mkdir -p "$contents/MacOS" "$resources"

cp -p "$executable" "$contents/MacOS/$binary_name"
cp "$tauri_dir/icons/Assets.car" "$tauri_dir/icons/icon.icns" "$resources/"
for resource in fellowshow.db document-converter; do
  if [ -e "$build_dir/$resource" ]; then
    cp -cRp "$build_dir/$resource" "$resources/"
  fi
done

config="$tauri_dir/tauri.conf.json"
plist="$contents/Info.plist"
version=$(/usr/bin/plutil -extract version raw -o - "$config")
cp "$tauri_dir/Info.plist" "$plist"
/usr/bin/plutil -insert CFBundleIdentifier -string "$(/usr/bin/plutil -extract identifier raw -o - "$config")" "$plist"
/usr/bin/plutil -insert CFBundleName -string "$(/usr/bin/plutil -extract productName raw -o - "$config")" "$plist"
/usr/bin/plutil -insert CFBundleExecutable -string "$binary_name" "$plist"
/usr/bin/plutil -insert CFBundlePackageType -string APPL "$plist"
/usr/bin/plutil -insert CFBundleIconFile -string icon.icns "$plist"
/usr/bin/plutil -insert CFBundleShortVersionString -string "$version" "$plist"
/usr/bin/plutil -insert CFBundleVersion -string "$version" "$plist"
/usr/bin/codesign --force --sign - "$stage/Fellow Show Dev.app"

if [ -e "$bundle" ]; then
  mv "$bundle" "$stage/previous.app"
fi
if ! mv "$stage/Fellow Show Dev.app" "$bundle"; then
  if [ -d "$stage/previous.app" ]; then
    mv "$stage/previous.app" "$bundle"
  fi
  exit 1
fi
rm -rf "$stage"
trap - EXIT

export FELLOWSHOW_NATIVE_DEV_BUNDLE=1
exec "$bundle/Contents/MacOS/$binary_name" "$@"
