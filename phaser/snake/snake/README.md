Idleton - minimal Phaser 3 multi-scene demo

Files added:
- index.html - entry that loads phaser.js and src/main.js
- src/main.js - Phaser bootstrap and scene list
- src/scenes/* - Boot, Preloader, Town, Cave, Field scenes
- src/player.js - simple player helper

How to run:
1. Start a local HTTP server in the project folder (where index.html is).

Using Python 3:
```pwsh
python -m http.server 8000
``` 

Or use Node (http-server):
```pwsh
npx http-server -c-1 .
```

2. Open http://localhost:8000 in your browser.

Controls: arrow keys to move and jump. Walk into portals (colored rectangles) to change scenes.

Notes: This is a minimal starter. Replace the placeholder assets in `assets/` with real spritesheets for better visuals.
