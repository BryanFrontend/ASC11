/**
 * RENDERER
 * Handles all preview rendering:
 * - Pre-element (monochrome ASCII)
 * - Canvas (full-color ASCII)
 * Manages font size, spacing, and color theming.
 */

const Renderer = (() => {

  const COLOR_PALETTES = {
    green:  (r,g,b) => `#00ff88`,
    amber:  (r,g,b) => `#ffaa00`,
    white:  (r,g,b) => `#e0e0e0`,
    cyan:   (r,g,b) => `#00ccff`,
    red:    (r,g,b) => `#ff3355`,
    color:  (r,g,b) => `rgb(${r},${g},${b})`,
  };

  /**
   * Render ascii string to a <pre> element.
   * @param {string} asciiText
   * @param {HTMLPreElement} preEl
   * @param {Object} opts
   */
  function renderToElement(asciiText, preEl, opts = {}) {
    const { fontSize = 8, spacing = 1.0, colorMode = 'green' } = opts;
    preEl.style.fontSize     = `${fontSize}px`;
    preEl.style.lineHeight   = `${fontSize * spacing}px`;
    preEl.style.letterSpacing = `0px`;
    preEl.textContent = asciiText;

    // Remove all color classes and add current
    preEl.className = preEl.className.replace(/color-\w+/g, '').trim();
    preEl.classList.add(`color-${colorMode}`);
  }

  /**
   * Render colored ASCII to a canvas.
   * Each character is drawn individually with its pixel color.
   * @param {Array} colorData  — output of AsciiEngine.imageDataToColorAscii
   * @param {HTMLCanvasElement} canvas
   * @param {Object} opts
   */
  function renderColorToCanvas(colorData, canvas, opts = {}) {
    const { fontSize = 8, spacing = 1.0, colorMode = 'color' } = opts;
    if (!colorData || !colorData.length) return;

    const rows  = colorData.length;
    const cols  = colorData[0].length;
    const cellH = Math.ceil(fontSize * spacing);
    const cellW = Math.ceil(fontSize * 0.6);

    canvas.width  = cols * cellW;
    canvas.height = rows * cellH;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
    ctx.textBaseline = 'top';

    const palette = COLOR_PALETTES[colorMode] || COLOR_PALETTES.green;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = colorData[y][x];
        if (cell.char === ' ') continue;
        ctx.fillStyle = palette(cell.r, cell.g, cell.b);
        ctx.fillText(cell.char, x * cellW, y * cellH);
      }
    }
  }

  /**
   * Get dimensions for rendering a source (canvas/image/video)
   * scaled to the resolution factor.
   */
  function getScaledDimensions(srcW, srcH, resolution) {
    const factor = resolution / 100;
    // Approximate char aspect ratio compensation (chars are ~2x taller)
    const w = Math.max(10, Math.floor(srcW * factor));
    const h = Math.max(5,  Math.floor(srcH * factor * 0.45));
    return { w, h };
  }

  /**
   * Sample source (img/video/canvas) into a tiny hidden canvas,
   * returns ImageData.
   */
  function captureImageData(source, hiddenCanvas, targetW, targetH) {
    hiddenCanvas.width  = targetW;
    hiddenCanvas.height = targetH;
    const ctx = hiddenCanvas.getContext('2d');
    ctx.drawImage(source, 0, 0, targetW, targetH);
    return ctx.getImageData(0, 0, targetW, targetH);
  }

  return {
    renderToElement,
    renderColorToCanvas,
    getScaledDimensions,
    captureImageData,
    COLOR_PALETTES,
  };
})();
