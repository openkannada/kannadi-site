#!/bin/sh
# Workers Builds' build command, on every branch: installs Rust and wasm-bindgen, which the build image lacks,
# then builds and checks the site for https://openkannada.org. The deploy command then runs
# `node scripts/deploy.ts publish` on main; other branches run `npx wrangler preview`.
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
rev=$(tr -d '[:space:]' < "$root/kannadi.rev")
bin="$HOME/.local/bin"
mkdir -p "$bin"
export PATH="$HOME/.cargo/bin:$bin:$PATH"

if ! command -v rustup > /dev/null 2>&1; then
  echo "Installing Rust"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
    | sh -s -- -y --quiet --no-modify-path --profile minimal --default-toolchain stable --target wasm32-unknown-unknown
else
  rustup target add wasm32-unknown-unknown
fi
cargo --version

want=$(curl -sSfL "https://raw.githubusercontent.com/openkannada/kannadi/$rev/Cargo.lock" \
  | awk '/^name = "wasm-bindgen"$/ { getline; gsub(/version = |"/, ""); print }')
[ -n "$want" ] || { echo "No wasm-bindgen version in kannadi's Cargo.lock at $rev." >&2; exit 1; }
found=$(wasm-bindgen --version 2>/dev/null | awk '{ print $2 }' || true)
if [ "$found" != "$want" ]; then
  case "$(uname -sm)" in
    "Linux x86_64") triple=x86_64-unknown-linux-musl ;;
    *) echo "No prebuilt wasm-bindgen for $(uname -sm): cargo install wasm-bindgen-cli --version $want --locked" >&2; exit 1 ;;
  esac
  name="wasm-bindgen-$want-$triple"
  base="https://github.com/wasm-bindgen/wasm-bindgen/releases/download/$want"
  tmp=$(mktemp -d)
  echo "Installing wasm-bindgen $want"
  curl -sSfL -o "$tmp/$name.tar.gz" "$base/$name.tar.gz"
  curl -sSfL -o "$tmp/$name.tar.gz.sha256sum" "$base/$name.tar.gz.sha256sum"
  expected=$(awk '{ print $1 }' "$tmp/$name.tar.gz.sha256sum")
  actual=$(sha256sum "$tmp/$name.tar.gz" | awk '{ print $1 }')
  [ -n "$expected" ] && [ "$expected" = "$actual" ] || { echo "$name.tar.gz does not match its checksum." >&2; exit 1; }
  tar -xzf "$tmp/$name.tar.gz" -C "$tmp"
  install -m 755 "$tmp/$name/wasm-bindgen" "$bin/wasm-bindgen"
  rm -rf "$tmp"
fi
wasm-bindgen --version

cd "$root"
exec node scripts/deploy.ts build
