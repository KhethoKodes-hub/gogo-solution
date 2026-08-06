#!/usr/bin/env sh
set -eu

# Build Nuxt using the Vercel Nitro preset from the frontend app directory.
cd apps/frontend
NITRO_PRESET=vercel npx nuxi build

# Vercel expects Build Output API files at project-root .vercel/output.
cd ../..
rm -rf .vercel/output
mkdir -p .vercel
cp -R apps/frontend/.vercel/output .vercel/output
