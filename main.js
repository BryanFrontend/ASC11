/**
 * MAIN.JS — ASCII ART STUDIO
 * Orchestrates all modules: media sources, engine, renderer, and export.
 */

const app = (() => {

  // ─── STATE ────────────────────────────────────────────────────────────────
  const state = {
    sourceType:   'image',    // 'image' | 'video' | 'webcam'
    isRendering:  false,
    currentAscii: '',
    frameBuffer:  [],         // array of ascii strings (captured frames)
    settings: {
      charset:    'classic',
      colorMode:  'green',
      invert:     false,
      edgeDetect: false,
      brightness: 128,
      contrast:   128,
      fontSize:   8,
      spacing:    1.0,
      resolution: 50,
      fps:        24,
    },
  };

  // ─── DOM REFS ─────────────────────────────────────────────────────────────
  const dom = {
    asciiOutput:    () => document.getElementById('ascii-output'),
    colorCanvas:    () => document.getElementById('color-canvas'),
    hiddenCanvas:   () => document.getElementById('hidden-canvas'),
    videoEl:        () => document.getElementById('video-element'),
    imageEl:        () => document.getElementById('image-element'),
    idleScreen:     () => document.getElementById('idle-screen'),
    uploadZone:     () => document.getElementById('upload-zone'),
    fileInput:      () => document.getElementById('file-input'),
    webcamControls: () => document.getElementById('webcam-controls'),
    startCamBtn:    () => document.getElementById('btn-start-cam'),
    stopCamBtn:     () => document.getElementById('btn-stop-cam'),
    frameBuffer:    () => document.getElementById('frame-buffer'),
    statusFPS:      () => document.getElementById('status-fps'),
    statusRes:      () => document.getElementById('status-res'),
    statusChars:    () => document.getElementById('status-chars'),
    statusMode:     () => document.getElementById('status-mode'),
    renderBtnText:  () => document.getElementById('render-btn-text'),
    notification:   () => document.getElementById('notification'),
    fpsControl:     () => document.getElementById('fps-control'),
  };

  // ─── ANIMATION LOOP ───────────────────────────────────────────────────────
  let animFrame    = null;
  let lastRenderTs = 0;
  let frameCount   = 0;
  let fpsTimer     = 0;
  let measuredFPS  = 0;

  function renderLoop(ts) {
    animFrame = requestAnimationFrame(renderLoop);

    const interval = 1000 / state.settings.fps;
    if (ts - lastRenderTs < interval) return;
    lastRenderTs = ts;

    // FPS measurement
    frameCount++;
    if (ts - fpsTimer > 1000) {
      measuredFPS = frameCount;
      frameCount  = 0;
      fpsTimer    = ts;
      dom.statusFPS().textContent = `FPS: ${measuredFPS}`;
    }

    // Get source
    let source = null;
    if (state.sourceType === 'image')  source = dom.imageEl();
    if (state.sourceType === 'video')  source = dom.videoEl();
    if (state.sourceType === 'webcam') source = dom.videoEl();

    if (!source) return;

    const srcW = source.naturalWidth  || source.videoWidth  || source.width;
    const srcH = source.naturalHeight || source.videoHeight || source.height;
    if (!srcW || !srcH) return;

    const { w, h } = Renderer.getScaledDimensions(srcW, srcH, state.settings.resolution);
    const imageData = Renderer.captureImageData(source, dom.hiddenCanvas(), w, h);

    dom.statusRes().textContent   = `RES: ${w}×${h}`;

    const opts = {
      charset:    state.settings.charset,
      brightness: state.settings.brightness,
      contrast:   state.settings.contrast,
      invert:     state.settings.invert,
      edgeDetect: state.settings.edgeDetect,
    };

    if (state.settings.colorMode === 'color') {
      // Color canvas rendering
      const colorData = AsciiEngine.imageDataToColorAscii(imageData, opts);
      dom.asciiOutput().classList.add('hidden');
      const canvas = dom.colorCanvas();
      canvas.classList.remove('hidden');
      Renderer.renderColorToCanvas(colorData, canvas, {
        fontSize:  state.settings.fontSize,
        spacing:   state.settings.spacing,
        colorMode: 'color',
      });
      // Also store text version for export
      state.currentAscii = AsciiEngine.imageDataToAscii(imageData, opts);
    } else {
      // Pre-element rendering
      const ascii = AsciiEngine.imageDataToAscii(imageData, opts);
      state.currentAscii = ascii;
      dom.colorCanvas().classList.add('hidden');
      const pre = dom.asciiOutput();
      pre.classList.remove('hidden');
      Renderer.renderToElement(ascii, pre, {
        fontSize:  state.settings.fontSize,
        spacing:   state.settings.spacing,
        colorMode: state.settings.colorMode,
      });
      dom.statusChars().textContent = `CHARS: ${ascii.replace(/\n/g,'').length}`;
    }
  }

  function startRendering() {
    if (animFrame) return;
    animFrame = requestAnimationFrame(renderLoop);
    state.isRendering = true;
    dom.renderBtnText().textContent = '◻ STOP';
    dom.statusMode().textContent    = state.sourceType.toUpperCase();
    document.querySelector('.pill-btn').classList.add('active');
  }

  function stopRendering() {
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame            = null;
    state.isRendering    = false;
    dom.renderBtnText().textContent = '▶ RENDER';
    dom.statusMode().textContent    = 'PAUSED';
    document.querySelector('.pill-btn').classList.remove('active');
  }

  // ─── SETTINGS ─────────────────────────────────────────────────────────────

  function updateSettings() {
    state.settings.charset    = document.getElementById('charset-select').value;
    state.settings.colorMode  = document.getElementById('color-mode').value;
    state.settings.invert     = document.getElementById('invert-toggle').checked;
    state.settings.edgeDetect = document.getElementById('edge-toggle').checked;
  }

  function updateSlider(key, rawValue) {
    const val = parseFloat(rawValue);
    const map = {
      brightness: () => { state.settings.brightness = val;         document.getElementById('val-brightness').textContent = Math.round(val); },
      contrast:   () => { state.settings.contrast   = val;         document.getElementById('val-contrast').textContent   = Math.round(val); },
      fontsize:   () => { state.settings.fontSize   = val;         document.getElementById('val-fontsize').textContent   = Math.round(val); },
      spacing:    () => { state.settings.spacing    = val / 10;    document.getElementById('val-spacing').textContent    = (val/10).toFixed(1); },
      resolution: () => { state.settings.resolution = val;         document.getElementById('val-resolution').textContent = Math.round(val); },
      fps:        () => { state.settings.fps        = Math.round(val); document.getElementById('val-fps').textContent   = Math.round(val); },
    };
    if (map[key]) map[key]();
  }

  // ─── SOURCE SWITCHING ─────────────────────────────────────────────────────

  function setSource(type) {
    // Reset rendering
    stopRendering();
    WebcamModule.stop(dom.videoEl());
    VideoModule.stopLoop();

    state.sourceType = type;

    // Update active button
    document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${type}`).classList.add('active');

    // Toggle UI sections
    const isUpload  = type === 'image' || type === 'video';
    const isWebcam  = type === 'webcam';
    dom.uploadZone().style.display     = isUpload ? 'block' : 'none';
    dom.webcamControls().style.display = isWebcam ? 'block' : 'none';

    // FPS control only for video/webcam
    dom.fpsControl().style.display = type === 'image' ? 'none' : 'block';

    // Reset accept attr on file input
    dom.fileInput().accept = type === 'video' ? 'video/*' : 'image/*';

    showIdle();
    notify(`SOURCE: ${type.toUpperCase()}`);
  }

  // ─── FILE UPLOAD ──────────────────────────────────────────────────────────

  function handleFileUpload(file) {
    if (!file) return;
    stopRendering();

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (isImage && state.sourceType !== 'image') {
      setSource('image');
    } else if (isVideo && state.sourceType !== 'video') {
      setSource('video');
    }

    hideIdle();

    if (isImage) {
      const url = URL.createObjectURL(file);
      dom.imageEl().src = url;
      dom.imageEl().onload = () => {
        startRendering();
        notify(`IMAGE LOADED: ${file.name}`);
      };
    } else if (isVideo) {
      VideoModule.loadFile(dom.videoEl(), file).then(info => {
        notify(`VIDEO LOADED: ${Math.round(info.duration)}s — ${info.width}×${info.height}`);
        startRendering();
      }).catch(err => {
        notify(`ERROR: ${err.message}`);
      });
    }
  }

  // ─── WEBCAM ───────────────────────────────────────────────────────────────

  async function startWebcam() {
    try {
      hideIdle();
      await WebcamModule.start(dom.videoEl());
      dom.startCamBtn().classList.add('hidden');
      dom.stopCamBtn().classList.remove('hidden');
      startRendering();
      notify('WEBCAM ACTIVE');
    } catch (err) {
      showIdle();
      notify(`CAMERA ERROR: ${err.message}`);
    }
  }

  function stopWebcam() {
    stopRendering();
    WebcamModule.stop(dom.videoEl());
    dom.startCamBtn().classList.remove('hidden');
    dom.stopCamBtn().classList.add('hidden');
    showIdle();
    notify('WEBCAM STOPPED');
  }

  // ─── PLAYBACK ─────────────────────────────────────────────────────────────

  function toggleRendering() {
    if (!state.isRendering) {
      // Check we have a valid source
      const src = state.sourceType;
      if (src === 'image' && !dom.imageEl().src) { notify('LOAD AN IMAGE FIRST'); return; }
      if (src === 'video' && !dom.videoEl().src)  { notify('LOAD A VIDEO FIRST');  return; }
      if (src === 'webcam' && !WebcamModule.getIsActive()) { notify('START WEBCAM FIRST'); return; }
      startRendering();
    } else {
      stopRendering();
    }
  }

  // ─── FRAME CAPTURE ────────────────────────────────────────────────────────

  function captureFrame() {
    if (!state.currentAscii) { notify('NOTHING TO CAPTURE'); return; }
    state.frameBuffer.push(state.currentAscii);
    updateFrameBuffer();
    notify(`FRAME ${state.frameBuffer.length} CAPTURED`);
  }

  function clearFrameBuffer() {
    state.frameBuffer = [];
    updateFrameBuffer();
    notify('BUFFER CLEARED');
  }

  function updateFrameBuffer() {
    const el = dom.frameBuffer();
    if (state.frameBuffer.length === 0) {
      el.innerHTML = '<div class="buffer-empty">No frames captured</div>';
      return;
    }
    el.innerHTML = state.frameBuffer.map((_, i) =>
      `<div class="frame-thumb" title="Frame ${i+1}" onclick="app.previewFrame(${i})">◈</div>`
    ).join('');
  }

  function previewFrame(i) {
    const f = state.frameBuffer[i];
    if (!f) return;
    const pre = dom.asciiOutput();
    pre.classList.remove('hidden');
    dom.colorCanvas().classList.add('hidden');
    Renderer.renderToElement(f, pre, {
      fontSize:  state.settings.fontSize,
      spacing:   state.settings.spacing,
      colorMode: state.settings.colorMode,
    });
  }

  // ─── EXPORT ───────────────────────────────────────────────────────────────

  function exportAs(format) {
    if (!state.currentAscii) { notify('NOTHING TO EXPORT'); return; }
    const { colorMode, fontSize, fps } = state.settings;
    switch (format) {
      case 'txt':  ExportModule.exportText(state.currentAscii); break;
      case 'html': ExportModule.exportHTML(state.currentAscii, colorMode, fontSize); break;
      case 'svg':  ExportModule.exportSVG(state.currentAscii, colorMode, fontSize); break;
      case 'js':
        const frames = state.frameBuffer.length > 0 ? state.frameBuffer : [state.currentAscii];
        ExportModule.exportJS(frames, fps);
        break;
    }
    notify(`EXPORTED AS ${format.toUpperCase()}`);
  }

  function exportAnimation() {
    if (state.frameBuffer.length === 0) { notify('CAPTURE FRAMES FIRST'); return; }
    ExportModule.exportAnimatedHTML(state.frameBuffer, state.settings.colorMode, state.settings.fontSize, state.settings.fps);
    notify(`ANIMATION EXPORTED: ${state.frameBuffer.length} FRAMES`);
  }

  // ─── PRESETS ──────────────────────────────────────────────────────────────

  const PRESETS = {
    matrix:    { charset: 'binary',  colorMode: 'green',  brightness: 140, contrast: 160, invert: false, edgeDetect: false, fontSize: 7, resolution: 60 },
    retro:     { charset: 'classic', colorMode: 'amber',  brightness: 120, contrast: 140, invert: false, edgeDetect: false, fontSize: 9, resolution: 45 },
    blueprint: { charset: 'dots',    colorMode: 'cyan',   brightness: 140, contrast: 150, invert: true,  edgeDetect: true,  fontSize: 8, resolution: 55 },
    thermal:   { charset: 'blocks',  colorMode: 'red',    brightness: 130, contrast: 170, invert: false, edgeDetect: false, fontSize: 8, resolution: 50 },
    hacker:    { charset: 'hex',     colorMode: 'green',  brightness: 150, contrast: 180, invert: false, edgeDetect: true,  fontSize: 7, resolution: 60 },
    minimal:   { charset: 'dots',    colorMode: 'white',  brightness: 128, contrast: 100, invert: false, edgeDetect: false, fontSize: 10, resolution: 40 },
  };

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    Object.assign(state.settings, p);

    // Update DOM controls
    document.getElementById('charset-select').value = p.charset;
    document.getElementById('color-mode').value     = p.colorMode;
    document.getElementById('invert-toggle').checked = p.invert;
    document.getElementById('edge-toggle').checked   = p.edgeDetect;
    document.getElementById('sl-brightness').value   = p.brightness;
    document.getElementById('sl-contrast').value     = p.contrast;
    document.getElementById('sl-fontsize').value     = p.fontSize;
    document.getElementById('sl-resolution').value   = p.resolution;
    document.getElementById('val-brightness').textContent = p.brightness;
    document.getElementById('val-contrast').textContent   = p.contrast;
    document.getElementById('val-fontsize').textContent   = p.fontSize;
    document.getElementById('val-resolution').textContent = p.resolution;

    notify(`PRESET: ${name.toUpperCase()}`);
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  function showIdle() {
    dom.idleScreen().classList.remove('hidden');
    dom.asciiOutput().classList.add('hidden');
    dom.colorCanvas().classList.add('hidden');
  }

  function hideIdle() {
    dom.idleScreen().classList.add('hidden');
  }

  let notifyTimer = null;
  function notify(msg) {
    const el = dom.notification();
    el.textContent = msg;
    el.classList.remove('hidden');
    // Force reflow
    void el.offsetWidth;
    el.classList.add('show');
    if (notifyTimer) clearTimeout(notifyTimer);
    notifyTimer = setTimeout(() => {
      el.classList.remove('show');
    }, 2000);
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────

  function init() {
    // File input
    dom.fileInput().addEventListener('change', e => {
      handleFileUpload(e.target.files[0]);
    });

    // Drag & drop on upload zone
    const uz = dom.uploadZone();
    uz.addEventListener('dragover',  e => { e.preventDefault(); uz.classList.add('dragover'); });
    uz.addEventListener('dragleave', ()  => uz.classList.remove('dragover'));
    uz.addEventListener('drop', e => {
      e.preventDefault();
      uz.classList.remove('dragover');
      handleFileUpload(e.dataTransfer.files[0]);
    });

    // Default UI state
    dom.fpsControl().style.display = 'none'; // image mode default

    // Example image auto-load
    const exampleImg = new Image();
    exampleImg.crossOrigin = 'anonymous';
    exampleImg.src = 'assets/example.jpg';
    exampleImg.onload = () => {
      dom.imageEl().src = exampleImg.src;
      hideIdle();
      startRendering();
    };
    exampleImg.onerror = () => {
      // No example image available, stay in idle
    };

    notify('ASCII STUDIO READY');
  }

  // Start on DOM ready
  document.addEventListener('DOMContentLoaded', init);

  // ─── PUBLIC ───────────────────────────────────────────────────────────────
  return {
    setSource, updateSettings, updateSlider,
    startWebcam, stopWebcam,
    toggleRendering, captureFrame, previewFrame,
    clearFrameBuffer, exportAs, exportAnimation,
    applyPreset, notify,
  };
})();
