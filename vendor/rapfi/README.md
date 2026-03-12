# Rapfi Local Assets

This directory contains the official `Rapfi-engine.7z` release archive downloaded from:

- `https://github.com/dhbloo/rapfi/releases/tag/250615`

The local AI service currently uses:

- `pbrain-rapfi-macos-apple-silicon`

Required support files are kept in the same directory:

- `config.toml`
- `model210901.bin`
- `mix9svq*.bin.lz4`

The local server starts the binary from this directory so Rapfi can resolve its config and weight files.
