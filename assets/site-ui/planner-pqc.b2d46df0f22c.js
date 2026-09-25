// Adapted from the pinned ASOC planner; see scripts/planners/provenance.json.
import { validateAnswers } from "/assets/site-ui/planner-validation.cc3648707f67.js";




export const pqcQuestions = [
  { id: 'shelf', eyebrow: '01 · DATA SHELF-LIFE (X)', question: 'How long must your protected data stay confidential?', context: 'Data captured today can be stored now and decrypted once a quantum computer exists (harvest now, decrypt later). Pick the longest that applies to you.', options: [
    { id: 'le1', title: 'Up to 1 year', description: 'Transient data with little long-term value.' },
    { id: 'mid', title: '3–5 years', description: 'Typical business records and contracts.' },
    { id: 'ten', title: '~10 years', description: 'Regulated, financial, or health data.' },
    { id: 'long', title: '25+ years', description: 'State secrets, IP, identities, long-lived keys.' },
  ] },
{ id: 'horizon', eyebrow: '02 · QUANTUM HORIZON (Z)', question: 'Which quantum-threat timeline should we plan against?', context: 'Z is the years until a cryptographically-relevant quantum computer is assumed. This is an assumption, not a prediction. Choose your planning stance.', options: [
    { id: 'aggressive', title: 'Short horizon (5 years)', description: 'Plan for an early breakthrough.' },
    { id: 'central', title: 'Middle scenario (8 years)', description: 'An illustrative scenario, not a NIST forecast.' },
    { id: 'conservative', title: 'Long horizon (15 years)', description: 'Later arrival, longer runway.' },
    { id: 'mandate', title: 'Policy scenario (7 years)', description: 'Illustrative only. Replace with your verified deadline in a workshop.' },
  ] },
  { id: 'surface', eyebrow: '03 · CRYPTO SURFACE', question: 'Where does the cryptography that worries you most live?', context: 'This weights which domain migrates first. You can revise it; the plan sequences all domains regardless.', options: [
    { id: 'tls', title: 'TLS, PKI & certificates', description: 'Public/internal PKI, TLS everywhere, HSMs.' },
    { id: 'data', title: 'Data at rest', description: 'Databases, backups, archives, key-wrapping.' },
    { id: 'code', title: 'Code-signing & firmware', description: 'Long-lived signatures on software and devices.' },
    { id: 'identity', title: 'Identity & VPN', description: 'SSO, tokens, IKE/IPsec, remote access.' },
  ] },
  { id: 'inventory', eyebrow: '04 · CRYPTO INVENTORY', question: 'How complete is your cryptography inventory (CBOM)?', context: 'You cannot migrate what you cannot see. Secure can generate a CBOM if you do not have one.', options: [
    { id: 'none', title: 'None yet', description: 'No systematic view of where crypto is used.' },
    { id: 'partial', title: 'Partial / manual', description: 'Spreadsheets or per-team knowledge.' },
    { id: 'secure', title: 'Secure-generated', description: 'A CBOM produced by Secure discovery.' },
    { id: 'complete', title: 'Complete & maintained', description: 'A living, authoritative CBOM.' },
  ] },
  { id: 'compliance', eyebrow: '05 · COMPLIANCE DRIVER', question: 'Which mandate is driving the migration?', context: 'Mandates can compress the timeline regardless of the science.', options: [
    { id: 'sector', title: 'Sector regulator', description: 'Finance, health, or critical-infrastructure rules.' },
    { id: 'none', title: 'No mandate yet', description: 'Risk-driven, ahead of regulation.' },
    { id: 'cnsa2', title: 'CNSA 2.0 (US)', description: 'US national-security systems; verify applicability and current deadlines.' },
    { id: 'nsm10', title: 'NSM-10 / federal (US)', description: 'US federal civilian migration direction.' },
  ] },
  { id: 'agility', eyebrow: '06 · CRYPTO-AGILITY', question: 'How easily can you change algorithms today?', context: 'Agility is the biggest lever on migration time (Y). Hard-coded crypto is slow and risky to move.', options: [
    { id: 'hardcoded', title: 'Hard-coded', description: 'Algorithms embedded in code and devices.' },
    { id: 'config', title: 'Config-driven', description: 'Some algorithms are configurable.' },
    { id: 'abstracted', title: 'Abstracted', description: 'A crypto library/service mediates most use.' },
    { id: 'agile', title: 'Fully crypto-agile', description: 'Algorithms swap centrally by policy.' },
  ] },
  { id: 'dependency', eyebrow: '07 · DEPENDENCY EXPOSURE', question: 'How much crypto do you NOT control (vendors, SaaS, hardware)?', context: 'Third-party crypto you cannot change yourself adds coordination time to Y.', options: [
    { id: 'low', title: 'Low', description: 'Mostly first-party, controllable crypto.' },
    { id: 'some', title: 'Some', description: 'A few key vendors and appliances.' },
    { id: 'significant', title: 'Significant', description: 'Many SaaS and hardware dependencies.' },
    { id: 'pervasive', title: 'Pervasive', description: 'Crypto is spread across an uncontrolled supply chain.' },
  ] },
  { id: 'crown', eyebrow: '08 · HIGHEST-VALUE ASSET', question: 'What must be protected first if you can only move one thing?', context: 'This sets the top of the migration order.', options: [
    { id: 'root', title: 'Roots of trust', description: 'CA keys, HSMs, signing roots.' },
    { id: 'data', title: 'Customer / regulated data', description: 'The data with the longest shelf-life.' },
    { id: 'firmware', title: 'OT / device firmware', description: 'Long-lived signatures on physical assets.' },
    { id: 'comms', title: 'Communications', description: 'VPNs, inter-service, and identity tokens.' },
  ] },
  { id: 'capacity', eyebrow: '09 · MIGRATION CAPACITY (Y)', question: 'Realistically, what capacity can you commit?', context: 'Team, budget, and change-window realism drive how long the migration (Y) takes.', options: [
    { id: 'constrained', title: 'Constrained', description: 'Best-effort within existing teams.' },
    { id: 'moderate', title: 'Moderate', description: 'A funded workstream with some priority.' },
    { id: 'strong', title: 'Strong', description: 'A named program with executive backing.' },
    { id: 'dedicated', title: 'Dedicated program', description: 'A resourced PQC program office.' },
  ] },
  { id: 'program', eyebrow: '10 · TARGET COMPLETION', question: 'When do you want the migration substantially done?', context: 'Your target, checked against the Mosca math for feasibility.', options: [
    { id: 'y1', title: 'Within 12 months', description: 'Aggressive, focused on crown jewels.' },
    { id: 'y3', title: '~3 years', description: 'A phased enterprise program.' },
    { id: 'y5', title: '~5 years', description: 'A long, dependency-heavy transition.' },
    { id: 'undecided', title: 'Undecided', description: 'Help me set a defensible target.' },
  ] },
]                                          ;

const X = { le1: 1, mid: 5, ten: 10, long: 25 }         ;
const Zbase = { aggressive: 5, central: 8, conservative: 15, mandate: 7 }         ;
const Ybase = { y1: 1, y3: 3, y5: 5, undecided: 4 }         ;
const capAdj = { constrained: 2, moderate: 1, strong: 0, dedicated: -1 }         ;
const agiAdj = { hardcoded: 2, config: 1, abstracted: 0, agile: -1 }         ;
const depAdj = { low: 0, some: 1, significant: 2, pervasive: 3 }         ;

const DOMAINS = [
  { key: 'tls', name: 'PKI, TLS & certificates', target: 'Evaluate ML-KEM-based key establishment and PQC signatures where supported by your protocol, certificate and vendor profiles.', first: 'Inventory TLS and PKI dependencies; validate supported profiles in an isolated interoperability pilot.' },
  { key: 'data', name: 'Data at rest', target: 'Assess symmetric data encryption separately from quantum-vulnerable key establishment and key-management dependencies. ML-KEM establishes keys; it does not encrypt stored data directly.', first: 'Inventory long-lived data and key-management paths, then have a cryptographic engineer review supported migration options.' },
  { key: 'code', name: 'Code-signing & firmware', target: 'ML-DSA, or SLH-DSA (stateless hash-based) where signatures must outlive the device.', first: 'Stand up a PQC signing pipeline and dual-sign new releases.' },
  { key: 'identity', name: 'Identity, VPN & comms', target: 'Evaluate supported PQC or hybrid tunnel/key-establishment profiles separately from token-signature algorithms.', first: 'Confirm vendor support and run a bounded interoperability pilot; do not assume a KEM replaces token signing.' },
]         ;
const surfaceToDomain = { tls: 'tls', data: 'data', code: 'code', identity: 'identity' }         ;
const crownToDomain = { root: 'tls', data: 'data', firmware: 'code', comms: 'identity' }         ;

const complianceLabel = { cnsa2: 'CNSA 2.0', nsm10: 'NSM-10 / federal', sector: 'Sector regulator', none: 'Risk-driven (no mandate yet)' }         ;
const inventoryLabel = { none: 'No inventory yet', partial: 'Partial / manual', secure: 'Secure-generated CBOM', complete: 'Complete & maintained' }         ;

export function createPqcPlan(answers           ) {
  validateAnswers(pqcQuestions, answers);
  const x = X[answers.shelf                  ] ?? 5;
  let z = Zbase[answers.horizon                      ] ?? 8;
  let y = Ybase[answers.program                      ] ?? 4;
  y += capAdj[answers.capacity                       ] ?? 0;
  y += agiAdj[answers.agility                       ] ?? 0;
  y += depAdj[answers.dependency                       ] ?? 0;
  y = Math.max(1, y);
  const late = x + y - z; // >0 => already behind
  const band = late >= 8 ? 'Critical' : late >= 3 ? 'High' : late >= 0 ? 'Elevated' : late >= -4 ? 'Moderate' : 'Planned';
  const verdict = late > 0
    ? `X + Y (${x} + ${y}) > Z (${z}): the assumed window is exceeded by ${late} year${late === 1 ? '' : 's'}. Prioritize inventory and validation.`
    : `X + Y (${x} + ${y}) ≤ Z (${z}): about ${-late} year${-late === 1 ? '' : 's'} of headroom, but discovery should begin now.`;

  const bump = late >= 3 ? 2 : late >= 0 ? 1 : 0;
  const sd = surfaceToDomain[answers.surface                                ];
  const cd = crownToDomain[answers.crown                              ];
  const domains = DOMAINS.map(d => {
    let score = 2 + bump;
    if (d.key === sd) score += 3;
    if (d.key === cd) score += 3;
    return { name: d.name, target: d.target, first: d.first, score };
  }).sort((a, b) => b.score - a.score)
    .map((d, i) => ({ ...d, priority: i + 1, urgency: i === 0 ? band : i === 1 ? (band === 'Critical' ? 'High' : band === 'High' ? 'Elevated' : 'Moderate') : 'Planned' }));

  const needsInventory = answers.inventory === 'none' || answers.inventory === 'partial';
  const needsAgility = answers.agility === 'hardcoded' || answers.agility === 'config';
  const roadmap = [
    ...(needsInventory ? [{ phase: 'Discover & build the CBOM', gate: 'An owner-validated cryptography inventory exists for the in-scope estate; confirm collector coverage and blind spots.' }] : []),
    { phase: 'Prioritize by risk', gate: `Domains ordered by questionnaire priority weights (top domain: ${domains[0].name}); owners named.` },
    ...(needsAgility ? [{ phase: 'Build crypto-agility', gate: 'Algorithms are made configurable/abstracted so they can be swapped by policy.' }] : []),
    { phase: 'Pilot hybrid', gate: 'Hybrid (classical + PQC) is running and interoperable in a bounded pilot with rollback.' },
    { phase: 'Migrate by priority', gate: 'Each domain cut over in priority order; classical kept only as fallback during overlap.' },
    { phase: 'Verify', gate: 'Independent readback confirms PQC in effect; no classical-only path remains for migrated assets.' },
    { phase: 'Decommission classical', gate: 'Retire quantum-vulnerable paths only after approved interoperability, recovery and dependency acceptance; preserve required trust history.' },
  ].map((p, i) => ({ ...p, n: i + 1 }));

  return {
    generatedAt: new Date().toISOString(),
    status: 'Planning target: validate against your CBOM and a discovery workshop',
    mosca: { x, y, z, late, band, verdict },
    summary: `${band} urgency · ${complianceLabel[answers.compliance                                ] ?? 'risk-driven'} · data shelf-life ${x}y, migration ~${y}y, quantum horizon ${z}y`,
    xLabel: `${x}-year data shelf-life`, yLabel: `~${y}-year migration`, zLabel: `${z}-year quantum horizon`,
    complianceLabel: complianceLabel[answers.compliance                                ] ?? 'Risk-driven',
    inventoryLabel: inventoryLabel[answers.inventory                               ] ?? 'Unknown',
    domains, roadmap,
    weProvide: [
      'Evaluate Secure cryptography inventory coverage and inspect evidence provenance; missing or unknown evidence is not safe.',
      'Evaluate Assure findings for declared cryptography and dependencies in authorized source snapshots.',
      'Assess whether the chosen SOAR configuration can support a bounded rehearsal; validate model fidelity and recovery separately.',
      'A questionnaire-weighted roadmap for review, with the Mosca timing comparison and relevant NIST algorithm references (FIPS 203/204/205).',
    ],
    customerControls: [
      'Own PKI / HSM changes: re-key roots, re-issue certificates, and manage trust-store rollout.',
      'Schedule and run data re-encryption windows for long-shelf-life datastores.',
      'Coordinate vendors and appliances you do not control onto PQC / hybrid support.',
      'Name the crypto owner and approve each cut-over, its rollback, and the decommission of classical algorithms.',
    ],
    caveats: [
      'The quantum horizon (Z) is a planning assumption, not a prediction. Review the risk of data being collected now and decrypted later.',
      'This planner proposes a sequence only. It does not scan, rehearse, import a CBOM, rotate keys or issue certificates.',
      'Hybrid (classical + PQC) first: do not remove classical algorithms until PQC is verified in effect.',
      'PQC standards and guidance evolve (NIST FIPS 203/204/205, CNSA 2.0); revisit the plan as they change.',
      'Sizing of Y is an estimate from your answers; confirm against a real CBOM and dependency review.',
    ],
    assessment: [
      'Questionnaire-based estimate: no CBOM was uploaded or inspected. Validate against an inventory before making decisions.',
      'Standards-aligned: targets are the NIST PQC standards: ML-KEM (FIPS 203), ML-DSA (FIPS 204), SLH-DSA (FIPS 205).',
      'Acceptance target: test interoperability, rollback and recovery before an approved production change.',
      'Human-owned: a named crypto owner approves each migration and the decommission of classical algorithms.',
    ],
    answers,
  };
}
