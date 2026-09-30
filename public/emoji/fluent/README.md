# Bundled Fluent 3D stickers

Subset (111 images) of Microsoft `fluentui-emoji`, MIT licensed.
Source: https://github.com/microsoft/fluentui-emoji

Attribution: Microsoft Fluent Emoji (MIT).

## Add more

1. Download a `3D` PNG from the repo above into this folder.
2. Append an entry to `manifest.json`:
   `{ "id": "<file base name>", "name": "<English name>", "zh": "<中文名>", "file": "emoji/fluent/<file>.png" }`
3. Refresh the app. No rebuild needed for new files under `public/`.
