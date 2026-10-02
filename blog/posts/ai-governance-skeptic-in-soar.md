---
title: "The Case for a Skeptic: Governing AI Response"
date: "2026-09-22"
author: "Breakwater Team"
tags: ["AI Governance", "Incident Response", "Automation"]
hero: "posts/ai-governance-skeptic-in-soar-hero.png"
excerpt: "Autonomous response is only as trustworthy as the disagreement built into it. Here's why we gave Breakwater Response a role whose entire job is to argue the incident isn't real."
faq:
  - q: "Can the Skeptic role override containment entirely?"
    a: "It can hold the council before Warden acts, if the evidence for an approved change outweighs the evidence for an attack. That is the point of making the debate visible rather than skipping it."
  - q: "What happens when the council disagrees and there is no clear winner?"
    a: "It escalates to human review instead of forcing a majority-rules verdict. Unresolved disagreement is itself a signal worth a person's attention, not something to average away."
  - q: "Can we set our own policy bounds for what Warden is allowed to do autonomously?"
    a: "Yes. GREEN policy bounds are defined by your team, not fixed by us. What counts as pre-approved and reversible is a configuration you control, not a default we impose."
---

A single AI model reviewing a security alert has the same failure mode as a single analyst who's been staring at the same dashboard for six hours: it anchors on its first read and gets more confident, not less, the longer it looks. Ask it again five minutes later and you'll usually get the same answer, delivered with the same confidence, whether or not that confidence is earned. That's the problem nobody talks about when they say "add AI to the SOC." Speed was never the hard part. Knowing when to doubt yourself is.

We built [Breakwater Response](/response/) around a council instead of a single model, and the fifth seat at that table is a role whose entire job is to disagree.

## Five roles, one incident

Every incident that reaches a decision point gets reviewed by five independent reasoning roles, not one model asked the same question five times:

- **Sentinel** triages the raw signal first and makes the initial call on whether this looks like an attack.
- **Pathfinder** traces how it could move: lateral path, blast radius, what's actually reachable from here.
- **Arbiter** takes the generalist view, weighing Sentinel and Pathfinder's read against broader context.
- **Skeptic** argues the other side, on purpose. Could this be an approved change? Does the evidence actually support "attack," or does it just look like one?
- **Warden** acts, but only after the first four have weighed in, and only inside policy bounds a person set in advance.

Take a loader that drops a scheduled task and injects into a running process. Textbook persistence and defense evasion, on paper. Sentinel flags it, Pathfinder maps where it could spread, Arbiter leans toward escalation. Then Skeptic checks whether there's a matching deployment ticket, finds one, and says so: could be an approved rollout, checking base rate, no conflict with known change windows, and legitimate rollouts don't usually inject via reflective DLL, but this one's close enough to warrant a second look before anyone isolates a host over it.

Sometimes Skeptic is right and the council holds. Sometimes the rest of the evidence outweighs it and Warden proceeds anyway. Either way, the disagreement is specific, it's logged, and it's attached to the decision, not discarded once a verdict is reached.

## What Warden is actually allowed to do

The other half of governance is constraint, not just deliberation. An AI that argues with itself well but then acts without limits hasn't solved anything, it's just added theater in front of the same risk. So every action Warden takes runs inside GREEN policy: bounds your team defined in advance, scoped to what's reversible, logged with the full council's reasoning attached rather than just the final verdict.

That last part is the one that matters six months later. Not "the AI decided," but a specific, auditable record of why, including the role that pushed back and exactly what it said. One of those you have to trust blind. The other you can actually check.

The value of a five-role council was never redundancy. It's that Skeptic exists at all, sitting in the one seat whose job is to make sure speed never quietly became the whole decision.
