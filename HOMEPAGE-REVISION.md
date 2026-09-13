# Homepage revision — hero, portfolio, evidence chain

Copy for the three pieces agreed after the a16z feedback: a hero that keeps the code+infrastructure thesis while grounding it, the four-product section moved to position 2, and a full evidence-chain narrative to replace another abstract statement with a real walkthrough.

**Scope:** copy only. Visual production (photography or engineering-diagram illustration for the hero split and the evidence-chain diagram) is a separate, parallel design task — see the visual notes under each section. Do not build these as CSS/SVG illustrations; that reproduces the exact "everything is generated" problem a16z flagged. Use licensed photography or real engineering-diagram conventions instead.

---

## 1. Hero (revised)

**Eyebrow** — unchanged: `EVIDENCE-LED SECURITY INTELLIGENCE`

**H1** — unchanged, deliberately:
> **Security from code to critical infrastructure—with the proof attached.**

This line already contains both halves of the company. The problem was never the words — it's that nothing on the page visually represents "critical infrastructure" as anything other than an abstract phrase. Fix the image, not the sentence.

**Subhead** — revised to ground it in concrete nouns without narrowing scope:
> Before: "Breakwater connects what infrastructure reveals, what analysis confirms, and who is authorized to act—across software, connected environments, and cryptographic systems."
>
> **After: "Breakwater connects what infrastructure reveals, what analysis confirms, and who is authorized to act — across the cameras and controllers that run physical operations, the code that ships behind them, and the cryptography underneath both."**

Why: "connected environments" and "cryptographic systems" are accurate but weightless. "Cameras and controllers" and "the code that ships behind them" are the same claim in nouns a reader can picture — which is the entire point of this revision.

**CTAs** — unchanged: `Explore the portfolio →` / `Request a private briefing`

**Visual note (for design, not copy):** split composition, not a single orbit diagram. Left side: a labeled, photo-real view of a physical operating environment (airport terminal concourse or a substation control room), with callouts naming real equipment — camera, access controller, PLC, HMI. Right side: an equally concrete view of the code/crypto half — a source file flowing into a CVE match and an SBOM trace. Both sides converge into the existing "Evidence Core" node in the center. The convergence point is fine to keep; the problem was that both arms feeding into it were abstract. Use real photography (licensed) or actual engineering/network-diagram notation for both sides — not stylized isometric illustration, which reads as its own AI-adjacent aesthetic.

---

## 2. Portfolio section — moved to position 2, directly after the hero

**Eyebrow** — unchanged: `THE BREAKWATER PORTFOLIO`

**H2** — revised, and now extensible by design (see the "four products" discussion — this must never again hang the headline on a count):
> Before: "Four products, connected by one evidence and provenance standard."
>
> **After: "Every product, connected by one evidence and provenance standard."**

**New subhead line** (ties the extensibility principle directly to the portfolio, so a fifth product reads as the model working, not breaking):
> **"Each product owns one decision. Add a decision worth defending, and the portfolio grows to meet it."**

**Product cards** — unchanged, no notes. The current taglines (ASOC / Assure / Secure / MCP) are already good and specific; don't touch them:
- Breakwater ASOC — "Cyber-physical intelligence that shows what changed—and what it affects."
- Breakwater Assure — "Application security findings that arrive ready to defend."
- Breakwater Secure — "Cryptographic migration evidence for operators, architects, and auditors."
- Breakwater MCP — "Applied cyber analytics shaped by teaching and security research."

**Closing line** — unchanged: `Need the capability map? Compare the portfolio →`

Why this section moves to position 2: a visitor needs to know Breakwater is a four-product portfolio *before* they read a detailed airport or substation story — otherwise the OT story reads as the whole company, which is the exact failure mode of the old site this redesign was built to fix.

---

## 3. Evidence chain — new section, position 3

This replaces "another abstract evidence statement" with the actual thing a16z asked to see: proof this could only have been built by people who've done the work.

**Eyebrow:** `ONE EVIDENCE CHAIN, START TO FINISH`

**H2:** **"What actually happens between 'we found something' and 'it's fixed.'"**

**Intro line (required labeling — matches the disclosure discipline already used elsewhere on the site):**
> "A single, illustrative walkthrough of the loop every Breakwater product runs — compressed from typical ASOC investigation patterns, not one customer's incident."

**The eight steps:**

1. **Observed** — "A camera nobody remembers installing shows up in the network map."
2. **Enriched** — "Its firmware resolves to a build carrying two known CVEs, one of them remote-exploitable."
3. **Validated** — "ASOC tests whether the camera is actually reachable from outside its intended segment. It is — a stale guest-network rule left the door open."
4. **Modeled** — "Attack-path analysis traces where that door leads: guest network, through the camera, into the operations VLAN it was never supposed to touch."
5. **Weighed** — "A digital-twin run estimates the actual operational cost if that path gets used — which systems see traffic, what stops working, measured in consequence rather than a 1–10 score."
6. **Proposed** — "A segmentation fix goes out as a plan, evidence attached: close the stale rule, isolate the camera to its own VLAN."
7. **Approved** — "A person reviews the blast radius and the rollback path, then authorizes the change. Breakwater prepared it; a human signed it."
8. **Verified** — "Breakwater re-tests the same path after the fix ships. Closed. The full record — what was found, what was proposed, who approved it, what got confirmed — stays attached to the camera's file."

**Bridge line, closing the section** (this is the guardrail against the section reading as "Breakwater = OT only"):
> **"The same eight-step discipline runs underneath Assure's code findings and Secure's cryptographic migrations — different assets, the same standard of proof."**

**CTA:** `See how this applies to your environment →` linking to `/platform/`

**Visual note:** a simple, honestly-labeled flow diagram — eight boxes, one arrow each, using real network-diagram/flowchart conventions (the kind an engineer would actually draw), not a glowing gradient timeline. This can ship with a plain, well-typeset diagram before any bespoke illustration exists; it doesn't need to wait on the photography/illustration workstream.

---

## What's deliberately not included here

Per the phased plan: the three full "environment story" panels (airport / power-utilities / connected industrial), the matching Assure/Secure environment story, and any real product screenshots are a separate design-and-photography workstream that runs in parallel and should not block shipping this copy. This document covers only what can ship as a copy/structure change this week.
