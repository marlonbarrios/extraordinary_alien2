/* This code is a JavaScript sketch that creates an interactive simulation using webcam input for hand tracking. It begins by setting up a canvas and initializing a 2D physics engine for particle simulations. The sketch then creates an array to hold particles representing points on the screen and another array for "eyes." It also sets up springs between adjacent particles and between particles and eyes to simulate connections.

 The code initializes webcam capture with specific settings like facing mode, frame rate, and the number of hands to track. It adjusts the dimensions of the camera feed to fit the canvas while maintaining aspect ratio.*/

// addapted from the Coding Train / Daniel Shiffman and @nahuelgerth
// concept, programming a performance by marlon barrios solano

// Importing necessary modules from the Toxi library
const { VerletPhysics2D, VerletParticle2D, VerletSpring2D } = toxi.physics2d;
const { GravityBehavior } = toxi.physics2d.behaviors;
const { Vec2D, Rect } = toxi.geom;

// Declaration of variables
let physics;
let particles = [];
let eyes = [];
let springs = [];
let showSprings = false; // Flag to toggle visibility of springs
let numPoints = 12;
let osc, droneOsc;
let soundStarted = false;
let audioContext;
let movementOsc, filterOsc, modulatorOsc;
let filter;
let delay;
let stretchThreshold = 50; // Lower threshold for more responsiveness
let movementStarted = false;
let lastPinchTime = 0;
let pinchDelay = 200; // Minimum time between pinch sounds
let beams = []; // Array to store active beams
let interactionIntensity = 0; // Track how much the creature is being interacted with
let rhythmOsc, subOsc;
let beatInterval;
let lastBeatTime = 0;
let beatPattern = 0;
let lastPopTime = 0;
let popInterval = 1000; // Minimum time between random pops
let soundType = 0; // Track current vocalization type
let lastSoundChange = 0;
let soundChangeInterval = 3000; // Change sound type every 3 seconds
let creatureColor = {
  r: 255,
  g: 0,
  b: 200,  // Starting with fuchsia
  targetR: 255,
  targetG: 0,
  targetB: 200,
  defaultR: 255, // Store default color
  defaultG: 0,
  defaultB: 200
};
let colorChangeSpeed = 0.05;
let lastColorChange = 0;
let colorChangeDelay = 500; // Minimum time between color changes
let energyLevel = 0;
let maxEnergy = 1.0;
let energyDecayRate = 0.02;
let lastEnergyBoost = 0;
let energyBoostDelay = 100;
let mediaPipePredictionStarted = false;

// Function to toggle spring visibility with spacebar
function keyPressed() {
  if (key == ' ') {
    showSprings = !showSprings;
    
    // Initialize audio context on first spacebar press
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      setupMovementSound();
      startDrone();
      soundStarted = true;
    } else {
      if (!soundStarted) {
        audioContext.resume();
        startDrone();
        soundStarted = true;
      } else {
        stopDrone();
        soundStarted = false;
      }
    }
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  captureWebcam();
  let bounds = new Rect(0, 0, width, height);
  physics = new VerletPhysics2D();
  physics.setWorldBounds(bounds);

  let centerX = width/2;
  let centerY = height/2;
  
  // Create main body - more alien-like shape
  let mainRadius = 100;
  for (let i = 0; i < numPoints; i++) {
    let angle = (i / numPoints) * TWO_PI;
    // Create undulating shape
    let r = mainRadius * (1 + sin(angle * 3) * 0.3);
    let x = centerX + r * cos(angle);
    let y = centerY + r * sin(angle);
    particles.push(new Particle(x, y));
  }

  // Create multiple tentacles/appendages
  let numTentacles = 7;  // Odd number for asymmetry
  for (let i = 0; i < numTentacles; i++) {
    let baseAngle = (i / numTentacles) * TWO_PI;
    let tentacleLength = random(4, 7);  // Variable length tentacles
    
    let prevParticle = particles[i % particles.length];
    for (let j = 0; j < tentacleLength; j++) {
      let segmentLength = 20 * (1 - j/tentacleLength * 0.3);  // Tapered tentacles
      let angle = baseAngle + sin(j) * 0.2;  // Curved tentacles
      let x = prevParticle.x + segmentLength * cos(angle);
      let y = prevParticle.y + segmentLength * sin(angle);
      let particle = new Particle(x, y);
      particles.push(particle);
      // Softer than body but still holds tentacle shape
      springs.push(new Spring(prevParticle, particle, 0.02));
      prevParticle = particle;
    }
  }

  // Create two large eyes
  let eyeDistance = 60;  // Distance between eyes
  let eyeY = centerY - 20;  // Height of eyes
  
  // Left eye
  eyes.push(new Particle(centerX - eyeDistance, eyeY));
  // Right eye
  eyes.push(new Particle(centerX + eyeDistance, eyeY));

  // Connect eyes with multiple organic tendrils
  let numTendrils = 5;  // Number of tendrils between eyes
  for (let i = 0; i < numTendrils; i++) {
    let prevPoint = eyes[0];  // Start from left eye
    let numSegments = 4;  // Segments per tendril
    
    // Create curved path for each tendril
    for (let j = 1; j < numSegments; j++) {
      let t = j / numSegments;
      let offsetY = sin(i * PI/2) * 30 * (1 - abs(t - 0.5) * 2);
      let x = lerp(eyes[0].x, eyes[1].x, t);
      let y = lerp(eyes[0].y, eyes[1].y, t) + offsetY;
      
      let tendrilPoint = new Particle(x, y);
      particles.push(tendrilPoint);
      springs.push(new Spring(prevPoint, tendrilPoint, 0.015));
      prevPoint = tendrilPoint;
    }
    springs.push(new Spring(prevPoint, eyes[1], 0.015));
  }

  // Connect eyes to body (stronger so eyes stay with body)
  eyes.forEach(eye => {
    for (let i = 0; i < 4; i++) {
      let bodyPoint = particles[floor(random(numPoints))];
      springs.push(new Spring(eye, bodyPoint, 0.04));
    }
  });

  // Connect body particles with springs (stiffer = more body integrity)
  for (let i = 0; i < numPoints; i++) {
    // Main ring: stiffer so body holds shape
    springs.push(new Spring(particles[i], particles[(i + 1) % numPoints], 0.07));
    // Opposite side: keeps body from flattening
    springs.push(new Spring(particles[i], particles[(i + numPoints/2) % numPoints], 0.05));
    // Extra cross-links: one step either side of opposite for firmer mesh
    springs.push(new Spring(particles[i], particles[(i + numPoints/2 - 1 + numPoints) % numPoints], 0.03));
    springs.push(new Spring(particles[i], particles[(i + numPoints/2 + 1) % numPoints], 0.03));
  }

  setupMovementSound();
}

function draw() {
  background(0);

  // Fallback: start prediction loop if module loaded after capture callback
  if (capture && window.mediaPipe && window.mediaPipe.predictWebcam && !mediaPipePredictionStarted) {
    mediaPipePredictionStarted = true;
    window.mediaPipe.predictWebcam(capture);
  }

  // Calculate video dimensions
  let vidWidth = width;
  let vidHeight = width * (capture.height / capture.width);
  
  if (vidHeight < height) {
    vidHeight = height;
    vidWidth = height * (capture.width / capture.height);
  }

  push();
  translate(width/2, height/2);
  
  // Draw webcam
  push();
  imageMode(CENTER);
  scale(-1, 1);
  tint(255, 200);
  image(capture, 0, 0, vidWidth, vidHeight);
  pop();

  physics.update();

  // Handle hand tracking (MediaPipe → window.mediaPipe.landmarks; support both hands)
  const mp = window.mediaPipe;
  if (mp && mp.landmarks && mp.landmarks.length > 0) {
    // Build list of index/thumb positions from all hands (same as instrumentalproximities)
    let handPoints = [];
    for (let h = 0; h < mp.landmarks.length; h++) {
      if (mp.landmarks[h] && mp.landmarks[h][8] && mp.landmarks[h][4]) {
        handPoints.push({
          indexX: map(mp.landmarks[h][8].x, 1, 0, -vidWidth/2, vidWidth/2),
          indexY: map(mp.landmarks[h][8].y, 0, 1, -vidHeight/2, vidHeight/2),
          thumbX: map(mp.landmarks[h][4].x, 1, 0, -vidWidth/2, vidWidth/2),
          thumbY: map(mp.landmarks[h][4].y, 0, 1, -vidHeight/2, vidHeight/2),
        });
      }
    }
    let firstHand = handPoints[0];
    if (firstHand) {
      let indexX = firstHand.indexX, indexY = firstHand.indexY;
      let thumbX = firstHand.thumbX, thumbY = firstHand.thumbY;

      // Track interaction intensity (any hand)
      let handPresent = false;
      for (let pt of handPoints) {
        particles.forEach(particle => {
          let d = dist(particle.x - width/2, particle.y - height/2, pt.indexX, pt.indexY);
          if (d < 150) {
            handPresent = true;
            interactionIntensity = lerp(interactionIntensity, 1, 0.1);
            if (millis() - lastColorChange > colorChangeDelay) {
              creatureColor.targetR = random([0, 255]);
              creatureColor.targetG = random([0, 255]);
              creatureColor.targetB = random([150, 200, 240]);
              lastColorChange = millis();
            }
          }
        });
      }
      if (!handPresent) {
        creatureColor.targetR = creatureColor.defaultR;
        creatureColor.targetG = creatureColor.defaultG;
        creatureColor.targetB = creatureColor.defaultB;
        interactionIntensity = lerp(interactionIntensity, 0, 0.05);
      }
      updateCreatureColor();

      // Repulsion from all hands (gentler so body deforms but doesn’t fly apart)
      for (let pt of handPoints) {
        particles.forEach(particle => {
          let d = dist(particle.x - width/2, particle.y - height/2, pt.indexX, pt.indexY);
          if (d < 90) {
            let force = map(d, 0, 90, 5, 0);  // Softer push, body stays cohesive
            let angle = atan2(particle.y - height/2 - pt.indexY, particle.x - width/2 - pt.indexX);
            particle.x += cos(angle) * force;
            particle.y += sin(angle) * force;
          }
        });
      }

      // Grab with pinch (first hand only)
      if (dist(thumbX, thumbY, indexX, indexY) < 50) {
        particles[0].lock();
        particles[0].x = indexX + width/2;
        particles[0].y = indexY + height/2;
        particles[0].unlock();
        let pinchX = (thumbX + indexX) / 2 + width/2;
        let pinchY = (thumbY + indexY) / 2 + height/2;
        let numBeams = floor(random(1, 3));
        for (let i = 0; i < numBeams; i++) {
          beams.push(new Beam(pinchX + random(-10, 10), pinchY + random(-10, 10)));
        }
        makePinchSound();
      }
    }
  } else {
    // Also return to default color when no hand is present
    creatureColor.targetR = creatureColor.defaultR;
    creatureColor.targetG = creatureColor.defaultG;
    creatureColor.targetB = creatureColor.defaultB;
    interactionIntensity = lerp(interactionIntensity, 0, 0.05);
  }

  // Draw alien creature
  push();
  // Draw body glow effect
  for (let i = 0; i < 4; i++) {
    noStroke();
    fill(creatureColor.r, creatureColor.g, creatureColor.b, 5);  // Dynamic glow
    beginShape();
    for (let particle of particles) {
      let offset = (4 - i) * 10;
      vertex(
        particle.x - width/2 + random(-offset, offset), 
        particle.y - height/2 + random(-offset, offset)
      );
    }
    endShape(CLOSE);
  }

  // Main body with gradient
  noStroke();
  for (let i = 0; i < 3; i++) {
    let alpha = map(i, 0, 3, 150, 50);
    fill(creatureColor.r, creatureColor.g, creatureColor.b, alpha);  // Dynamic body color
    beginShape();
    for (let particle of particles) {
      vertex(particle.x - width/2, particle.y - height/2);
    }
    endShape(CLOSE);
  }

  // Draw tentacle glow with dynamic color
  noFill();
  for (let i = numPoints; i < particles.length; i++) {
    let p = particles[i];
    stroke(creatureColor.r, creatureColor.g, creatureColor.b, 30);  // Dynamic tentacles
    strokeWeight(8);
    point(p.x - width/2, p.y - height/2);
    stroke(creatureColor.r, creatureColor.g, creatureColor.b, 100);
    strokeWeight(3);
    point(p.x - width/2, p.y - height/2);
  }

  // Draw eyes with more alien effect
  eyes.forEach((eye, index) => {
    let pulseSize = sin(frameCount * 0.05 + index * 0.5) * 8;
    let x = eye.x - width/2;
    let y = eye.y - height/2;
    
    // Large outer glow - turquoise
    noStroke();
    for (let i = 0; i < 4; i++) {
      let glowSize = 100 + pulseSize - i * 15;
      let alpha = map(i, 0, 4, 15, 5);
      fill(0, 255, 220, alpha);  // Bright turquoise glow
      circle(x, y, glowSize);
    }
    
    // Eye glow - brighter turquoise
    fill(0, 255, 240, 60);
    circle(x, y, 70 + pulseSize);
    
    // Inner eye - light turquoise
    fill(150, 255, 240, 200);
    circle(x, y, 50 + pulseSize * 0.5);
    
    // Alien pupil - darker turquoise
    fill(0, 150, 150);
    noStroke();
    let pupilHeight = 40 + pulseSize * 0.2;
    let pupilWidth = 8 + sin(frameCount * 0.1) * 3;
    ellipse(x, y, pupilWidth, pupilHeight);

    // Add bright highlight
    fill(255, 255, 255, 150);
    circle(x - 10, y - 10, 15);
  });

  pop();

  // Only show debug info if springs are visible
  if (showSprings) {
    stroke(255, 0, 200, 30);  // Fuchsia springs
    strokeWeight(1);
    for (let spring of springs) {
      let x1 = spring.a.x - width/2;
      let y1 = spring.a.y - height/2;
      let x2 = spring.b.x - width/2;
      let y2 = spring.b.y - height/2;
      line(x1, y1, x2, y2);
    }
  }
  pop();

  // Debug: status and hint
  fill(255);
  noStroke();
  textSize(14);
  let mpStatus = window.mediaPipe;
  let status = mpStatus ? (mpStatus.error ? "MediaPipe: error" : mpStatus.ready ? "MediaPipe: ready" : "MediaPipe: loading...") : "MediaPipe: not loaded";
  let handCount = mpStatus && mpStatus.landmarks ? mpStatus.landmarks.length : 0;
  text(status, 10, 20);
  text("Hands: " + handCount, 10, 38);
  text("FPS: " + floor(frameRate()), 10, 56);
  if (mpStatus && mpStatus.ready && handCount === 0) {
    textSize(12);
    fill(200, 255, 200);
    text("Show your hand to the camera", 10, 78);
  }

  // Calculate creature movement and stretching
  let totalStretch = 0;
  let totalSpeed = 0;
  
  // Calculate stretching between connected particles
  for (let spring of springs) {
    let currentLength = dist(spring.a.x, spring.a.y, spring.b.x, spring.b.y);
    let stretchAmount = abs(currentLength - spring.restLength);
    totalStretch += stretchAmount;
    
    // Calculate speed of particles
    let speedA = dist(spring.a.x, spring.a.y, spring.a.lastX || spring.a.x, spring.a.lastY || spring.a.y);
    let speedB = dist(spring.b.x, spring.b.y, spring.b.lastX || spring.b.x, spring.b.lastY || spring.b.y);
    totalSpeed += (speedA + speedB) * 0.5;
    
    // Store last positions
    spring.a.lastX = spring.a.x;
    spring.a.lastY = spring.a.y;
    spring.b.lastX = spring.b.x;
    spring.b.lastY = spring.b.y;
  }
  
  // Update movement sound based on stretch and speed
  if (totalStretch > stretchThreshold || totalSpeed > 5) {
    updateMovementSound(totalStretch, totalSpeed);
    movementStarted = true;
  } else if (movementStarted) {
    // Fade out with alien characteristic
    let fadeTime = random(0.3, 0.8);
    movementOsc.amp(0, fadeTime);
    filterOsc.amp(0, fadeTime);
    modulatorOsc.amp(0, fadeTime);
    filter.freq(random(200, 1000), fadeTime);
    movementStarted = false;
  }

  // Update and draw beams
  beams = beams.filter(beam => beam.update());
  beams.forEach(beam => beam.draw());

  updateEnergyLevel();
  
  // Modify random pop probability based on energy
  if (soundStarted && random() < 0.02 * (1 + energyLevel * 2)) {
    createRandomPop();
  }
}

// Helper function to draw glowing lines
function drawGlowingLine(x1, y1, x2, y2) {
  // Outer glow
  stroke(0, 255, 200, 50);
  strokeWeight(8);
  line(x1, y1, x2, y2);
  // Inner line
  stroke(0, 255, 200, 200);
  strokeWeight(2);
  line(x1, y1, x2, y2);
}

// Helper function to draw gradient body
function drawGradientBody() {
  // Main body shape
  noStroke();
  for (let i = 0; i < 10; i++) {
    let alpha = map(i, 0, 10, 200, 50);
    fill(100, 200, 255, alpha);
    beginShape();
    for (let particle of particles) {
      vertex(particle.x, particle.y);
    }
    endShape(CLOSE);
  }
}

// Helper function to draw glowing eyes
function drawGlowingEyes() {
  noStroke();
  for (let i = 0; i < 5; i++) {
    // Outer glow
    fill(0, 255, 200, 50);
    circle(eyes[i].x, eyes[i].y, 30);
    // Middle glow
    fill(0, 255, 200, 100);
    circle(eyes[i].x, eyes[i].y, 20);
    // Inner eye
    fill(255);
    circle(eyes[i].x, eyes[i].y, 12);
    // Pupil
    fill(0);
    circle(eyes[i].x, eyes[i].y, 6);
  }
}

// Function to initialize webcam capture
function captureWebcam() {
  capture = createCapture(
    {
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    },
    function (e) {
      captureEvent = e;
      capture.srcObject = e;
      var v = capture.elt;
      if (v) {
        v.setAttribute("playsinline", "true");
        v.setAttribute("muted", "true");
        v.play().catch(function() {});
      }
      // Start prediction loop when stream is ready (same as instrumentalproximities)
      if (window.mediaPipe && window.mediaPipe.predictWebcam && !mediaPipePredictionStarted) {
        mediaPipePredictionStarted = true;
        window.mediaPipe.predictWebcam(capture);
      }
    }
  );
  capture.elt.setAttribute("playsinline", "");
  capture.hide(); // Hide the default video element
}

// Function to handle window resizing
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Add this function after setup()
function initAudio() {
  // Create audio context
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  try {
    // Create and configure oscillator
    droneOsc = new p5.Oscillator();
    droneOsc.setType('sine');
    droneOsc.freq(60); // Low drone
    droneOsc.amp(0);
    
    // Start audio context and oscillator
    audioContext.resume().then(() => {
      droneOsc.start();
      droneOsc.amp(0.2, 1); // Fade in over 1 second
      
      // Add modulation
      setInterval(() => {
        if (soundStarted) {
          let modFreq = 60 + sin(frameCount * 0.01) * 5;
          droneOsc.freq(modFreq, 0.1);
        }
      }, 50);
    });
  } catch (e) {
    console.log('Audio error:', e);
  }
}

// Modify the startDrone function
function startDrone() {
  if (!audioContext) return;
  
  try {
    // Main drone oscillators
    droneOsc = new p5.Oscillator('sine');
    subOsc = new p5.Oscillator('triangle');
    rhythmOsc = new p5.Oscillator('square');
    
    // Effects
    let droneFilter = new p5.BandPass();
    let droneDelay = new p5.Delay();
    
    // Setup signal chain
    droneOsc.disconnect();
    subOsc.disconnect();
    rhythmOsc.disconnect();
    
    droneOsc.connect(droneFilter);
    subOsc.connect(droneFilter);
    droneDelay.process(droneFilter, 0.3, 0.7, 2300);
    
    // Initialize oscillators
    droneOsc.freq(60);
    subOsc.freq(30);
    rhythmOsc.freq(120);
    
    droneOsc.amp(0);
    subOsc.amp(0);
    rhythmOsc.amp(0);
    
    // Start all oscillators
    droneOsc.start();
    subOsc.start();
    rhythmOsc.start();
    
    // Fade in main drone
    droneOsc.amp(0.15, 1);
    subOsc.amp(0.1, 1);
    
    // Start beat pattern
    beatInterval = setInterval(updateBeat, 125); // 120 BPM
    
    // Add complex modulation
    setInterval(() => {
      if (soundStarted) {
        // Base drone modulation
        let baseDrone = 60 + sin(frameCount * 0.01) * 5;
        droneOsc.freq(baseDrone, 0.1);
        subOsc.freq(baseDrone * 0.5, 0.1);
        
        // Adjust complexity based on interaction
        if (interactionIntensity > 0.3) {
          // More complex modulation when interactive
          let complexity = map(interactionIntensity, 0.3, 1, 1, 3);
          baseDrone += sin(frameCount * 0.023) * (10 * complexity);
          baseDrone += cos(frameCount * 0.037) * (5 * complexity);
          
          // Filter sweeps
          let filterFreq = map(sin(frameCount * 0.015), -1, 1, 200, 2000);
          droneFilter.freq(filterFreq);
          droneFilter.res(map(interactionIntensity, 0, 1, 2, 8));
        } else {
          // Simpler modulation when quiet
          droneFilter.freq(500);
          droneFilter.res(2);
        }
      }
    }, 50);
    
  } catch (e) {
    console.log('Drone setup error:', e);
  }
}

// Add this function to handle beat patterns
function updateBeat() {
  if (!soundStarted || !rhythmOsc) return;
  
  let now = millis();
  let beatTime = 100; // Beat duration in ms
  
  // Change beat pattern based on interaction
  if (interactionIntensity > 0.3) {
    beatPattern = (beatPattern + 1) % 16;
    
    // Complex beat patterns when interactive
    let amp = map(interactionIntensity, 0.3, 1, 0.1, 0.3);
    
    // Different patterns based on interaction level
    if (interactionIntensity > 0.7) {
      // Fast complex pattern
      if (beatPattern % 4 === 0 || beatPattern % 3 === 0) {
        rhythmOsc.freq(200, 0.05);
        rhythmOsc.amp(amp, 0.05);
        setTimeout(() => rhythmOsc.amp(0, 0.1), beatTime);
      }
    } else if (interactionIntensity > 0.5) {
      // Medium complexity
      if (beatPattern % 4 === 0) {
        rhythmOsc.freq(150, 0.05);
        rhythmOsc.amp(amp * 0.8, 0.05);
        setTimeout(() => rhythmOsc.amp(0, 0.1), beatTime);
      }
    } else {
      // Simple pattern
      if (beatPattern % 8 === 0) {
        rhythmOsc.freq(100, 0.05);
        rhythmOsc.amp(amp * 0.6, 0.05);
        setTimeout(() => rhythmOsc.amp(0, 0.1), beatTime);
      }
    }
  } else {
    // No beats when quiet
    rhythmOsc.amp(0, 0.1);
  }
}

// Modify the stopDrone function
function stopDrone() {
  if (droneOsc) {
    droneOsc.amp(0, 1);
    subOsc.amp(0, 1);
    rhythmOsc.amp(0, 1);
    clearInterval(beatInterval);
    setTimeout(() => {
      droneOsc.stop();
      subOsc.stop();
      rhythmOsc.stop();
    }, 1000);
  }
}

// Update the setupMovementSound function
function setupMovementSound() {
  if (!audioContext) return;
  
  try {
    // Create oscillators for alien voice
    movementOsc = new p5.Oscillator('sawtooth');
    filterOsc = new p5.Oscillator('sine');
    modulatorOsc = new p5.Oscillator('sine');
    
    // Create filter and delay for alien effect
    filter = new p5.BandPass();
    delay = new p5.Delay();
    
    // Setup effects chain
    movementOsc.disconnect();
    movementOsc.connect(filter);
    delay.process(filter, 0.12, 0.7, 2300);
    
    // Start with zero amplitude
    movementOsc.amp(0);
    filterOsc.amp(0);
    modulatorOsc.amp(0);
    
    // Start oscillators
    movementOsc.start();
    filterOsc.start();
    modulatorOsc.start();
    
    // Set filter parameters
    filter.freq(1000);
    filter.res(5);
  } catch (e) {
    console.log('Audio setup error:', e);
  }
}

// Update the updateMovementSound function
function updateMovementSound(stretchAmount, speed) {
  if (!movementOsc || !filter) return;
  
  // Randomly change sound type
  if (millis() - lastSoundChange > soundChangeInterval) {
    soundType = floor(random(4)); // 4 different sound types
    lastSoundChange = millis();
  }
  
  // Base frequency calculations
  let baseFreq = map(stretchAmount, 0, 200, 200, 800);
  baseFreq = constrain(baseFreq, 200, 800);
  
  // Modify frequencies based on energy
  baseFreq *= (1 + energyLevel * 0.5);
  
  // Different sound types
  switch(soundType) {
    case 0: // Chirping sounds - faster when energetic
      baseFreq = baseFreq * (1 + sin(frameCount * (0.5 + energyLevel)) * 0.5);
      filter.res(12 + energyLevel * 8);
      modulatorOsc.freq(random(10, 20 + energyLevel * 30));
      break;
      
    case 1: // Purring/rumbling - more intense with energy
      baseFreq = baseFreq * 0.5 + sin(frameCount * (0.1 + energyLevel * 0.3)) * (20 + energyLevel * 30);
      filter.res(4 + energyLevel * 6);
      modulatorOsc.freq(random(2, 4 + energyLevel * 8));
      break;
      
    case 2: // Whistling/singing - more varied with energy
      baseFreq = baseFreq * (1 + sin(frameCount * (0.2 + energyLevel * 0.4)) * 0.3);
      baseFreq += sin(frameCount * (0.05 + energyLevel * 0.1)) * (100 + energyLevel * 150);
      filter.res(15 + energyLevel * 10);
      modulatorOsc.freq(random(5, 8 + energyLevel * 12));
      break;
      
    case 3: // Clicking/popping - more frequent with energy
      baseFreq = baseFreq * (random() > (0.8 - energyLevel * 0.3) ? 2 : 1);
      filter.res(20 + energyLevel * 15);
      modulatorOsc.freq(random(15, 25 + energyLevel * 35));
      break;
  }
  
  // Create filter sweeps based on sound type
  let filterFreq = map(speed, 0, 50, 500, 3000);
  filterFreq *= (1 + sin(frameCount * 0.05) * 0.5);
  filter.freq(filterFreq);
  
  // Amplitude handling
  let amp = map(speed, 0, 50, 0.05, 0.4);
  amp = constrain(amp, 0, 0.4);
  amp *= map(interactionIntensity, 0, 1, 0.05, 1.0);
  
  // Add character based on sound type
  if (interactionIntensity < 0.3) {
    let breathRate = 0.2;
    switch(soundType) {
      case 0: // Quick chirps when quiet
        amp *= (0.5 + sin(frameCount * 1.0) * 0.5);
        break;
      case 1: // Slow purring when quiet
        amp *= (0.7 + sin(frameCount * 0.1) * 0.3);
        break;
      case 2: // Gentle whistling
        amp *= (0.6 + sin(frameCount * 0.3) * 0.4);
        break;
      case 3: // Occasional clicks
        amp *= (random() > 0.95 ? 1 : 0.2);
        break;
    }
  } else {
    // More dramatic modulation when interactive
    amp *= (1 + sin(frameCount * 0.2) * 0.3);
  }
  
  // Increase amplitude with energy
  amp *= (1 + energyLevel * 0.5);
  
  // Update oscillators with variations
  movementOsc.freq(baseFreq + random(-20, 20), 0.1);
  filterOsc.freq(baseFreq * 1.5 + sin(frameCount * 0.1) * 30, 0.1);
  
  // Set amplitudes with character
  let ampVariation = random(0.8, 1.0);
  movementOsc.amp(amp * ampVariation, 0.1);
  filterOsc.amp(amp * 0.3 * ampVariation, 0.1);
  modulatorOsc.amp(amp * 0.2 * ampVariation, 0.1);
}

// Update the Beam class
class Beam {
  constructor(x, y) {
    // Use provided coordinates or default to random center position
    this.x = x || width/2 + random(-30, 30);
    this.y = y || height/2 + random(-30, 30);
    
    // Smaller, more compact rings
    this.radius = random(10, 25 + energyLevel * 15);
    this.alpha = 255;
    this.maxRadius = random(100, 200 + energyLevel * 100);
    this.growthSpeed = random(5, 12 + energyLevel * 8);
    
    // More consistent colors
    this.color = {
      r: random([0, 255]), // Either turquoise or fuchsia
      g: random([0, 255]),
      b: 240
    };
    
    // Fewer, tighter rings
    this.numRings = floor(random(2, 4 + energyLevel * 2));
    this.ringOffsets = Array(this.numRings).fill().map(() => ({
      radiusOffset: random(-15, 15),  // Smaller size variation
      speed: random(0.95, 1.05),     // More consistent speed
      phase: random(TWO_PI),
      thickness: random(3, 6)        // Thicker lines
    }));
  }
  
  update() {
    this.radius += this.growthSpeed;
    // Faster fade out
    this.alpha = map(this.radius, 0, this.maxRadius, 255, 0, true);
    // Reduced oscillation
    this.x += sin(frameCount * 0.1) * 0.5;
    this.y += cos(frameCount * 0.1) * 0.5;
    return this.alpha > 0;
  }
  
  draw() {
    push();
    noFill();
    blendMode(ADD);
    
    // Draw rings
    for (let ring of this.ringOffsets) {
      let ringRadius = this.radius + ring.radiusOffset;
      let oscillation = sin(frameCount * 0.1 + ring.phase) * 5; // Reduced oscillation
      ringRadius *= ring.speed;
      
      // Fewer layers, more compact
      for (let i = 0; i < 3; i++) {
        let a = map(i, 0, 3, this.alpha, 0);
        strokeWeight(ring.thickness - i * 0.2);
        stroke(this.color.r, this.color.g, this.color.b, a);
        circle(this.x, this.y, ringRadius + oscillation + i * 10);
      }
      
      // Fewer, brighter sparkles
      if (random() < 0.2) {
        stroke(255, this.alpha);
        strokeWeight(2);
        let sparkleAngle = random(TWO_PI);
        let sparkleRadius = random(ringRadius * 0.9, ringRadius * 1.1);
        let sx = this.x + cos(sparkleAngle) * sparkleRadius;
        let sy = this.y + sin(sparkleAngle) * sparkleRadius;
        point(sx, sy);
      }
    }
    blendMode(NORMAL);
    pop();
  }
}

// Modify the makePinchSound function for a lower pop
function makePinchSound() {
  if (!audioContext || millis() - lastPinchTime < pinchDelay) return;
  
  try {
    let popOsc = new p5.Oscillator('sine');
    let popFilter = new p5.BandPass();
    
    popOsc.disconnect();
    popOsc.connect(popFilter);
    
    // Lower-pitched pop sound
    popOsc.freq(150);  // Much lower frequency
    popFilter.freq(150);
    popFilter.res(8);  // Higher resonance for more "bubble" sound
    
    popOsc.start();
    popOsc.amp(0.4, 0.01); // Slightly louder attack
    
    // Quick decay with frequency drop
    setTimeout(() => {
      popOsc.freq(80, 0.1);  // Drop to even lower frequency
      popOsc.amp(0, 0.2);    // Longer decay
    }, 30);
    
    // Stop and cleanup
    setTimeout(() => {
      popOsc.stop();
    }, 300);
    
    lastPinchTime = millis();
  } catch (e) {
    console.log('Pop sound error:', e);
  }
}

// Add this function for random pops
function createRandomPop() {
  if (millis() - lastPopTime < popInterval) return;
  
  // Find a random particle to pop from
  let particle = random(particles);
  let popX = particle.x;
  let popY = particle.y;
  
  // Create 1-3 beams at the particle position
  let numBeams = floor(random(1, 4));
  for (let i = 0; i < numBeams; i++) {
    let offsetX = random(-15, 15);
    let offsetY = random(-15, 15);
    beams.push(new Beam(popX + offsetX, popY + offsetY));
  }
  
  makePinchSound();
  lastPopTime = millis();
}

// Add this function to smoothly change colors
function updateCreatureColor() {
  creatureColor.r = lerp(creatureColor.r, creatureColor.targetR, colorChangeSpeed);
  creatureColor.g = lerp(creatureColor.g, creatureColor.targetG, colorChangeSpeed);
  creatureColor.b = lerp(creatureColor.b, creatureColor.targetB, colorChangeSpeed);
}

// Add this function to manage energy levels
function updateEnergyLevel() {
  // Decay energy over time
  energyLevel = max(0, energyLevel - energyDecayRate);
  
  // Boost energy with interaction
  if (millis() - lastEnergyBoost > energyBoostDelay) {
    if (interactionIntensity > 0.3) {
      energyLevel = min(maxEnergy, energyLevel + interactionIntensity * 0.1);
      lastEnergyBoost = millis();
    }
  }
}
