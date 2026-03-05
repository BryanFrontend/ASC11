/**
 * EXPORT MODULE
 * Generates downloadable files from current ASCII output:
 *  - HTML (animated or static page)
 *  - JavaScript (animation loop)
 *  - Plain text
 *  - SVG
 */

const ExportModule = (() => {

  /** Trigger a browser download. */
  function download(filename, content, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Export a single frame as plain text. */
  function exportText(asciiText) {
    download('ascii-frame.txt', asciiText, 'text/plain');
  }

  /** Export the current frame as a self-contained HTML page. */
  function exportHTML(asciiText, colorMode = 'green', fontSize = 8) {
    const colorMap = {
      green: '#00ff88', amber: '#ffaa00', white: '#e0e0e0',
      cyan:  '#00ccff', red:   '#ff3355', color: '#00ff88',
    };
    const color = colorMap[colorMode] || '#00ff88';
    const escaped = asciiText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>ASCII Art Export</title>
  <style>
    body {
      background: #0a0a0f;
      margin: 0; padding: 20px;
      display: flex; justify-content: center;
    }
    pre {
      color: ${color};
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: ${fontSize}px;
      line-height: 1.0;
      white-space: pre;
      text-shadow: 0 0 4px ${color}88;
    }
  </style>
</head>
<body>
  <pre>${escaped}</pre>
</body>
</html>`;
    download('ascii-art.html', html, 'text/html');
  }

  /** Export multi-frame animation as HTML with JS loop. */
  function exportAnimatedHTML(frames, colorMode = 'green', fontSize = 8, fps = 24) {
    const colorMap = {
      green: '#00ff88', amber: '#ffaa00', white: '#e0e0e0',
      cyan:  '#00ccff', red:   '#ff3355',
    };
    const color = colorMap[colorMode] || '#00ff88';

    const escapedFrames = frames.map(f =>
      '`' + f.replace(/`/g, '\\`').replace(/\$/g, '\\$') + '`'
    ).join(',\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>ASCII Animation</title>
  <style>
    body { background:#0a0a0f; margin:0; padding:20px; display:flex; justify-content:center; }
    pre  { color:${color}; font-family:'JetBrains Mono','Courier New',monospace;
           font-size:${fontSize}px; line-height:1.0; white-space:pre;
           text-shadow:0 0 4px ${color}88; }
  </style>
</head>
<body>
<pre id="out"></pre>
<script>
const frames=[
${escapedFrames}
];
let i=0;
const out=document.getElementById('out');
setInterval(()=>{ out.textContent=frames[i++ % frames.length]; }, ${Math.round(1000/fps)});
<\/script>
</body>
</html>`;
    download('ascii-animation.html', html, 'text/html');
  }

  /** Export animation as a standalone JavaScript module. */
  function exportJS(frames, fps = 24) {
    const escapedFrames = frames.map(f =>
      '  `' + f.replace(/`/g, '\\`').replace(/\$/g, '\\$') + '`'
    ).join(',\n');

    const js = `/**
 * ASCII Animation — exported from ASCII Art Studio
 * Usage: import { AsciiAnimation } from './ascii-animation.js';
 *        const anim = new AsciiAnimation(document.querySelector('pre'));
 *        anim.play();
 */
export const frames = [
${escapedFrames}
];

export class AsciiAnimation {
  constructor(targetEl, fps = ${fps}) {
    this.target  = targetEl;
    this.fps     = fps;
    this.frames  = frames;
    this.index   = 0;
    this.timer   = null;
  }

  play() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.target.textContent = this.frames[this.index % this.frames.length];
      this.index++;
    }, 1000 / this.fps);
  }

  pause() { clearInterval(this.timer); this.timer = null; }

  seek(i) { this.index = ((i % this.frames.length) + this.frames.length) % this.frames.length; }

  destroy() { this.pause(); }
}
`;
    download('ascii-animation.js', js, 'application/javascript');
  }

  /** Export current frame as SVG text. */
  function exportSVG(asciiText, colorMode = 'green', fontSize = 8) {
    const colorMap = {
      green: '#00ff88', amber: '#ffaa00', white: '#e0e0e0',
      cyan:  '#00ccff', red:   '#ff3355',
    };
    const color  = colorMap[colorMode] || '#00ff88';
    const lines  = asciiText.split('\n');
    const lineH  = fontSize + 1;
    const width  = (lines[0]?.length || 80) * (fontSize * 0.6);
    const height = lines.length * lineH + 20;

    const textEls = lines.map((line, i) => {
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `  <text x="10" y="${20 + i * lineH}" font-size="${fontSize}">${escaped}</text>`;
    }).join('\n');

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0a0a0f"/>
  <g font-family="'JetBrains Mono','Courier New',monospace" fill="${color}" xml:space="preserve">
${textEls}
  </g>
</svg>`;
    download('ascii-art.svg', svg, 'image/svg+xml');
  }

  return { exportText, exportHTML, exportAnimatedHTML, exportJS, exportSVG, download };
})();
