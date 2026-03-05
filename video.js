/**
 * VIDEO MODULE
 * Handles loading and looping video files for ASCII conversion.
 * Manages play/pause, seeking, and frame callback scheduling.
 */

const VideoModule = (() => {
  let videoEl   = null;
  let animFrame = null;
  let isLoaded  = false;
  let onFrame   = null;   // callback(videoEl) called each rendered frame
  let targetFPS = 24;
  let lastTime  = 0;

  /**
   * Load a video File object into the video element.
   * @param {HTMLVideoElement} el
   * @param {File} file
   * @returns {Promise<{width, height, duration}>}
   */
  function loadFile(el, file) {
    videoEl = el;
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      el.src  = url;
      el.loop = true;
      el.muted = true;
      el.onloadedmetadata = () => {
        isLoaded = true;
        resolve({
          width:    el.videoWidth,
          height:   el.videoHeight,
          duration: el.duration,
        });
      };
      el.onerror = reject;
    });
  }

  /**
   * Start the animation loop that calls onFrame at ~targetFPS.
   * @param {Function} frameCallback  — receives the video element
   * @param {number}   fps
   */
  function startLoop(frameCallback, fps = 24) {
    if (!videoEl || !isLoaded) return;
    onFrame   = frameCallback;
    targetFPS = fps;
    videoEl.play();

    function loop(ts) {
      animFrame = requestAnimationFrame(loop);
      const interval = 1000 / targetFPS;
      if (ts - lastTime < interval) return;
      lastTime = ts;
      if (onFrame) onFrame(videoEl);
    }

    animFrame = requestAnimationFrame(loop);
  }

  /** Update FPS without restarting the loop. */
  function setFPS(fps) { targetFPS = fps; }

  /** Stop the animation loop and pause video. */
  function stopLoop() {
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = null;
    if (videoEl) videoEl.pause();
  }

  /** Pause/resume. */
  function togglePlayback() {
    if (!videoEl) return false;
    if (videoEl.paused) { videoEl.play(); return true; }
    else                { videoEl.pause(); return false; }
  }

  function getIsLoaded() { return isLoaded; }

  function unload() {
    stopLoop();
    if (videoEl) {
      URL.revokeObjectURL(videoEl.src);
      videoEl.src = '';
    }
    isLoaded = false;
  }

  return { loadFile, startLoop, stopLoop, setFPS, togglePlayback, getIsLoaded, unload };
})();
