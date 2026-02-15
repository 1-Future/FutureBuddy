import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Puppeteer-based pixel-perfect logo export endpoint.
// POST /__export-logo — returns JSON with 4 variants:
//   full, icon (no text), iconCurved (curved text), iconScaled (scaled text)
function logoExportPlugin(): Plugin {
  let puppeteerBrowser: any = null;

  async function applySettings(page: any, settings: any) {
    await page.evaluate((p: any) => {
      const $ = (id: string) => document.getElementById(id);
      function setVal(id: string, val: any) {
        const el = $(id) as any; if (!el) return;
        if (el.type === "checkbox") el.checked = !!val;
        else el.value = val;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const map: Record<string, string> = {
        font: "fontSel", sFont: "sFontSel", textFont: "textFontSel",
        bgColor: "cBG", textColor: "cText", letterSpacing: "letterSp",
        perspective: "scenePerspective",
      };
      Object.entries(p).forEach(([k, v]: [string, any]) => {
        if (k === "pColors" || k === "sColors") return;
        setVal(map[k] || k, v);
      });
      ["p", "s"].forEach((prefix) => {
        ((p as any)[prefix + "Colors"] || []).forEach((c: string, i: number) => {
          const el = document.querySelector(
            `#${prefix}SegColors input[type="color"]:nth-of-type(${i + 1})`
          ) as any;
          if (el) { el.value = c; el.dispatchEvent(new Event("input", { bubbles: true })); }
        });
      });
      if (p.pDir !== undefined) setVal("pDir", p.pDir);
      if (p.sDir !== undefined) setVal("sDir", p.sDir);
      if (p.pCustomAngle !== undefined) setVal("pCustomAngle", p.pCustomAngle);
      if (p.sCustomAngle !== undefined) setVal("sCustomAngle", p.sCustomAngle);
      if (typeof (window as any).render === "function") (window as any).render();
    }, settings);
  }

  async function screenshotFrame(page: any, transparent: boolean) {
    await page.evaluate(() => {
      const dbg = document.getElementById("debugOverlay");
      if (dbg) dbg.style.display = "none";
    });
    const fw = await page.$("#frameWrap");
    if (!fw) throw new Error("frameWrap not found");
    const clip = await fw.boundingBox();
    return page.screenshot({
      clip: { x: clip!.x, y: clip!.y, width: clip!.width, height: clip!.height },
      omitBackground: transparent,
      encoding: "base64",
    });
  }

  // Set circle frame and reset position, keep text or not
  async function setupCircle(page: any, clearText: boolean) {
    await page.evaluate((clr: boolean) => {
      const $ = (id: string) => document.getElementById(id) as any;
      if (clr) { $("line1").value = ""; $("line2").value = ""; }
      $("frameShape").value = "circle";
      $("logoMoveX").value = "0";
      $("logoMoveY").value = "0";
      $("logoScale").value = "100";
      ["line1", "line2", "frameShape", "logoMoveX", "logoMoveY", "logoScale"]
        .forEach((id) => $(id).dispatchEvent(new Event("input", { bubbles: true })));
      if (typeof (window as any).render === "function") (window as any).render();
    }, clearText);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Fit content inside circle using bounding-box measurement with generous
  // padding to account for 3D perspective transforms overshooting layout bounds.
  async function fitInCircle(page: any, selector: string, _reserve: number) {
    const best = await page.evaluate((sel: string) => {
      const fw = document.getElementById("frameWrap")!;
      const fwR = fw.getBoundingClientRect();
      const radius = fwR.width / 2;
      const cx = fwR.left + radius;
      const cy = fwR.top + radius;

      // Collect bounding rects of all matching elements
      const els = document.querySelectorAll(sel);
      let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
      els.forEach((el: any) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        top = Math.min(top, r.top);
        bottom = Math.max(bottom, r.bottom);
        left = Math.min(left, r.left);
        right = Math.max(right, r.right);
      });
      if (top === Infinity) return 100;

      // Find farthest corner from center
      const corners = [
        [left - cx, top - cy], [right - cx, top - cy],
        [left - cx, bottom - cy], [right - cx, bottom - cy],
      ];
      let maxDist = 0;
      for (const [dx, dy] of corners) {
        maxDist = Math.max(maxDist, Math.sqrt(dx * dx + dy * dy));
      }
      if (maxDist === 0) return 100;

      // 18% padding to account for 3D perspective transform overshoot
      const pad = radius * 0.18;
      return Math.round(((radius - pad) / maxDist) * 100);
    }, selector);

    await page.evaluate((s: number) => {
      const el = document.getElementById("logoScale") as any;
      el.value = String(s);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      if (typeof (window as any).render === "function") (window as any).render();
    }, best);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Replace flat text with SVG curved text along bottom arc inside the circle
  async function applyCurvedText(page: any) {
    await page.evaluate(() => {
      const $ = (id: string) => document.getElementById(id) as any;
      const fw = $("frameWrap");
      const fwR = fw.getBoundingClientRect();
      const size = fwR.width;
      const r = size / 2;

      // Gather text info
      const t1 = $("textLine1");
      const t2 = $("textLine2");
      const text1 = t1.textContent || "";
      const text2 = t2.textContent || "";
      if (!text1 && !text2) return;

      const color = t1.style.color || getComputedStyle(t1).color;
      const font1 = getComputedStyle(t1).fontFamily;
      let fontSize1 = parseFloat(getComputedStyle(t1).fontSize);
      const font2 = getComputedStyle(t2).fontFamily;
      let fontSize2 = parseFloat(getComputedStyle(t2).fontSize);
      const weight1 = getComputedStyle(t1).fontWeight;
      const weight2 = getComputedStyle(t2).fontWeight;
      const stroke = t1.style.webkitTextStroke || "";
      const shadow = getComputedStyle(t1).textShadow;

      // Hide original text
      const logoText = $("logoText");
      logoText.style.display = "none";

      // Create SVG overlay
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("width", String(size));
      svg.setAttribute("height", String(size));
      svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
      svg.style.position = "absolute";
      svg.style.top = "0";
      svg.style.left = "0";
      svg.style.zIndex = "10";
      svg.style.pointerEvents = "none";

      const defs = document.createElementNS(ns, "defs");

      // Build text filter for shadow if present
      let filterAttr = "";
      if (shadow && shadow !== "none") {
        const filter = document.createElementNS(ns, "filter");
        filter.setAttribute("id", "txtShadow");
        filter.setAttribute("x", "-50%"); filter.setAttribute("y", "-50%");
        filter.setAttribute("width", "200%"); filter.setAttribute("height", "200%");
        const m = shadow.match(/rgba?\([^)]+\)\s+([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px/);
        if (m) {
          const fe = document.createElementNS(ns, "feDropShadow");
          fe.setAttribute("dx", m[1]); fe.setAttribute("dy", m[2]);
          fe.setAttribute("stdDeviation", String(parseFloat(m[3]) / 2));
          fe.setAttribute("flood-color", m[0].match(/rgba?\([^)]+\)/)![0]);
          filter.appendChild(fe);
          defs.appendChild(filter);
          filterAttr = "url(#txtShadow)";
        }
      }

      // Scale font sizes so text fits along the bottom arc
      // Approximate: text length should be less than ~60% of circumference
      const maxArcLen = r * Math.PI * 0.55; // ~55% of half circumference
      const approxCharW1 = fontSize1 * 0.6;
      const textWidth1 = text1.length * approxCharW1;
      if (textWidth1 > maxArcLen && text1.length > 0) {
        const ratio = maxArcLen / textWidth1;
        fontSize1 = Math.round(fontSize1 * ratio);
      }
      const approxCharW2 = fontSize2 * 0.6;
      const textWidth2 = text2.length * approxCharW2;
      if (textWidth2 > maxArcLen && text2.length > 0) {
        const ratio = maxArcLen / textWidth2;
        fontSize2 = Math.round(fontSize2 * ratio);
      }

      // For bottom-of-circle text: use a full circle path and startOffset
      // to position text at the bottom. The trick: reverse the circle direction
      // so text at the bottom reads left-to-right (not upside down).
      // Reversed circle (counterclockwise): text baseline faces inward at bottom.
      const inset1 = fontSize1 * 0.6; // how far inside the circle edge
      const pathR1 = r - inset1;
      const arcPath1 = document.createElementNS(ns, "path");
      arcPath1.setAttribute("id", "arcLine1");
      // Full circle, counterclockwise (sweep=0), starting at top
      // Going CCW means at the bottom, text reads left-to-right
      arcPath1.setAttribute("d",
        `M ${r},${r - pathR1} A ${pathR1},${pathR1} 0 1,0 ${r},${r + pathR1} A ${pathR1},${pathR1} 0 1,0 ${r},${r - pathR1}`
      );
      defs.appendChild(arcPath1);

      // Second line: slightly smaller radius (further inside)
      const inset2 = fontSize1 * 0.3 + fontSize2 * 1.2;
      const pathR2 = r - inset2;
      const arcPath2 = document.createElementNS(ns, "path");
      arcPath2.setAttribute("id", "arcLine2");
      arcPath2.setAttribute("d",
        `M ${r},${r - pathR2} A ${pathR2},${pathR2} 0 1,0 ${r},${r + pathR2} A ${pathR2},${pathR2} 0 1,0 ${r},${r - pathR2}`
      );
      defs.appendChild(arcPath2);

      svg.appendChild(defs);

      function makeText(txt: string, pathId: string, fontFam: string, fSize: number, fWeight: string) {
        const textEl = document.createElementNS(ns, "text");
        textEl.setAttribute("fill", color);
        textEl.setAttribute("font-family", fontFam);
        textEl.setAttribute("font-size", String(fSize));
        textEl.setAttribute("font-weight", fWeight);
        textEl.setAttribute("text-anchor", "middle");
        textEl.setAttribute("dominant-baseline", "auto");
        if (filterAttr) textEl.setAttribute("filter", filterAttr);
        if (stroke) {
          const parts = stroke.match(/([\d.]+)px\s+(.*)/);
          if (parts) {
            textEl.setAttribute("stroke", parts[2]);
            textEl.setAttribute("stroke-width", parts[1]);
            textEl.setAttribute("paint-order", "stroke fill");
          }
        }
        const tp = document.createElementNS(ns, "textPath");
        tp.setAttribute("href", "#" + pathId);
        // 50% of a CCW circle = the bottom center
        tp.setAttribute("startOffset", "50%");
        tp.textContent = txt;
        textEl.appendChild(tp);
        return textEl;
      }

      if (text1) svg.appendChild(makeText(text1, "arcLine1", font1, fontSize1, weight1));
      if (text2) svg.appendChild(makeText(text2, "arcLine2", font2, fontSize2, weight2));

      fw.style.position = "relative";
      fw.appendChild(svg);
    });
    await new Promise((r) => setTimeout(r, 300));
  }

  return {
    name: "logo-export",
    configureServer(server) {
      server.middlewares.use("/__export-logo", async (req: any, res: any) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }
        if (req.method !== "POST") { res.writeHead(405); res.end("POST only"); return; }

        let body = "";
        req.on("data", (c: string) => (body += c));
        req.on("end", async () => {
          try {
            const { settings, scale = 2 } = JSON.parse(body);
            const port = server.config.server.port || 5173;
            const pageUrl = `http://localhost:${port}/tools/logo-maker.html`;

            const puppeteer = await import("puppeteer");
            if (!puppeteerBrowser) {
              puppeteerBrowser = await puppeteer.default.launch({
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
              });
            }

            const pChar = settings.pChar || "P";
            const sChar = settings.sChar || "S";
            const tag = `${pChar}${sChar}`;

            // Each variant gets a fresh page to avoid state leaking
            async function freshPage() {
              const page = await puppeteerBrowser.newPage();
              await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: scale });
              await page.goto(pageUrl, { waitUntil: "networkidle0", timeout: 20000 });
              await page.waitForFunction(() => document.fonts.ready.then(() => true), { timeout: 10000 });
              await new Promise((r) => setTimeout(r, 1500));
              await applySettings(page, settings);
              await new Promise((r) => setTimeout(r, 800));
              return page;
            }

            // --- 1. Full logo export (as-is) ---
            const page1 = await freshPage();
            const fullB64 = await screenshotFrame(page1, false);
            await page1.close();

            // --- 2. Icon: no text, logo scaled to fit circle ---
            const page2 = await freshPage();
            await setupCircle(page2, true);
            await fitInCircle(page2, "#logoAnchor", 0);
            const iconB64 = await screenshotFrame(page2, false);
            await page2.close();

            // --- 3. Icon: curved text along bottom arc ---
            const page3 = await freshPage();
            await setupCircle(page3, false);
            // Hide original text — we'll replace it with SVG curved text
            await page3.evaluate(() => {
              document.getElementById("logoText")!.style.display = "none";
              if (typeof (window as any).render === "function") (window as any).render();
            });
            await new Promise((r) => setTimeout(r, 200));
            // Fit logo in upper portion: scale down by 0.65x and shift up
            await page3.evaluate(() => {
              const fw = document.getElementById("frameWrap")!;
              const fwR = fw.getBoundingClientRect();
              const radius = fwR.width / 2;
              const cx = fwR.left + radius;
              const cy = fwR.top + radius;
              const anchor = document.getElementById("logoAnchor")!;
              const r = anchor.getBoundingClientRect();
              if (r.width === 0 && r.height === 0) return;
              const corners = [
                [r.left - cx, r.top - cy], [r.right - cx, r.top - cy],
                [r.left - cx, r.bottom - cy], [r.right - cx, r.bottom - cy],
              ];
              let maxDist = 0;
              for (const [dx, dy] of corners) maxDist = Math.max(maxDist, Math.sqrt(dx * dx + dy * dy));
              if (maxDist === 0) return;
              // Fit into upper 60% of circle (leave bottom 40% for text)
              const useR = radius * 0.55;
              const s = Math.round((useR / maxDist) * 100);
              const el = document.getElementById("logoScale") as any;
              el.value = String(s);
              el.dispatchEvent(new Event("input", { bubbles: true }));
              // Move logo up to center it in upper region
              const moveY = document.getElementById("logoMoveY") as any;
              moveY.value = String(Math.round(-radius * 0.18));
              moveY.dispatchEvent(new Event("input", { bubbles: true }));
              if (typeof (window as any).render === "function") (window as any).render();
            });
            await new Promise((r) => setTimeout(r, 400));
            // Show text back so applyCurvedText can read it
            await page3.evaluate(() => {
              document.getElementById("logoText")!.style.display = "";
            });
            await applyCurvedText(page3);
            await new Promise((r) => setTimeout(r, 300));
            const curvedB64 = await screenshotFrame(page3, false);
            await page3.close();

            // --- 4. Icon: text + logo, both scaled to fit circle ---
            const page4 = await freshPage();
            await setupCircle(page4, false);
            // Scale BOTH logo and text to fit inside the circle.
            // logoScale only affects the logo, so we also reduce textSize input.
            // Iteratively shrink until everything fits.
            for (let iter = 0; iter < 6; iter++) {
              const scaleFactor = await page4.evaluate(() => {
                const fw = document.getElementById("frameWrap")!;
                const fwR = fw.getBoundingClientRect();
                const radius = fwR.width / 2;
                const cx = fwR.left + radius;
                const cy = fwR.top + radius;
                // Measure combined bounds of logo + text
                const anchor = document.getElementById("logoAnchor")!;
                const text = document.getElementById("logoText")!;
                const aR = anchor.getBoundingClientRect();
                const tR = text.getBoundingClientRect();
                const hasText = text.offsetHeight > 0 && text.textContent!.trim().length > 0;
                const top = Math.min(aR.top, hasText ? tR.top : aR.top);
                const bottom = Math.max(aR.bottom, hasText ? tR.bottom : aR.bottom);
                const left = Math.min(aR.left, hasText ? tR.left : aR.left);
                const right = Math.max(aR.right, hasText ? tR.right : aR.right);
                const corners = [
                  [left - cx, top - cy], [right - cx, top - cy],
                  [left - cx, bottom - cy], [right - cx, bottom - cy],
                ];
                let maxDist = 0;
                for (const [dx, dy] of corners) {
                  maxDist = Math.max(maxDist, Math.sqrt(dx * dx + dy * dy));
                }
                if (maxDist === 0) return 1;
                const pad = radius * 0.10;
                return (radius - pad) / maxDist;
              });
              if (scaleFactor >= 0.98) break; // fits already
              // Apply scale to both logo and text size inputs, then re-render
              await page4.evaluate((sf: number) => {
                const $ = (id: string) => document.getElementById(id) as any;
                // Scale logo
                const curScale = parseInt($("logoScale").value) || 100;
                $("logoScale").value = String(Math.round(curScale * sf));
                // Scale text size (via input so render() picks it up)
                const curTextSize = parseInt($("textSize").value) || 24;
                $("textSize").value = String(Math.round(curTextSize * sf));
                // Scale gap
                const curGap = parseInt($("gap").value) || 0;
                $("gap").value = String(Math.round(curGap * sf));
                // Dispatch and re-render
                ["logoScale", "textSize", "gap"].forEach((id) =>
                  $(id).dispatchEvent(new Event("input", { bubbles: true }))
                );
                if (typeof (window as any).render === "function") (window as any).render();
              }, scaleFactor);
              await new Promise((r) => setTimeout(r, 400));
            }
            const scaledB64 = await screenshotFrame(page4, false);
            await page4.close();

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              full:       { data: fullB64,   name: `logo-${tag}-${scale}x.png` },
              icon:       { data: iconB64,   name: `icon-${tag}-${scale}x.png` },
              iconCurved: { data: curvedB64, name: `icon-curved-${tag}-${scale}x.png` },
              iconScaled: { data: scaledB64, name: `icon-scaled-${tag}-${scale}x.png` },
            }));
          } catch (e: any) {
            console.error("Logo export error:", e);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end(e.message || "Export failed");
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    logoExportPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "FutureBuddy",
        short_name: "FutureBuddy",
        description: "Your 24/7 IT Department",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
      "/health": "http://localhost:3000",
    },
  },
});
