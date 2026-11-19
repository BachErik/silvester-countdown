/**
 * Return the next Jan 1st 00:00:00 in the user's local timezone.
 * (So in Germany, this naturally matches local midnight.)
 */
function getNextNewYearDate() {
  const now = new Date();
  return new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
}

/**
 * Tiny locale check. If the browser language starts with "de",
 * we switch the UI strings to German.
 */
function isGermanLocale() {
  return (navigator.language || "").toLowerCase().startsWith("de");
}

// Cache DOM nodes (faster + cleaner than repeated getElementById calls)
const el = {
  container: document.getElementById("countdown-container"),
  title: document.getElementById("countdown-title"),
  celebrate: document.getElementById("celebrate-text"),

  daysSegment: document.getElementById("days-segment"),
  hoursSegment: document.getElementById("hours-segment"),
  minutesSegment: document.getElementById("minutes-segment"),

  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),

  daysLabel: document.getElementById("days-label"),
  hoursLabel: document.getElementById("hours-label"),
  minutesLabel: document.getElementById("minutes-label"),
  secondsLabel: document.getElementById("seconds-label"),

  fireworks: document.getElementById("fireworks"),
  confetti: document.getElementById("confetti-container"),
};

// Handwritten snake digits (see snake.js); falls back to plain text if unavailable.
const numbers = {
  days: window.attachSnakeNumber(el.days),
  hours: window.attachSnakeNumber(el.hours),
  minutes: window.attachSnakeNumber(el.minutes),
  seconds: window.attachSnakeNumber(el.seconds),
};

// Target moment (timestamp in ms)
const targetTimeMs = getNextNewYearDate().getTime();

// Prevent double-triggering the celebration
let hasCelebrated = false;

// Confetti palette (kept small and punchy)
const CONFETTI_COLORS = [
  "#FF5733",
  "#FFC300",
  "#DAF7A6",
  "#581845",
  "#C70039",
  "#900C3F",
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Update the UI and hide segments when they are not needed
 * (e.g. no days shown if days == 0).
 */
function updateCountdownDisplay(days, hours, minutes, seconds) {
  el.daysSegment.style.display = days > 0 ? "inline-block" : "none";
  el.hoursSegment.style.display =
    hours > 0 || days > 0 ? "inline-block" : "none";
  el.minutesSegment.style.display =
    minutes > 0 || hours > 0 || days > 0 ? "inline-block" : "none";

  numbers.days.set(pad2(days));
  numbers.hours.set(pad2(hours));
  numbers.minutes.set(pad2(minutes));
  numbers.seconds.set(pad2(seconds));
}

/**
 * Start the celebration visuals.
 * We also clear old particles to avoid duplicating DOM nodes if this is ever re-run.
 */
function triggerCelebration() {
  el.container.style.display = "none";
  el.celebrate.style.display = "block";

  // Clear existing particles (safety)
  el.fireworks.textContent = "";
  el.confetti.textContent = "";

  createFireworks(120);
  createConfetti(220);
}

/**
 * Create "firework" particles at random screen positions.
 * Each particle uses a little box-shadow sparkle and random direction variables.
 */
function createFireworks(count) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "firework";

    // Random outward direction (-1..1)
    p.style.setProperty("--tx", (Math.random() * 2 - 1).toFixed(3));
    p.style.setProperty("--ty", (Math.random() * 2 - 1).toFixed(3));

    // Random position on screen
    p.style.left = Math.random() * w + "px";
    p.style.top = Math.random() * h + "px";

    // Sparkle effect: multiple tiny points from a single element
    const color =
      CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    p.style.boxShadow = `
    0 0 0 2px ${color},
    8px 6px 0 1px ${color},
    -6px 10px 0 1px ${color},
    12px -8px 0 1px ${color},
    -10px -6px 0 1px ${color}
  `;

    // Slight random timing offset so they don't sync perfectly
    p.style.animationDelay = Math.random() * 1.2 + "s";

    el.fireworks.appendChild(p);
  }
}

/**
 * Create falling confetti pieces.
 */
function createConfetti(count) {
  const w = window.innerWidth;

  for (let i = 0; i < count; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.backgroundColor =
      CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    c.style.left = Math.random() * w + "px";

    // Randomize duration and drift a bit with animation-delay
    c.style.animationDuration = Math.random() * 3 + 3 + "s";
    c.style.animationDelay = Math.random() * 2 + "s";

    // Random size variance (small but noticeable)
    const size = Math.floor(Math.random() * 8) + 6; // 6..13
    c.style.width = size + "px";
    c.style.height = size + "px";

    el.confetti.appendChild(c);
  }
}

/**
 * Main countdown logic.
 * Uses a "second-aligned" ticker so the display updates close to actual second boundaries.
 */
function countdownTick() {
  const nowMs = Date.now();
  const diffMs = targetTimeMs - nowMs;

  // Reached (or passed) the target time
  if (diffMs <= 0) {
    updateCountdownDisplay(0, 0, 0, 0);

    if (!hasCelebrated) {
      triggerCelebration();
      hasCelebrated = true;
    }
    return;
  }

  // Convert remaining milliseconds to whole seconds (ceil avoids showing -1 at boundaries)
  const totalSeconds = Math.ceil(diffMs / 1000);

  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  updateCountdownDisplay(days, hours, minutes, seconds);
}

/**
 * Runs countdownTick aligned to the next exact second boundary.
 * This avoids "drifty" intervals over time.
 */
function startSecondAlignedTicker() {
  function tickLoop() {
    countdownTick();
    if (hasCelebrated) return;

    const delay = 1000 - (Date.now() % 1000);
    setTimeout(tickLoop, delay);
  }
  tickLoop();
}

// Localize UI text (German vs English)
if (isGermanLocale()) {
  el.title.textContent = "Silvester Countdown";
  el.daysLabel.textContent = "Tage";
  el.hoursLabel.textContent = "Stunden";
  el.minutesLabel.textContent = "Minuten";
  el.secondsLabel.textContent = "Sekunden";
  el.celebrate.textContent = "🎉 Frohes neues Jahr! 🎉";
  document.title = "Silvester Countdown";
}

// Initial render + start ticking
countdownTick();
startSecondAlignedTicker();

// Optional: if someone resizes the window *after* celebration started,
// you can re-seed the effects to fit the new size.
window.addEventListener("resize", () => {
  if (!hasCelebrated) return;
  el.fireworks.textContent = "";
  el.confetti.textContent = "";
  createFireworks(120);
  createConfetti(220);
});
