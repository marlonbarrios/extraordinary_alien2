// Aligned with working pattern from instrumentalproximities (jsDelivr + 0.10.3)
import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

const mediaPipe = {
  handednesses: [],
  landmarks: [],
  worldLandmarks: [],
  ready: false,
  error: null,
};

let handLandmarker;
let runningMode = "VIDEO";
let lastVideoTime = -1;

const createFilesetResolver = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );
  return vision;
};

const createHandLandmarker = async (vision) => {
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode,
    numHands: 2,
  });
  mediaPipe.ready = true;
};

(async () => {
  try {
    const vision = await createFilesetResolver();
    await createHandLandmarker(vision);
  } catch (e1) {
    try {
      const vision = await createFilesetResolver();
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "CPU",
        },
        runningMode,
        numHands: 2,
      });
      mediaPipe.ready = true;
    } catch (e2) {
      mediaPipe.error = (e1 && e1.message) || String(e1);
      console.warn("MediaPipe hand model failed:", e1, e2);
    }
  }
})();

const predictWebcam = (video) => {
  if (!video || !video.elt) {
    window.requestAnimationFrame(() => predictWebcam(video));
    return;
  }
  const v = video.elt;
  if (handLandmarker && v.videoWidth > 0 && v.videoHeight > 0) {
    // Throttle by video frame (same as instrumentalproximities)
    if (lastVideoTime !== v.currentTime) {
      lastVideoTime = v.currentTime;
      const startTimeMs = performance.now();
      try {
        const results = handLandmarker.detectForVideo(v, startTimeMs);
        mediaPipe.handednesses = results.handednesses || [];
        mediaPipe.landmarks = results.landmarks || [];
        mediaPipe.worldLandmarks = results.worldLandmarks || [];
      } catch (e) {
        console.warn("HandLandmarker detectForVideo:", e);
      }
    }
  }
  window.requestAnimationFrame(() => predictWebcam(video));
};

mediaPipe.predictWebcam = predictWebcam;
export { mediaPipe };
