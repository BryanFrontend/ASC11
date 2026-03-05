# ASCII Art Studio

> Convert images, videos, and webcam feeds into animated ASCII art in real time.

![ASCII Art Studio](assets/example.jpg)

---

## Features

- **Multi-source input** — images, video files, and live webcam
- **7 character sets** — Classic ASCII, Dense blocks, Braille, Dot matrix, Binary, Hex, Block elements
- **6 color modes** — Terminal green, Amber CRT, Classic white, Cyan matrix, Full color, Red alert
- **Real-time controls** — Brightness, contrast, font size, character spacing, resolution
- **Edge detection** — Sobel operator for outline/wireframe look
- **Frame buffer** — Capture frames and export multi-frame animations
- **4 export formats** — HTML, JavaScript animation loop, Plain text, SVG
- **6 presets** — Matrix, Retro CRT, Blueprint, Thermal, Hacker, Minimal
- **Zero dependencies** — Pure vanilla JS, no build step required

---

## Quick Start

```bash
# Clone or unzip the project
cd ascii-studio

# Option 1: Use any static file server
npx serve .

# Option 2: Python
python3 -m http.server 8080

# Option 3: Node
npx http-server .
```

Then open `http://localhost:8080` in your browser.

> **Note:** Opening `index.html` directly via `file://` will work for images but will block webcam access (requires HTTPS or localhost).

---

## Usage

### Loading Media

| Source | How |
|--------|-----|
| Image  | Click "IMAGE" → drag & drop or click the upload zone |
| Video  | Click "VIDEO" → upload any MP4/WebM/OGG file |
| Webcam | Click "WEBCAM" → click "START CAMERA" and grant browser permission |

### Controls

| Control | Effect |
|---------|--------|
| Character Set | Determines which characters map to brightness levels |
| Color Mode | Applies a color tint or full-color mapping |
| Invert Colors | Swaps dark/light mapping |
| Edge Detect | Runs Sobel edge detection before ASCII conversion |
| Brightness | Offsets the overall luminance (0–255, neutral = 128) |
| Contrast | Scales luminance around the midpoint |
| Font Size | Size of each character in the preview (px) |
| Char Spacing | Line height multiplier (affects vertical density) |
| Resolution | Percentage of source dimensions used for sampling |
| Frame Rate | Target FPS for video/webcam rendering |

### Exporting

1. **Capture** a frame using the `⊞ CAPTURE` button (adds to frame buffer)
2. Choose an export format from the right panel:
   - **HTML** — Self-contained page with embedded styles
   - **JavaScript** — ES module with `AsciiAnimation` class and frame array
   - **Text** — Plain `.txt` file of the current frame
   - **SVG** — Scalable vector graphic of the current frame
3. Use **EXPORT ANIMATION** to create an animated HTML file from all captured frames

### Presets

| Preset | Description |
|--------|-------------|
| Matrix | Binary chars, green, high contrast |
| Retro CRT | Classic ASCII, amber, warm |
| Blueprint | Dot matrix, cyan, edge-detected |
| Thermal | Block elements, red, high contrast |
| Hacker | Hex chars, green, edge-detected |
| Minimal | Dots, white, low contrast |

---

## Architecture

```
ascii-studio/
├── index.html        # App shell, layout, DOM structure
├── style.css         # Dark terminal theme, all UI styles
├── main.js           # App orchestrator — wires all modules together
├── ascii-engine.js   # Core pixel→ASCII conversion
├── renderer.js       # Pre-element and canvas rendering
├── webcam.js         # getUserMedia lifecycle management
├── video.js          # Video file loading and frame loop
├── export.js         # HTML/JS/TXT/SVG export generators
└── assets/
    └── example.jpg   # Bundled demo image
```

### Module Responsibilities

**`ascii-engine.js`**
- `imageDataToAscii(imageData, opts)` → `string`
- `imageDataToColorAscii(imageData, opts)` → `Array<Array<{char, r, g, b}>>`
- Internal: brightness/contrast transform, Sobel edge detection

**`renderer.js`**
- `renderToElement(ascii, pre, opts)` — updates `<pre>` text and styles
- `renderColorToCanvas(colorData, canvas, opts)` — draws per-character color
- `getScaledDimensions(srcW, srcH, resolution)` — computes sample grid size
- `captureImageData(source, canvas, w, h)` — extracts pixel data via Canvas API

**`webcam.js`**
- `start(videoEl)` → Promise — requests camera, attaches stream
- `stop(videoEl)` — releases all tracks

**`video.js`**
- `loadFile(videoEl, file)` → Promise — creates object URL, waits for metadata
- `startLoop(callback, fps)` — runs rAF loop at target FPS
- `setFPS(fps)`, `stopLoop()`, `togglePlayback()`

**`export.js`**
- `exportText(ascii)`, `exportHTML(ascii, colorMode, fontSize)`
- `exportAnimatedHTML(frames, colorMode, fontSize, fps)`
- `exportJS(frames, fps)`, `exportSVG(ascii, colorMode, fontSize)`

**`main.js`**
- Single `app` IIFE that manages global state and wires all modules
- Handles file input, drag & drop, source switching, presets, notifications

---

## ASCII Rendering Explained

### Pixel Sampling

The hidden `<canvas>` element is used to scale the source (image/video/webcam frame) down to a small grid — typically 50–200 characters wide. Each cell of the grid corresponds to one ASCII character.

```
Source (1920×1080)
        ↓  scale to
Grid   (96×43) at resolution=50%
        ↓
ImageData (96×43×4 bytes — RGBA)
```

### Luminance Mapping

For each pixel cell, the luminance (perceived brightness) is computed using the standard ITU-R BT.601 formula:

```
L = 0.299·R + 0.587·G + 0.114·B
```

Green contributes most because the human eye is most sensitive to green wavelengths.

### Character Mapping

The luminance value (0–255) is mapped linearly to an index in the chosen character string, which is ordered from "visually sparse" (space) to "visually dense" (@ or █):

```
index = floor( (L / 255) × (charset.length - 1) )
char  = charset[index]
```

### Brightness / Contrast

Applied before character mapping:

```
adjusted = (L + (brightness − 128))
final    = (adjusted − 128) × (contrast / 128) + 128
```

### Edge Detection (Sobel)

The Sobel operator computes horizontal and vertical gradients at each pixel, then combines them:

```
Gx = [−1  0 +1]     Gy = [+1 +2 +1]
     [−2  0 +2]          [ 0  0  0]
     [−1  0 +1]          [−1 −2 −1]

G = √(Gx² + Gy²)
```

High-gradient areas (edges) produce high luminance values, mapping to dense characters and creating a wireframe/outline effect.

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Canvas API | ✅ | ✅ | ✅ | ✅ |
| Webcam (getUserMedia) | ✅ | ✅ | ✅ | ✅ |
| Video files | ✅ | ✅ | ✅ | ✅ |
| Blob download | ✅ | ✅ | ✅ | ✅ |

Requires a modern browser (2020+). No IE support.

---

## Future Improvements

- [ ] **WebGL renderer** — GPU-accelerated character drawing for higher resolutions
- [ ] **Audio reactive** — Sync ASCII density/color to audio amplitude
- [ ] **Custom character sets** — Let users define their own charset via text input
- [ ] **Color dithering** — Floyd-Steinberg dithering for better color ASCII
- [ ] **Zoom & pan** — Interactive preview navigation
- [ ] **GIF export** — Render animation directly to GIF in-browser
- [ ] **PWA support** — Offline capability and install prompt
- [ ] **Keyboard shortcuts** — Power-user workflow
- [ ] **Undo history** — Revert settings changes
- [ ] **Multiple previews** — Side-by-side comparison of different settings

---

## License

MIT — free to use, modify, and distribute.
