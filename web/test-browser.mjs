import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  headless: false,
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  defaultViewport: { width: 1400, height: 900 },
  args: ["--start-maximized"],
});

const page = await browser.newPage();
await page.goto("http://localhost:5173", { waitUntil: "networkidle2" });

console.log("Browser open at http://localhost:5173 — close the window when done.");

// Keep alive until browser closes
browser.on("disconnected", () => process.exit(0));
