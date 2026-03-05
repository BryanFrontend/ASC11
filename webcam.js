/**
 * WEBCAM MODULE
 * Manages getUserMedia lifecycle and feeds frames
 * to a callback for ASCII processing.
 */

const WebcamModule = (() => {
  let stream   = null;
  let isActive = false;

  /**
   * Request camera access and attach stream to a video element.
   * @param {HTMLVideoElement} videoEl
   * @returns {Promise<void>}
   */
  async function start(videoEl) {
    if (isActive) return;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:  { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      videoEl.srcObject = stream;
      videoEl.muted = true;

      await new Promise((resolve, reject) => {
        videoEl.onloadedmetadata = () => {
          videoEl.play().then(resolve).catch(reject);
        };
        videoEl.onerror = reject;
      });

      isActive = true;
      return { width: videoEl.videoWidth, height: videoEl.videoHeight };
    } catch (err) {
      stream   = null;
      isActive = false;
      throw err;
    }
  }

  /**
   * Stop the webcam stream and clear the video element.
   * @param {HTMLVideoElement} videoEl
   */
  function stop(videoEl) {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (videoEl) {
      videoEl.srcObject = null;
    }
    isActive = false;
  }

  function getIsActive() { return isActive; }

  return { start, stop, getIsActive };
})();
