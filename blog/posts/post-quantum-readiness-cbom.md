---
title: "Post-Quantum Readiness Starts with a CBOM, Not a Deadline"
date: "2026-09-15"
author: "Breakwater Team"
tags: ["Post-Quantum", "Cryptography", "Compliance"]
hero: "posts/post-quantum-readiness-cbom-hero.png"
excerpt: "Most PQC conversations start with a regulatory date and end with panic. The more useful starting point is an honest inventory: what's actually using classical public-key crypto, and where."
faq:
  - q: "Do we need to migrate everything before a certain year?"
    a: "No single hard deadline applies to your whole estate. What matters is how long each piece of data needs to stay confidential, not one migration date applied uniformly across every asset."
  - q: "Is AES-256 also at risk from quantum computers?"
    a: "Only partially. Grover's algorithm halves its effective strength, which a sufficiently large key size already absorbs. It is public-key algorithms like RSA and ECC that lose entirely, not symmetric ones like AES."
  - q: "What is the difference between a CBOM and an SBOM?"
    a: "An SBOM inventories software components. A CBOM inventories the cryptographic primitives those components use, key exchange, signatures, hashing, down to where each one actually runs."
---

Two questions come up whenever post-quantum cryptography gets raised in a planning meeting. "Are we ready," usually from someone who just saw a compliance deadline. Or "is this actually a problem yet," from someone who read a headline about quantum computers breaking encryption and isn't sure how worried to be. Both questions skip the one that actually tells you what to do this quarter: what in the environment is using classical public-key cryptography right now, and how exposed is it.

The reason that question can't wait for a firmer deadline has a name: harvest now, decrypt later. An adversary recording encrypted traffic today doesn't need to break it today. They can store it and wait for the hardware to catch up.

That flips the urgency question on its head. It's not "when will a quantum computer break RSA." It's "how long does what I'm encrypting today need to stay confidential." A password reset token is worthless in ten minutes either way. Telemetry from a piece of industrial equipment with a twenty-year service life is not. If the answer is measured in years, harvest-now-decrypt-later is already live, independent of when anyone thinks large-scale quantum hardware actually arrives.

## Why the math actually holds up

It's worth being precise about why RSA and elliptic-curve cryptography are the ones at risk here, because the gap is real and it's not hand-waving. Factoring a large integer with the best known classical algorithm, the general number field sieve, takes sub-exponential time:

$$
L_n[1/3, c] = \exp\left((c + o(1)) (\ln n)^{1/3} (\ln \ln n)^{2/3}\right)
$$

Shor's algorithm, on a sufficiently large fault-tolerant quantum computer, solves the same problem in polynomial time, roughly $O((\log n)^3)$. That's the asymptotic gap that matters. AES-256 loses only a quadratic factor of strength to Grover's algorithm on the symmetric side, which a large enough key size already absorbs without much drama. RSA and ECDSA lose the game entirely once the hardware exists, because the whole security assumption they're built on stops holding.

Nobody has that hardware today, and credible estimates of when it might exist vary by a lot depending on who you ask. That uncertainty is exactly why harvest-now-decrypt-later, not a firm date, is the risk model worth planning against.

## The inventory comes before the migration plan

Most PQC initiatives go wrong at the same step: they jump straight to picking a post-quantum algorithm before answering where classical public-key crypto is actually used across the estate, and by what.

That inventory is a cryptographic bill of materials. Done properly it tells you, per asset, which primitive is in use, where the evidence for that claim comes from and how confident it is, whether a migration path even exists, and what's downstream of it. That last field is the one that actually matters. A quantum-vulnerable key exchange protecting a safety-relay setpoint is a different priority than the same algorithm on a marketing site's TLS handshake, and a flat inventory that doesn't distinguish the two isn't useful for deciding what to do first.

This matters more in OT than almost anywhere else, because a fleet of legacy PLCs and HMIs still running in 2035 is a very different migration problem than a laptop fleet that refreshes every three years. A single CBOM entry ends up looking something like this:

```json
{
  "asset": "line1-historian",
  "primitive": "ECDSA-P256",
  "protocol": "TLS 1.2",
  "evidence": "observed-handshake",
  "confidence": "high",
  "migrationPath": "hybrid-tls-available",
  "downstream": ["safety-relay-plc-04"]
}
```

Nothing exotic. The `downstream` field is what turns a flat list of cryptographic findings into something a CISO can actually prioritize instead of a spreadsheet everyone agrees is important and nobody acts on.

When a board asks whether you're post-quantum ready, "we're evaluating quantum-resistant algorithms" isn't an answer. A ranked exposure list, a clear picture of what has a migration path today, and a sequenced plan with a stated reason for that order, is one. The difference between those two is entirely the inventory work nobody wants to do first, which is why CBOM generation sits directly in Breakwater Discover and Provenance rather than as a separate tool: the same evidence already gathered for attack paths and software findings is what populates the crypto inventory, asset by asset, without a second pass.
