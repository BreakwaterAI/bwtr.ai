// Generates a per-post 1600x900 hero graphic — an abstract diagram built from
// the post's own tags, not photography, so it holds up at a multi-post-per-week
// cadence with no manual sourcing. Uses only approved brand colors.
import sharp from "sharp";

export const WIDTH = 1600;
export const HEIGHT = 900;
const VANTA = "#000100";
const RED = "#F0443E";
const MUTED = "#9AA3AD";

function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One path through a scatter of nodes lights up red, the rest stay muted —
// the "a thousand findings, one route that matters" idea, drawn literally.
function pathMotif(rand) {
  const nodeCount = 9;
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      x: 100 + ((WIDTH - 200) * i) / (nodeCount - 1) + (rand() - 0.5) * 70,
      y: HEIGHT * 0.5 + (rand() - 0.5) * (HEIGHT * 0.56),
    });
  }
  const live = [0, 2, 4, 5, 7, 8].filter((i) => i < nodeCount);
  const liveSet = new Set(live);

  let edges = "";
  for (let i = 0; i < nodeCount; i++) {
    const j = Math.floor(rand() * nodeCount);
    if (j === i) continue;
    const a = nodes[i], b = nodes[j];
    edges += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${MUTED}" stroke-opacity="0.22" stroke-width="1.5"/>`;
  }

  let redPath = "";
  for (let i = 0; i < live.length - 1; i++) {
    const a = nodes[live[i]], b = nodes[live[i + 1]];
    redPath += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${RED}" stroke-width="2.5"/>`;
  }

  const dots = nodes
    .map((n, i) => {
      const active = liveSet.has(i);
      return `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${active ? 8 : 6}" fill="${active ? RED : VANTA}" stroke="${active ? RED : MUTED}" stroke-opacity="${active ? 1 : 0.55}" stroke-width="1.5"/>`;
    })
    .join("");

  return edges + redPath + dots;
}

// Five seats around a center, one seat — the dissenting one — lit red.
function councilMotif(rand) {
  const cx = WIDTH / 2, cy = HEIGHT / 2;
  const R = Math.min(WIDTH, HEIGHT) * 0.32;
  const seats = 5;
  const skepticIdx = Math.floor(rand() * seats);

  let spokes = "", nodes = "";
  for (let i = 0; i < seats; i++) {
    const angle = (Math.PI * 2 * i) / seats - Math.PI / 2 + (rand() - 0.5) * 0.12;
    const x = cx + R * Math.cos(angle);
    const y = cy + R * Math.sin(angle);
    const active = i === skepticIdx;
    spokes += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${active ? RED : MUTED}" stroke-opacity="${active ? 0.9 : 0.3}" stroke-width="${active ? 2.5 : 1.5}"/>`;
    nodes += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${active ? 11 : 7}" fill="${active ? RED : VANTA}" stroke="${active ? RED : MUTED}" stroke-opacity="${active ? 1 : 0.6}" stroke-width="1.5"/>`;
  }
  const ring = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${MUTED}" stroke-opacity="0.16" stroke-width="1.5"/>`;
  const center = `<circle cx="${cx}" cy="${cy}" r="6" fill="${VANTA}" stroke="${MUTED}" stroke-width="1.5"/>`;
  return ring + spokes + center + nodes;
}

// A lattice grid — the actual mathematical basis of post-quantum crypto —
// with one vector picked out, the way a CBOM entry singles out one asset.
function latticeMotif(rand) {
  const cols = 11, rows = 7;
  const spacingX = WIDTH / (cols - 1);
  const spacingY = HEIGHT / (rows - 1);
  const pts = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const offset = r % 2 === 0 ? 0 : spacingX / 2;
      row.push({
        x: c * spacingX + offset - spacingX / 4 + (rand() - 0.5) * 14,
        y: r * spacingY + (rand() - 0.5) * 14,
      });
    }
    pts.push(row);
  }

  let lines = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = pts[r][c];
      if (c < cols - 1) {
        const q = pts[r][c + 1];
        lines += `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${q.y.toFixed(1)}" stroke="${MUTED}" stroke-opacity="0.16" stroke-width="1"/>`;
      }
      if (r < rows - 1) {
        const q = pts[r + 1][c];
        lines += `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${q.y.toFixed(1)}" stroke="${MUTED}" stroke-opacity="0.16" stroke-width="1"/>`;
      }
    }
  }

  const r0 = Math.floor(rows / 2), c0 = Math.floor(cols * 0.3);
  const a = pts[r0][c0];
  const b = pts[Math.min(rows - 1, r0 + 1)][Math.min(cols - 1, c0 + 2)];
  const redVector = `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${RED}" stroke-width="2.5"/>`;
  const dots = pts
    .flat()
    .map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${MUTED}" fill-opacity="0.45"/>`)
    .join("");
  const redDots =
    `<circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="6" fill="${RED}"/>` +
    `<circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="6" fill="${RED}"/>`;

  return lines + dots + redVector + redDots;
}

// A faint full-bleed dot field so the canvas reads as a panel rather than
// empty space once it sits on the site's own near-black ground.
function dotField() {
  const spacing = 56;
  let dots = "";
  for (let y = spacing / 2; y < HEIGHT; y += spacing) {
    for (let x = spacing / 2; x < WIDTH; x += spacing) {
      dots += `<circle cx="${x}" cy="${y}" r="1.4" fill="${MUTED}" fill-opacity="0.16"/>`;
    }
  }
  return dots;
}

const FRAME_INSET = 36;
const frame = `<rect x="${FRAME_INSET}" y="${FRAME_INSET}" width="${WIDTH - FRAME_INSET * 2}" height="${HEIGHT - FRAME_INSET * 2}" fill="none" stroke="${MUTED}" stroke-opacity="0.22" stroke-width="1.5"/>`;

const MOTIFS = { path: pathMotif, council: councilMotif, lattice: latticeMotif };

const MOTIF_TAGS = {
  council: ["AI Governance", "SOAR", "Automation"],
  lattice: ["Post-Quantum", "Cryptography", "Compliance"],
  path: ["OT Security", "Attack Path", "Risk Management", "Application Security"],
};

function pickMotif(tags = []) {
  for (const [motif, keys] of Object.entries(MOTIF_TAGS)) {
    if (tags.some((t) => keys.includes(t))) return motif;
  }
  return "path";
}

export async function generateHeroImage({ title, tags, outPath }) {
  const motif = MOTIFS[pickMotif(tags)];
  const art = motif(mulberry32(seedFrom(title)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${VANTA}"/>
    ${dotField()}
    ${frame}
    ${art}
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outPath);
}
