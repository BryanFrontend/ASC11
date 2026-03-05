/**
 * ASCII ENGINE
 * Core pixel-to-character conversion logic.
 * Handles multiple character sets, brightness/contrast,
 * inversion, and edge detection.
 */

const AsciiEngine = (() => {

  // ─── CHARACTER SETS ───────────────────────────────────────────────────────
  const CHARSETS = {
    classic: ' .\'`^",:;Il!i><~+_-?][}{1)(|tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
    dense:   ' ░▒▓█',
    blocks:  ' ░▒▓▀▄▌▐█',
    braille: '⠀⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿',
    dots:    ' ·∙•●',
    binary:  ' 01',
    hex:     ' 0123456789ABCDEF',
  };

  // ─── CONVERSION ───────────────────────────────────────────────────────────

  /**
   * Convert an ImageData (from Canvas) to an ASCII string.
   * @param {ImageData} imageData
   * @param {Object}    opts
   * @returns {string}
   */
  function imageDataToAscii(imageData, opts = {}) {
    const {
      charset    = 'classic',
      brightness = 128,
      contrast   = 128,
      invert     = false,
      edgeDetect = false,
      cellW      = 1,
      cellH      = 1,
    } = opts;

    const chars = CHARSETS[charset] || CHARSETS.classic;
    const { data, width, height } = imageData;

    // Build luminance map
    const lum = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Apply edge detection (Sobel)
    let processedLum = edgeDetect ? applySobel(lum, width, height) : lum;

    // Apply brightness / contrast
    processedLum = applyBrightnessContrast(processedLum, brightness, contrast);

    // Build ASCII rows
    const rows = [];
    for (let y = 0; y < height; y++) {
      let row = '';
      for (let x = 0; x < width; x++) {
        let val = processedLum[y * width + x];
        if (invert) val = 255 - val;
        // Map 0-255 → index into char array
        const idx = Math.floor((val / 255) * (chars.length - 1));
        row += chars[Math.max(0, Math.min(chars.length - 1, idx))];
      }
      rows.push(row);
    }

    return rows.join('\n');
  }

  /**
   * Convert ImageData to ASCII — returning per-character color data.
   * Returns an array of rows; each row is an array of {char, r, g, b}.
   */
  function imageDataToColorAscii(imageData, opts = {}) {
    const {
      charset    = 'classic',
      brightness = 128,
      contrast   = 128,
      invert     = false,
      edgeDetect = false,
    } = opts;

    const chars = CHARSETS[charset] || CHARSETS.classic;
    const { data, width, height } = imageData;

    const lum = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    let processedLum = edgeDetect ? applySobel(lum, width, height) : lum;
    processedLum = applyBrightnessContrast(processedLum, brightness, contrast);

    const result = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const idx4 = (y * width + x) * 4;
        let val = processedLum[y * width + x];
        if (invert) val = 255 - val;
        const charIdx = Math.floor((val / 255) * (chars.length - 1));
        row.push({
          char: chars[Math.max(0, Math.min(chars.length - 1, charIdx))],
          r: data[idx4],
          g: data[idx4 + 1],
          b: data[idx4 + 2],
        });
      }
      result.push(row);
    }
    return result;
  }

  // ─── IMAGE PROCESSING ─────────────────────────────────────────────────────

  function applyBrightnessContrast(lum, brightness, contrast) {
    const out = new Float32Array(lum.length);
    // brightness: 0-255, neutral = 128
    // contrast:   0-255, neutral = 128
    const b = (brightness - 128);
    const c = contrast === 255 ? 255 : (contrast / 128);
    for (let i = 0; i < lum.length; i++) {
      let v = lum[i] + b;
      v = (v - 128) * c + 128;
      out[i] = Math.max(0, Math.min(255, v));
    }
    return out;
  }

  function applySobel(lum, width, height) {
    const out = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const tl = lum[(y-1)*width+(x-1)]; const t = lum[(y-1)*width+x]; const tr = lum[(y-1)*width+(x+1)];
        const ml = lum[y*width+(x-1)];                                     const mr = lum[y*width+(x+1)];
        const bl = lum[(y+1)*width+(x-1)]; const b = lum[(y+1)*width+x]; const br = lum[(y+1)*width+(x+1)];
        const gx = -tl - 2*ml - bl + tr + 2*mr + br;
        const gy = -tl - 2*t  - tr + bl + 2*b  + br;
        out[idx] = Math.min(255, Math.sqrt(gx*gx + gy*gy));
      }
    }
    return out;
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────
  return {
    imageDataToAscii,
    imageDataToColorAscii,
    CHARSETS,
  };
})();
