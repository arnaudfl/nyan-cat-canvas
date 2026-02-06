import { createScene } from "./scene.js";

const canvas = document.getElementById("canvas");
const btnToggle = document.getElementById("btnToggle");
const btnScreenshot = document.getElementById("btnScreenshot");

const speedEl = document.getElementById("speed");
const starsEl = document.getElementById("stars");
const scaleEl = document.getElementById("scale");
const rainbowModeEl = document.getElementById("rainbowMode");
const directionEl = document.getElementById("direction");
const qualityEl = document.getElementById("quality");

const scene = await createScene(canvas, {
  spriteUrl: "./assets/nyan_sheet.png",
  rainbowUrl: "./assets/rainbow_tile.png",
});

function syncHud() {
  btnToggle.textContent = scene.isRunning() ? "Pause" : "Play";
}
syncHud();

btnToggle.addEventListener("click", () => { scene.toggle(); syncHud(); });
btnScreenshot.addEventListener("click", () => scene.screenshot());

speedEl.addEventListener("input", (e) => scene.setSpeed(Number(e.target.value)));
starsEl.addEventListener("input", (e) => scene.setStarCount(Number(e.target.value)));
scaleEl.addEventListener("input", (e) => scene.setSpriteScale(Number(e.target.value)));
rainbowModeEl.addEventListener("change", (e) => scene.setRainbowMode(e.target.value));
directionEl.addEventListener("change", (e) => scene.setDirection(e.target.value));
qualityEl.addEventListener("change", (e) => scene.setQuality(Number(e.target.value)));

addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); scene.toggle(); syncHud(); }
  if (e.key.toLowerCase() === "s") { scene.screenshot(); }
});

// Init
scene.setSpeed(Number(speedEl.value));
scene.setStarCount(Number(starsEl.value));
scene.setSpriteScale(Number(scaleEl.value));
scene.setRainbowMode(rainbowModeEl.value);
scene.setDirection(directionEl.value);
scene.setQuality(Number(qualityEl.value));
scene.start();
