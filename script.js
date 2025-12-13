const getNextNewYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() === 0 && now.getDate() === 1
    ? new Date(year + 1, 0, 1, 0, 0, 0)
    : new Date(year, 11, 31, 23, 59, 59);
};

const isGermanLocale = () => navigator.language.startsWith("de");

const targetDate = getNextNewYear().getTime();
let countdownExpired = false;

const countdown = () => {
  const now = new Date().getTime();
  const distance = targetDate - now;

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  updateCountdownDisplay(days, hours, minutes, seconds);

  if (distance < 0) {
    clearInterval(interval);
    if (!countdownExpired) {
      triggerCelebration();
      countdownExpired = true;
    }
  }
};

const updateCountdownDisplay = (days, hours, minutes, seconds) => {
  document.getElementById("days-segment").style.display =
    days > 0 ? "inline-block" : "none";
  document.getElementById("days").textContent = days
    .toString()
    .padStart(2, "0");

  document.getElementById("hours-segment").style.display =
    hours > 0 || days > 0 ? "inline-block" : "none";
  document.getElementById("hours").textContent = hours
    .toString()
    .padStart(2, "0");

  document.getElementById("minutes-segment").style.display =
    minutes > 0 || hours > 0 || days > 0 ? "inline-block" : "none";
  document.getElementById("minutes").textContent = minutes
    .toString()
    .padStart(2, "0");

  document.getElementById("seconds").textContent = seconds
    .toString()
    .padStart(2, "0");
};

const triggerCelebration = () => {
  document.getElementById("countdown-container").style.display = "none";
  document.getElementById("celebrate-text").style.display = "block";
  createFireworks();
  createConfetti();
};

const createFireworks = () => {
  const fireworks = document.getElementById("fireworks");
  for (let i = 0; i < 100; i++) {
    const firework = document.createElement("div");
    firework.classList.add("firework");
    firework.style.setProperty("--tx", Math.random() * 2 - 1);
    firework.style.setProperty("--ty", Math.random() * 2 - 1);
    firework.style.left = Math.random() * window.innerWidth + "px";
    firework.style.top = Math.random() * window.innerHeight + "px";
    fireworks.appendChild(firework);
  }
};

const createConfetti = () => {
  const confettiContainer = document.getElementById("confetti-container");
  for (let i = 0; i < 200; i++) {
    const confetti = document.createElement("div");
    confetti.classList.add("confetti");
    confetti.style.backgroundColor = getRandomColor();
    confetti.style.left = Math.random() * window.innerWidth + "px";
    confetti.style.animationDuration = Math.random() * 3 + 3 + "s";
    confettiContainer.appendChild(confetti);
  }
};

const getRandomColor = () => {
  const colors = [
    "#FF5733",
    "#FFC300",
    "#DAF7A6",
    "#581845",
    "#C70039",
    "#900C3F",
    "#FF5733",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

if (isGermanLocale()) {
  document.getElementById("countdown-title").textContent =
    "Silvester Countdown";
  document.getElementById("days-label").textContent = "Tage";
  document.getElementById("hours-label").textContent = "Stunden";
  document.getElementById("minutes-label").textContent = "Minuten";
  document.getElementById("seconds-label").textContent = "Sekunden";
}

const interval = setInterval(countdown, 1000);
countdown();
