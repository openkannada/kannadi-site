#!/bin/sh
# Builds kannadi-wasm at the commit in kannadi.rev into src/editor/wasm, and the typing engine with its model into
# src/editor/typing.
# KANNADI_DIR points at an existing kannadi checkout; otherwise one is cloned into .kannadi.
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
rev=$(tr -d '[:space:]' < "$root/kannadi.rev")
src=${KANNADI_DIR:-"$root/.kannadi"}
out="$root/src/editor/wasm"
typing="$root/src/editor/typing"

if [ -z "${KANNADI_DIR:-}" ]; then
  if [ ! -d "$src/.git" ]; then
    git clone --quiet --filter=blob:none https://github.com/openkannada/kannadi.git "$src"
  fi
  git -C "$src" fetch --quiet origin "$rev"
  git -C "$src" -c advice.detachedHead=false checkout --quiet "$rev"
fi

have=$(git -C "$src" rev-parse HEAD)
if [ "$have" != "$rev" ]; then
  echo "$src is at $have; kannadi.rev wants $rev." >&2
  exit 1
fi

if [ -n "$(git -C "$src" status --porcelain --untracked-files=no)" ]; then
  echo "$src has uncommitted changes; build from a clean checkout." >&2
  exit 1
fi

want=$(awk '/^name = "wasm-bindgen"$/ { getline; gsub(/version = |"/, ""); print }' "$src/Cargo.lock")
found=$(wasm-bindgen --version 2>/dev/null | awk '{ print $2 }' || true)
if [ "$found" != "$want" ]; then
  echo "wasm-bindgen $want is needed (found '${found:-none}')." >&2
  echo "Install it: cargo install wasm-bindgen-cli --version $want --locked" >&2
  exit 1
fi

cargo build -p kannadi-wasm --lib --profile wasm --locked --target wasm32-unknown-unknown \
  --manifest-path "$src/Cargo.toml"

rm -rf "$out"
wasm-bindgen --target web --out-dir "$out" \
  "${CARGO_TARGET_DIR:-$src/target}/wasm32-unknown-unknown/wasm/kannadi_wasm.wasm"
echo "Built $out at kannadi $(printf '%.7s' "$rev") ($(wc -c < "$out/kannadi_wasm_bg.wasm" | tr -d ' ') bytes of wasm)"
"$src/crates/kannadi-typing-wasm/build.sh" "$typing"
