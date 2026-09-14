import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.BWTR_PREVIEW_URL || "http://127.0.0.1:4177";
const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const chrome = chromeCandidates.find(existsSync);
assert.ok(chrome, "Chrome is required; set CHROME_PATH to the browser executable");

const profile = mkdtempSync(join(tmpdir(), "bwtr-rendered-layout-"));
const port = 12000 + Math.floor(Math.random() * 2000);
const chromeArgs = [
  "--headless=new",
  "--disable-background-networking",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "about:blank",
];
if (process.platform === "linux") {
  // GitHub-hosted Linux runners do not expose the namespaces Chrome needs for its sandbox.
  chromeArgs.splice(1, 0, "--no-sandbox", "--disable-dev-shm-usage");
}
const browser = spawn(
  chrome,
  chromeArgs,
  { stdio: ["ignore", "ignore", "ignore"] },
);

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function debuggerUrl() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return (await response.json()).webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting.
    }
    await delay(100);
  }
  throw new Error("Chrome DevTools endpoint did not become ready");
}

let socket;
let commandId = 0;
const pending = new Map();

function command(method, params = {}, sessionId) {
  commandId += 1;
  const message = { id: commandId, method, params };
  if (sessionId) message.sessionId = sessionId;
  socket.send(JSON.stringify(message));
  return new Promise((resolve, reject) => pending.set(commandId, { resolve, reject }));
}

async function evaluate(expression, sessionId) {
  const response = await command(
    "Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text || "Browser evaluation failed");
  }
  return response.result.value;
}

try {
  socket = new WebSocket(await debuggerUrl());
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const waiter = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result || {});
  });

  const { targetId } = await command("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await command("Target.attachToTarget", { targetId, flatten: true });
  await command("Page.enable", {}, sessionId);
  await command("Runtime.enable", {}, sessionId);
  await command(
    "Emulation.setEmulatedMedia",
    { media: "screen", features: [{ name: "prefers-reduced-motion", value: "reduce" }] },
    sessionId,
  );

  const routes = [
    "/",
    "/products/",
    "/architecture/",
    "/research/",
    "/about/",
    "/airports/",
    "/power-utilities/",
    "/connected-industry/",
    "/healthcare/",
  ];
  const widths = [320, 375, 390, 760, 768, 900, 901, 1024, 1440];
  let checks = 0;

  for (const width of widths) {
    await command(
      "Emulation.setDeviceMetricsOverride",
      { width, height: 900, deviceScaleFactor: 1, mobile: width <= 760 },
      sessionId,
    );
    for (const route of routes) {
      await command("Page.navigate", { url: `${baseUrl}${route}` }, sessionId);
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const ready = await evaluate(
          "document.readyState === 'complete' && document.querySelector('.page-hero-backdrop img, .hero-backdrop img')?.complete",
          sessionId,
        );
        if (ready) break;
        if (attempt === 79) throw new Error(`${route} at ${width}px did not finish rendering`);
        await delay(50);
      }

      const result = await evaluate(
        `(() => {
          document.documentElement.dataset.theme = "light";
          const visible = (node) => {
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
          };
          const colorChannels = (color) => {
            const value = color.trim();
            if (/^#[0-9a-f]{6}$/i.test(value)) {
              return [1, 3, 5].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
            }
            return (value.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
          };
          const luminance = (color) => {
            const linear = colorChannels(color).map((channel) => {
              const value = channel / 255;
              return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
          };
          const contrast = (foreground, background) => {
            const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
            return (values[0] + 0.05) / (values[1] + 0.05);
          };
          const support = [...document.querySelectorAll(
            ".eyebrow, .capability-boundary, .comparison-disclaimer, .access-card p, .technical-node-grid p, .positioning-table td"
          )].filter(visible).map((node) => parseFloat(getComputedStyle(node).fontSize));
          const overflow = [...document.body.querySelectorAll("*")].filter((node) => {
            if (!visible(node) || node.closest(".hidden-field") || getComputedStyle(node).position === "fixed") return false;
            const rect = node.getBoundingClientRect();
            return rect.left < -1 || rect.right > innerWidth + 1;
          }).slice(0, 8).map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              node: node.className || node.tagName,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            };
          });
          const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
          const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
          const badBlankLinks = [...document.querySelectorAll('a[target="_blank"]')]
            .filter((link) => !link.relList.contains("noopener") || !link.relList.contains("noreferrer")).length;
          const heroContracts = ${route === "/" ? `(() => {
            const hero = document.querySelector(".hero");
            const backdrop = document.querySelector(".hero-backdrop");
            const image = backdrop.querySelector("img");
            const gallery = document.querySelector(".environment-stories");
            const caption = backdrop.querySelector("figcaption");
            const snapshots = ["dark", "light"].map((theme) => {
              document.documentElement.dataset.theme = theme;
              const heroRect = hero.getBoundingClientRect();
              const backdropRect = backdrop.getBoundingClientRect();
              const captionRect = caption.getBoundingClientRect();
              const copyRect = document.querySelector(".hero-copy").getBoundingClientRect();
              const actionButtons = [...document.querySelectorAll(".hero-actions .button")];
              const productLabels = [...document.querySelectorAll(".asoc-module .product-name")];
              const environmentLabels = [...document.querySelectorAll(".environment-story > div > span")];
              const focusTargets = [
                document.querySelector(".theme-toggle"),
                document.querySelector(".hero .button-primary"),
                document.querySelector(".platform-preview .button-light"),
                document.querySelector(".lead-form input"),
              ];
              const focusIndicators = focusTargets.map((target) => {
                target.focus({ preventScroll: true });
                const style = getComputedStyle(target);
                return {
                  visible: target.matches(":focus-visible"),
                  outlineColor: style.outlineColor,
                  outlineStyle: style.outlineStyle,
                  outlineWidth: style.outlineWidth,
                  boxShadow: style.boxShadow,
                };
              });
              const buttons = actionButtons.map((button) => {
                const rect = button.getBoundingClientRect();
                return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
              });
              return {
                theme,
                heroLeft: Math.round(heroRect.left),
                heroRight: Math.round(heroRect.right),
                backdropLeft: Math.round(backdropRect.left),
                backdropRight: Math.round(backdropRect.right),
                backdropTop: Math.round(backdropRect.top),
                backdropBottom: Math.round(backdropRect.bottom),
                heroTop: Math.round(heroRect.top),
                heroBottom: Math.round(heroRect.bottom),
                copyInsideHero: copyRect.top >= heroRect.top && copyRect.bottom <= heroRect.bottom,
                buttonsVisible: actionButtons.length === 2 && actionButtons.every(visible),
                buttonsInsideHero: buttons.length === 2 && buttons.every((rect) =>
                  rect.left >= heroRect.left && rect.right <= heroRect.right &&
                  rect.top >= heroRect.top && rect.bottom <= heroRect.bottom
                ),
                captionOverlapsCopy: !(
                  captionRect.right <= copyRect.left || captionRect.left >= copyRect.right ||
                  captionRect.bottom <= copyRect.top || captionRect.top >= copyRect.bottom
                ),
                overlay: getComputedStyle(backdrop, "::after").backgroundImage,
                objectPosition: getComputedStyle(image).objectPosition,
                minimumProductLabelContrast: Math.min(...productLabels.map((label) =>
                  contrast(
                    getComputedStyle(label).color,
                    getComputedStyle(label.closest(".asoc-module")).backgroundColor,
                  )
                )),
                minimumEnvironmentLabelContrast: Math.min(...environmentLabels.map((label) =>
                  contrast(
                    getComputedStyle(label).color,
                    getComputedStyle(label.closest(".environment-story")).backgroundColor,
                  )
                )),
                focusIndicators,
              };
            });
            return {
              currentSrc: image.currentSrc,
              galleryBelowHero: gallery.getBoundingClientRect().top >= hero.getBoundingClientRect().bottom,
              snapshots,
            };
          })()` : "null"};
          return {
            viewport: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            overflow,
            minimumSupportFont: support.length ? Math.min(...support) : 16,
            heroFont: parseFloat(getComputedStyle(document.querySelector(".page-hero h1, .hero h1")).fontSize),
            heroImageReady: document.querySelector(".page-hero-backdrop img, .hero-backdrop img")?.naturalWidth > 0,
            missingAlt: [...document.images].filter((image) => !image.hasAttribute("alt")).length,
            duplicateIds,
            badBlankLinks,
            hiddenArchitectureModels: document.querySelectorAll('[role="img"].architecture-model, [role="img"].technical-stack').length,
            heroContracts,
          };
        })()`,
        sessionId,
      );

      assert.equal(result.viewport, width, `${route}: viewport emulation failed at ${width}px`);
      assert.ok(result.documentWidth <= width, `${route}: document overflows at ${width}px`);
      assert.deepEqual(result.overflow, [], `${route}: elements overflow at ${width}px`);
      assert.ok(result.minimumSupportFont >= 11, `${route}: support text is below 11px at ${width}px`);
      assert.ok(
        result.heroFont >= 40 && result.heroFont <= 78,
        `${route}: hero type is ${result.heroFont}px at ${width}px; expected 40–78px`,
      );
      assert.ok(result.heroImageReady, `${route}: hero image did not load at ${width}px`);
      assert.equal(result.missingAlt, 0, `${route}: image alt contract failed`);
      assert.deepEqual(result.duplicateIds, [], `${route}: duplicate IDs found`);
      assert.equal(result.badBlankLinks, 0, `${route}: external-link rel contract failed`);
      assert.equal(result.hiddenArchitectureModels, 0, `${route}: architecture content is hidden from assistive technology`);
      if (route === "/") {
        const expectedCandidate = width <= 640
          ? "breakwater-hero-airport-640.jpg"
          : width <= 1200
            ? "breakwater-hero-airport-1200.jpg"
            : "breakwater-hero-airport.jpg";
        assert.ok(
          result.heroContracts.currentSrc.endsWith(expectedCandidate),
          `homepage: unexpected hero candidate at ${width}px: ${result.heroContracts.currentSrc}`,
        );
        assert.ok(result.heroContracts.galleryBelowHero, "homepage: environment gallery overlaps the hero");
        for (const snapshot of result.heroContracts.snapshots) {
          assert.equal(snapshot.heroLeft, 0, `homepage ${snapshot.theme}: hero is not flush left`);
          assert.equal(snapshot.heroRight, width, `homepage ${snapshot.theme}: hero is not flush right`);
          assert.equal(snapshot.backdropLeft, 0, `homepage ${snapshot.theme}: backdrop is not flush left`);
          assert.equal(snapshot.backdropRight, width, `homepage ${snapshot.theme}: backdrop is not flush right`);
          assert.equal(snapshot.backdropTop, snapshot.heroTop, `homepage ${snapshot.theme}: backdrop top escapes hero`);
          assert.equal(snapshot.backdropBottom, snapshot.heroBottom, `homepage ${snapshot.theme}: backdrop bottom escapes hero`);
          assert.ok(snapshot.copyInsideHero, `homepage ${snapshot.theme}: copy escapes hero bounds`);
          assert.ok(snapshot.buttonsVisible, `homepage ${snapshot.theme}: expected two visible hero CTAs`);
          assert.ok(snapshot.buttonsInsideHero, `homepage ${snapshot.theme}: CTA escapes hero bounds`);
          assert.ok(!snapshot.captionOverlapsCopy, `homepage ${snapshot.theme}: caption overlaps hero copy`);
          assert.ok(snapshot.overlay.includes("rgba(0, 1, 0, 0.94)"), `homepage ${snapshot.theme}: Vantablack text overlay changed`);
          assert.ok(
            snapshot.minimumProductLabelContrast >= 4.5,
            `homepage ${snapshot.theme}: product labels fail AA contrast`,
          );
          assert.ok(
            snapshot.minimumEnvironmentLabelContrast >= 4.5,
            `homepage ${snapshot.theme}: environment labels fail AA contrast`,
          );
          for (const indicator of snapshot.focusIndicators) {
            assert.ok(indicator.visible, `homepage ${snapshot.theme}: focused control has no visible state`);
            assert.equal(indicator.outlineColor, "rgb(255, 255, 255)", `homepage ${snapshot.theme}: focus outline must be white`);
            assert.equal(indicator.outlineStyle, "solid", `homepage ${snapshot.theme}: focus outline must be solid`);
            assert.equal(indicator.outlineWidth, "3px", `homepage ${snapshot.theme}: focus outline is too thin`);
            assert.ok(indicator.boxShadow.includes("rgb(0, 1, 0) 0px 0px 0px 2px"), `homepage ${snapshot.theme}: focus ring needs a near-black underlay`);
          }
          assert.equal(
            snapshot.objectPosition,
            width <= 760 ? "61% 50%" : "52% 50%",
            `homepage ${snapshot.theme}: hero focal position changed at ${width}px`,
          );
        }
        checks += 64;
      }
      checks += 10;
    }
  }

  console.log(
    `Rendered layout and accessibility contracts: ${checks} passed across ${routes.length * widths.length} page/viewport combinations.`,
  );
} finally {
  socket?.close();
  browser.kill("SIGTERM");
  if (browser.exitCode === null) {
    await Promise.race([
      new Promise((resolve) => browser.once("exit", resolve)),
      delay(2000),
    ]);
  }
  if (profile.startsWith(join(tmpdir(), "bwtr-rendered-layout-"))) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        rmSync(profile, { recursive: true, force: true });
        break;
      } catch (error) {
        if (attempt === 9) {
          console.warn(`Chrome profile cleanup deferred: ${error.message}`);
          break;
        }
        await delay(100);
      }
    }
  }
}
