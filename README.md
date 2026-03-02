# Extraordinary Alien: A Soft Body Character and Hand Gesture Tracking

<img width="1787" alt="Screenshot 2025-03-09 at 10 47 42 PM" src="https://github.com/user-attachments/assets/9955495d-ced2-4a84-a059-31fa9ada61e3" />


**Extraordinary Alien** is a JavaScript sketch that creates an interactive simulation using webcam input for hand tracking. Developed by [Marlon Barrios Solano](https://github.com/marlonbarrios), this project combines the power of **p5.js**, **Toxiclibs**, and **MediaPipe** to create a unique, immersive experience where a soft body character (the Extraordinary Alien) reacts to your hand gestures.  
*Part of Duets in Latent Space*

For more about Marlon, his projects, and how you can support his work, visit his [Linktree](https://linktr.ee/marlonbarriososolano).

---<img width="1787" alt="Screenshot 2025-03-09 at 10 48 49 PM" src="https://github.com/user-attachments/assets/af667b32-4bfd-4c1c-b36e-12f52d1aacb9" />


## Live Demo

- Launch Extraordinary Alien (Original Version):  
  https://marlonbarrios.github.io/extraordinary-alien/

- Launch Extraordinary Alien 2.0:  
  https://marlonbarrios.github.io/extraordinary_alien2/

- **Live Code Asset:**  
  https://github.com/marlonbarrios/extraordinary_alien2/assets/90220317/636b6eb4-b6a6-41dd-b9df-f8800d5b4703

- **Code Repository:**  
  [https://github.com/marlonbarrios/extraordinary_alien2](https://github.com/marlonbarrios/extraordinary_alien2)

---

## About

This project leverages the following technologies:

- **[p5.js](https://p5js.org/)** — [Reference](https://p5js.org/reference/): Creative coding and interactive graphics in the browser.
- **[Toxiclibs](http://haptic-data.com/toxiclibsjs/):** Verlet physics (2D particles and springs) for the soft-body simulation.
- **[MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js):** Hand tracking (21 landmarks). Exposed as `window.mediaPipe` with `landmarks`, `predictWebcam`, `ready`, and `error`.

**Documentation (official):**

| Library      | Docs |
|-------------|------|
| p5.js       | [p5js.org/reference](https://p5js.org/reference/) |
| p5.sound    | [p5js.org/reference/#/libraries/p5.sound](https://p5js.org/reference/#/libraries/p5.sound) |
| Toxiclibs   | [haptic-data.com/toxiclibsjs](http://haptic-data.com/toxiclibsjs/) |
| MediaPipe Hands | [Hand Landmarker – Web (JavaScript)](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js) |

---

## How to run locally

Hand tracking loads scripts from CDNs and must run over **HTTP** (not `file://`):

1. **Option A:** In the project folder run:
   ```bash
   npx serve .
   ```
   Then open the URL shown (e.g. `http://localhost:3000`) and open `index.html` or the root.

2. **Option B:** Use the “Live Server” extension in VS Code / Cursor and “Open with Live Server” on `index.html`.

If you open the file directly from the disk (`file://`), MediaPipe may not load. Use a local server for hand tracking to work.

---

## Functionality

- **Particle Simulation:**  
  Simulates particles connected by springs to form dynamic, organic structures.
  
- **Hand Tracking:**  
  Uses MediaPipe Hand Landmarker to track hand landmarks via webcam. Index finger and thumb drive repulsion, pinch, and color changes.
  
- **Interactive Controls:**  
  Press the spacebar to toggle the visibility of springs and to control audio effects, adding an extra layer of interactivity.

---

## Code Overview

- **`index.html`**  
  Loads p5, Toxiclibs, and MediaPipe (via `mediaPipe.js`). Sets `window.mediaPipe` with `landmarks`, `predictWebcam`, `ready`, and `error`. Sketch starts the prediction loop from `draw()` when ready.

- **`keyPressed()`**  
  Spacebar toggles spring visibility and starts/pauses the drone and audio context.

- **`setup()`**  
  Canvas, physics bounds, particles (body + tentacles), eyes, tendrils, springs, webcam via `captureWebcam()`.

- **`draw()`**  
  Starts MediaPipe prediction loop when `window.mediaPipe.predictWebcam` is available; draws webcam (center space), runs physics, reads hand from `window.mediaPipe.landmarks` for repulsion, pinch, and color; draws the Extraordinary Alien creature and debug (MediaPipe status, Hands count, FPS).

- **`captureWebcam()`**  
  `createCapture()` for user-facing video; callback sets stream and plays video.

- **`windowResized()`**  
  Resizes the canvas; physics bounds are set once in `setup()`.

- **Hand tracking**  
  Landmarks are in **center space** (origin = canvas center). Index tip = landmark 8, thumb tip = landmark 4. See [Hand Landmarker web guide](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js).

*Other helpers: audio (drone, movement, pinch sounds), `updateCreatureColor()`, `updateEnergyLevel()`, Beam class.*

---

## Credits

This app is adapted from the amazing work by [The Coding Train](https://thecodingtrain.com/challenges/177-soft-body-character) (Daniel Shiffman) and @nahuelgerth, extending their concepts of creative coding and interactive simulations with hand tracking technology.

---

## Screenshot

![Extraordinary Alien Screenshot](https://github.com/marlonbarrios/extraordinary_alien2/assets/90220317/30b7eba8-033b-460a-8fca-dfd113a96f36)

---

## License

MIT License

Copyright (c) 2024 Marlon Barrios Solano

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
