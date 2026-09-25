// Adapted from the pinned ASOC planner; see scripts/planners/provenance.json.
import { validateAnswers } from './validation.ts';
export type AnswerMap = Record<string, string>;

export type PlannerOption = { id: string; title: string; description: string };
export type PlannerQuestion = { id: string; eyebrow: string; question: string; context: string; options: readonly PlannerOption[] };

export const plannerQuestions = [
  { id: 'networks', eyebrow: '01 · FOOTPRINT', question: 'How many network zones will the PoC cover?', context: 'Count the isolated or separately governed environments that each need their own collection point.', options: [
    { id: 'one', title: 'One zone', description: 'A single routed IT, lab, or OT environment.' },
    { id: 'three', title: 'Three zones', description: 'Three distinct networks or security boundaries.' },
    { id: 'six', title: 'Six zones', description: 'A broader business-unit or multi-site evaluation.' },
    { id: 'twelve', title: 'Twelve or more', description: 'A distributed enterprise evaluation that needs a placement workshop.' },
  ] },
  { id: 'assets', eyebrow: '02 · SCALE', question: 'How many assets are in the evaluation boundary?', context: 'Include servers, endpoints, network devices, OT/IoT equipment, cloud resources, and known virtual assets.', options: [
    { id: 'small', title: 'Up to 500', description: 'Focused service, plant cell, or lab.' },
    { id: 'medium', title: '501–2,500', description: 'Typical site or business-unit footprint.' },
    { id: 'large', title: '2,501–10,000', description: 'Large site or several connected estates.' },
    { id: 'xlarge', title: 'More than 10,000', description: 'Enterprise scale. Benchmark before committing capacity.' },
  ] },
  { id: 'estate', eyebrow: '03 · ENVIRONMENT', question: 'Which best describes the estate?', context: 'This shapes where collectors go, which discovery modes are safe, and which integrations come first.', options: [
    { id: 'it', title: 'Enterprise IT', description: 'Campus, data-center, identity, endpoint, and cloud services.' },
    { id: 'ot', title: 'OT and IoT', description: 'Industrial, building, medical, or cyber-physical systems.' },
    { id: 'cloud', title: 'Cloud and DMZ', description: 'Cloud accounts, internet-facing services, and segmented zones.' },
    { id: 'hybrid', title: 'Hybrid IT / OT', description: 'Connected operational, enterprise, cloud, and edge environments.' },
  ] },
  { id: 'connectivity', eyebrow: '04 · DATA CUSTODY', question: 'What connectivity is available to the deployment?', context: 'Choose the most restrictive boundary the central server, collectors, updates, and model runtime must all work within.', options: [
    { id: 'private', title: 'Private connected', description: 'Internal routing with approved outbound services.' },
    { id: 'outbound', title: 'Outbound only', description: 'Collectors open mutually authenticated connections outward.' },
    { id: 'window', title: 'Controlled update window', description: 'Normally isolated with scheduled, reviewed updates.' },
    { id: 'airgap', title: 'Fully air-gapped', description: 'No external dependency during operation.' },
  ] },
  { id: 'collection', eyebrow: '05 · COLLECTION', question: 'How should Secure observe the networks?', context: 'Active techniques require explicit rules of engagement. OT and safety-sensitive zones should begin passively.', options: [
    { id: 'import', title: 'Imports and APIs', description: 'Use approved inventories, controller exports, and existing records.' },
    { id: 'passive', title: 'Passive SPAN / TAP', description: 'Watch mirrored traffic without ever talking to a device.' },
    { id: 'cautious', title: 'Cautious discovery', description: 'Use bounded identity probes under an approved allowlist.' },
    { id: 'combined', title: 'Combined evidence', description: 'Blend imports, passive observation, and approved discovery.' },
  ] },
  { id: 'source', eyebrow: '06 · APPLICATIONS', question: 'How much source code will Assure review?', context: 'Use authorized snapshots only. The result sizes the isolated review workers; on its own it does not authorize taking in customer source code.', options: [
    { id: 'repo', title: 'One repository', description: 'A representative application and its build manifests.' },
    { id: 'application', title: 'Multi-repository application', description: 'Several services with their infrastructure and dependency manifests.' },
    { id: 'portfolio', title: 'Application portfolio', description: 'A prioritized set of applications and shared libraries.' },
    { id: 'restricted', title: 'Restricted source enclave', description: 'Sensitive code that must stay inside its own boundary.' },
  ] },
  { id: 'response', eyebrow: '07 · RESPONSE', question: 'How far should SOAR go during the PoC?', context: 'Investigation and proposals are distinct from execution. Any state-changing path needs separate authority and verification.', options: [
    { id: 'investigate', title: 'Investigate only', description: 'Correlate evidence, explain reasoning, and hand off a case.' },
    { id: 'rehearse', title: 'Investigate and rehearse', description: 'Test assumptions and consequences in a model, replay, or range.' },
    { id: 'lab', title: 'Governed lab response', description: 'Exercise approval, expiry, rollback, and verification in a controlled target.' },
    { id: 'adapter', title: 'Approved response adapter', description: 'Evaluate one separately authorized customer action path.' },
  ] },
  { id: 'users', eyebrow: '08 · OPERATIONS', question: 'How many people will use the platform at the same time?', context: 'Include analysts, application reviewers, service owners, administrators, and observers who are active at once.', options: [
    { id: 'two', title: '1–2 people', description: 'Facilitated evaluation with a small core team.' },
    { id: 'five', title: '3–5 people', description: 'Cross-functional PoC team.' },
    { id: 'ten', title: '6–10 people', description: 'Multiple review and investigation workstreams.' },
    { id: 'more', title: 'More than 10', description: 'Parallel teams that need a concurrency benchmark.' },
  ] },
  { id: 'inference', eyebrow: '09 · INFERENCE', question: 'Where is AI-assisted reasoning allowed to run?', context: 'The architecture keeps deterministic evidence and human authority independent of wherever the model runs.', options: [
    { id: 'external', title: 'Approved external model', description: 'An approved provider may receive context after policy filtering.' },
    { id: 'local', title: 'Local single model', description: 'One on-premises inference runtime for the PoC.' },
    { id: 'dual', title: 'Local dual-model', description: 'Primary and specialist models with separate capacity.' },
    { id: 'offline', title: 'Offline local models', description: 'Models, weights, updates, and intelligence stay inside the boundary.' },
  ] },
  { id: 'retention', eyebrow: '10 · EVIDENCE', question: 'How long should PoC evidence stay available?', context: 'The estimate covers indexes, audit records, snapshots, reports, and local collector buffers, with room to spare.', options: [
    { id: 'seven', title: '7 days', description: 'Short, tightly managed evaluation.' },
    { id: 'thirty', title: '30 days', description: 'Typical four-week PoC and closeout.' },
    { id: 'ninety', title: '90 days', description: 'Extended evaluation and comparison window.' },
    { id: 'year', title: '365 days', description: 'Long-running pilot with formal retention controls.' },
  ] },
] as const satisfies readonly PlannerQuestion[];

const zoneCounts = { one: 1, three: 3, six: 6, twelve: 12 } as const;
const assetCounts = { small: 500, medium: 2500, large: 10000, xlarge: 25000 } as const;
const retentionDays = { seven: 7, thirty: 30, ninety: 90, year: 365 } as const;
const estateLabels = { it: 'Enterprise IT estate', ot: 'Operational technology estate', cloud: 'Cloud and SaaS estate', hybrid: 'Hybrid IT, OT, cloud and edge estate' } as const;
const collectionLabels = { import: 'Approved imports only', passive: 'Passive network evidence', cautious: 'Bounded active discovery', combined: 'Imports, passive and approved discovery' } as const;
const connectivityLabels = { private: 'Private routed connectivity', outbound: 'Outbound-only TLS 443', window: 'Controlled transfer window', airgap: 'Fully offline signed transfer' } as const;
const sourceLabels = { repo: 'One repository', application: 'One application', portfolio: 'Application portfolio', restricted: 'Restricted source enclave' } as const;
const responseLabels = { investigate: 'Investigate and hand off', rehearse: 'Investigate and rehearse', lab: 'Governed lab execution', adapter: 'Approved production adapter' } as const;
const inferenceLabels = { external: 'Approved external gateway', local: 'One local inference runtime', dual: 'Dual local inference runtimes', offline: 'Offline local inference' } as const;
const environmentPlans = {
  it: 'Place collectors at representative campus, data-center, identity, endpoint, and cloud egress boundaries.',
  ot: 'Use passive-first collectors at OT visibility points; separate safety-sensitive zones and approve every active method.',
  cloud: 'Combine cloud control-plane/API evidence with DMZ or ingress visibility; preserve account, region, and tenancy boundaries.',
  hybrid: 'Use separate IT, OT, cloud, and edge vantage points, then reconcile shared-service identities without collapsing ownership.',
} as const;
const connectivityPlans = {
  private: 'Private routed mTLS between collectors and the customer-controlled platform; approved outbound services may use an egress gateway.',
  outbound: 'Collector-initiated mTLS over TCP 443 only; no inbound session from the platform into collection zones.',
  window: 'Signed offline transfer during a controlled update window; record media custody, import receipt, and version state.',
  airgap: 'Fully offline signed package transfer with an internal mirror for software, models, intelligence, and revocation material.',
} as const;
const collectionPlans = {
  import: 'Approved inventory, controller, configuration, and API imports; no collector-initiated device probing.',
  passive: 'SPAN/TAP or approved packet import; raw capture stays local and only approved evidence leaves the collector.',
  cautious: 'Bounded identity discovery under signed scope, allowlist, time window, rate limit, stop condition, and operator approval.',
  combined: 'Reconcile imports, passive observations, and approved discovery while preserving the origin and freshness of each claim.',
} as const;
const sourcePlans = {
  repo: 'One immutable repository snapshot with read-only mounts and one ephemeral analysis worker.',
  application: 'A manifest binds several service and infrastructure repositories; two workers preserve per-repository evidence identity.',
  portfolio: 'A prioritized application queue uses four isolated workers, per-application ownership, quotas, and independent closeout records.',
  restricted: 'Source remains inside a restricted enclave with a dedicated worker, deny-by-default egress, and approved evidence export only.',
} as const;
const responsePlans = {
  investigate: 'Investigation and accountable handoff only; no rehearsal or state-changing customer action.',
  rehearse: 'Investigation plus replay, model, or controlled-range rehearsal; modeled consequences remain distinct from observed effects.',
  lab: 'A governed lab execution plane exercises exact target, approval, expiry, rollback, stop, and fresh verification controls.',
  adapter: 'One customer-approved production adapter is isolated behind exact action policy, named authority, breaker, recovery, and fresh verification.',
} as const;
const inferencePlans = {
  external: 'Approved external model gateway with policy-filtered context, egress allowlist, data terms, request audit, and deterministic checks.',
  local: 'One local inference runtime with pinned model weights, capacity telemetry, model inventory, and a controlled update path.',
  dual: 'Two local inference runtimes separate primary and specialist workloads, with independent model identity and capacity telemetry.',
  offline: 'Offline local inference with internally mirrored weights, software, intelligence, revocation material, and signed update custody.',
} as const;

export function createRecommendation(answers: AnswerMap) {
  validateAnswers(plannerQuestions, answers);
  if (['airgap', 'window'].includes(answers.connectivity) && answers.inference === 'external') throw new Error('Isolated operation cannot use external inference. Choose a local or offline model.');
  const collectors = zoneCounts[answers.networks as keyof typeof zoneCounts] ?? 1;
  const assets = assetCounts[answers.assets as keyof typeof assetCounts] ?? 500;
  const days = retentionDays[answers.retention as keyof typeof retentionDays] ?? 30;
  const userBoost = answers.users === 'more' ? 16 : answers.users === 'ten' ? 8 : answers.users === 'five' ? 4 : 0;
  const scaleBoost = assets > 10000 ? 32 : assets > 2500 ? 16 : assets > 500 ? 8 : 0;
  const centralCores = 16 + scaleBoost + userBoost;
  const centralRam = centralCores >= 56 ? 256 : centralCores >= 40 ? 192 : centralCores >= 28 ? 128 : 96;
  const gpuCount = answers.inference === 'external' ? 0 : answers.inference === 'local' ? 1 : 2;
  const repoFactor = answers.source === 'portfolio' ? 3 : answers.source === 'application' || answers.source === 'restricted' ? 2 : 1;
  const dataTb = Math.max(2, Math.ceil((assets / 2500) * (days / 30) * 1.25 + repoFactor));
  const usableStorageTb = dataTb <= 4 ? 4 : dataTb <= 8 ? 8 : dataTb <= 16 ? 16 : Math.ceil(dataTb / 8) * 8;
  const collectorCores = assets / collectors > 5000 ? 16 : assets / collectors > 1500 ? 12 : 8;
  const collectorRam = collectorCores >= 16 ? 64 : collectorCores >= 12 ? 48 : 32;
  const ot = answers.estate === 'ot' || answers.estate === 'hybrid';
  const active = answers.collection === 'cautious' || answers.collection === 'combined';
  const action = answers.response === 'adapter' || answers.response === 'lab';
  const isolated = answers.connectivity === 'airgap' || answers.connectivity === 'window';
  const sourceWorkers = answers.source === 'portfolio' ? 4 : answers.source === 'application' ? 2 : 1;
  const networkLabel = answers.networks === 'twelve' ? '12+ zones' : `${collectors} zone${collectors === 1 ? '' : 's'}`;
  return {
    generatedAt: new Date().toISOString(),
    status: 'Design target: validate with discovery and measured PoC telemetry',
    summary: `${networkLabel}, ${answers.assets === 'xlarge' ? 'more than 10,000 assets (25,000 sizing proxy)' : 'up to ' + assets.toLocaleString('en-US') + ' assets'}, ${days}-day evidence retention, ${gpuCount ? 'local' : 'approved external'} inference`,
    collectors, networkLabel,
    estateLabel: estateLabels[answers.estate as keyof typeof estateLabels] ?? estateLabels.it,
    assetsLabel: answers.assets === 'xlarge' ? 'More than 10,000 assets (25,000 sizing proxy; not a limit)' : `Up to ${assets.toLocaleString('en-US')} assets`,
    retentionLabel: `${days}-day evidence`,
    collectionLabel: collectionLabels[answers.collection as keyof typeof collectionLabels] ?? collectionLabels.import,
    connectivityLabel: connectivityLabels[answers.connectivity as keyof typeof connectivityLabels] ?? connectivityLabels.private,
    sourceLabel: sourceLabels[answers.source as keyof typeof sourceLabels] ?? sourceLabels.repo,
    responseLabel: responseLabels[answers.response as keyof typeof responseLabels] ?? responseLabels.investigate,
    inferenceLabel: inferenceLabels[answers.inference as keyof typeof inferenceLabels] ?? inferenceLabels.external,
    central: { cpu: `${centralCores} physical cores`, memory: `${centralRam} GB ECC RAM`, storage: `${usableStorageTb} TB usable NVMe/enterprise SSD with redundancy`, gpu: gpuCount ? `${gpuCount} × 48 GB data-center GPU` : 'No local inference GPU required', network: collectors >= 6 || assets > 10000 ? 'Dual 25 GbE data + separate management' : 'Dual 10 GbE data + separate management' },
    collector: { count: collectors, cpu: `${collectorCores} physical cores each`, memory: `${collectorRam} GB ECC RAM each`, storage: days >= 90 || answers.connectivity === 'airgap' ? '2 × 3.84 TB SSD, RAID 1' : '2 × 1.92 TB SSD, RAID 1', network: 'Dual 10 GbE where passive capture is used; separate management recommended' },
    sourceWorkers,
    environmentPlan: environmentPlans[answers.estate as keyof typeof environmentPlans] ?? environmentPlans.it,
    flow: connectivityPlans[answers.connectivity as keyof typeof connectivityPlans] ?? connectivityPlans.private,
    collectionMode: `${ot && !active ? 'OT passive-first. ' : ''}${collectionPlans[answers.collection as keyof typeof collectionPlans] ?? collectionPlans.import}`,
    sourcePlan: sourcePlans[answers.source as keyof typeof sourcePlans] ?? sourcePlans.repo,
    responseMode: responsePlans[answers.response as keyof typeof responsePlans] ?? responsePlans.investigate,
    inferencePlan: inferencePlans[answers.inference as keyof typeof inferencePlans] ?? inferencePlans.external,
    software: [
      { owner: 'customer', label: 'Host operating system', text: 'A hardened Linux host, such as Ubuntu Server 24.04 LTS or a customer-approved equivalent, with Secure Boot and a TPM where available.', ref: { label: 'Ubuntu LTS lifecycle', href: 'https://ubuntu.com/about/release-cycle' } },
      { owner: 'customer', label: 'Container / VM platform', text: 'A rootless Docker or Podman platform, or dedicated virtual machines. Agree pinned artifacts and approved update sources with engineering before installation.' },
      { owner: 'customer', label: 'Identity and access', text: 'Your identity provider (SSO) with MFA, role mapping, a privileged-access (PAM) approval workflow, and a documented break-glass procedure.' },
      { owner: 'customer', label: 'Crypto-agile PKI and trust', text: 'A PKI that issues TLS/mTLS certificates and can adopt hybrid or post-quantum algorithms, plus DNS, trusted time (NTP), an internal artifact/update mirror, and a secrets manager.', ref: { label: 'NIST post-quantum standards', href: 'https://csrc.nist.gov/projects/post-quantum-cryptography' } },
      { owner: 'customer', label: 'Operations and recovery', text: 'A SIEM endpoint to receive the append-only audit export, an encrypted backup target, and a window to run a restore test.' },
      { owner: answers.inference === 'external' ? 'customer' : 'vendor', label: 'Inference runtime', text: inferencePlans[answers.inference as keyof typeof inferencePlans] ?? inferencePlans.external },
      { owner: 'vendor', label: 'Secure platform', text: `Evaluate Secure discovery with ${collectors}${answers.networks === 'twelve' ? '+' : ''} collection point${collectors === 1 ? '' : 's'} as a placement starting point, not a coverage guarantee. Validate collector credentials and cryptography inventory coverage.`, ref: { label: 'What Secure does', href: '/products/' } },
      { owner: 'vendor', label: 'Assure platform', text: `The Assure control service plus ${sourceWorkers} isolated, read-only source-analysis worker${sourceWorkers === 1 ? '' : 's'} with deny-by-default egress. Assure reports the PQC readiness of the source it reviews.`, ref: { label: 'What Assure does', href: '/products/' } },
      { owner: 'vendor', label: 'Agentic SOAR', text: responsePlans[answers.response as keyof typeof responsePlans] },
      { owner: 'vendor', label: 'Installation and support', text: 'Breakwater installs and configures the platform from signed artifacts, provides updates through your mirror, and supports the PoC through to acceptance.' },
    ] as { owner: 'customer' | 'vendor'; label: string; text: string; ref?: { label: string; href: string } }[],
    controls: [
      { control: 'Name the owner, scope, success thresholds and stop conditions before anything is installed.', defends: 'Removes any later dispute over what was authorized or what “success” was supposed to mean.' },
      { control: 'Require collector-initiated connections and deny inbound access into collection zones.', defends: 'Validate this boundary to reduce pivot risk; the planner has not tested your network.' },
      { control: 'Require local raw-capture retention and review approved, redacted evidence exports.', defends: 'Test redaction and custody controls before exporting any sensitive payload.' },
      { control: 'Treat source as hostile input: read-only snapshots, isolated workers, bounded archives, deny-by-default egress.', defends: 'Verify code-execution and exfiltration defenses in the selected configuration; this is an acceptance requirement, not a guarantee.' },
      { control: 'Keep observed, imported, inferred, simulated, proposed, approved, executed and verified states distinct.', defends: 'Prevents a model’s inference from ever being mistaken for a measured fact.' },
      { control: 'A recommendation never grants authority. A named human owns every acceptance or action.', defends: 'Lets automation propose while a person stays accountable for every production change.' },
      { control: 'Exercise backup/restore, collector loss, stale evidence, rollback and revocation during the PoC.', defends: 'Proves the failure modes actually work before anyone depends on the system.' },
    ],
    caveats: [
      'Sizing is an engineering design target, not a measured minimum or performance guarantee.',
      'Collector count follows security and visibility boundaries; routing alone does not prove one vantage point is sufficient.',
      'Assure customer-source use requires explicit authorization and deployment readiness review.',
      'SOAR does not actuate production systems unless a separately approved adapter and action policy are configured and tested.',
      'The three products exchange only named, validated records; the planner does not assume an automatic cross-product pipeline.',
    ],
    customerControls: [
      'Enforce your identity provider with MFA and a privileged-access (PAM) approval workflow for every console session.',
      'Issue and rotate all TLS/mTLS certificates from your PKI, and own DNS and trusted time (NTP).',
      ...(answers.collection === 'passive' || answers.collection === 'combined' ? ['Provide SPAN/TAP or mirrored traffic at each collection vantage point.'] : []),
      ...(ot ? ['Segment OT and safety-sensitive zones, and approve every active method before it runs.'] : []),
      ...(answers.connectivity === 'airgap' || answers.connectivity === 'window' ? ['Own the signed offline-media transfer, custody log, and update-window approvals.'] : []),
      'Produce and authorize the immutable source snapshot for Assure. Agree how it is transferred and retained.',
      ...(action ? ['Name the change owner and approve the exact response action policy, scope, expiry and rollback.'] : []),
      'Provide the SIEM endpoint and encrypted backup target, and schedule the restore test.',
    ],
    threatModel: [
      { element: 'Collector → gateway (data flow)', s: isolated ? 'Signed package identity and custody review' : 'Mutually-authenticated mTLS identity', t: 'Signed, schema-validated evidence', r: 'Append-only signed transfer receipts', i: 'Redaction; raw capture stays local', d: isolated ? 'Bounded offline import; custody checks' : 'Rate limits; collector-initiated only', e: 'Per-collector scoped credentials' },
      { element: 'Evidence ingress (process)', s: isolated ? 'Offline package signature and authorization' : 'mTLS client identity', t: 'Schema + signature validation', r: 'Immutable ingest log', i: 'No inbound path into zones', d: 'Rate limits + quotas', e: 'No lateral route to collectors' },
      { element: 'Product services (process)', s: 'IdP/SSO + service identity', t: 'Typed evidence lattice + verifier', r: 'Attributable decision records', i: 'Per-tenant isolation', d: 'Capacity telemetry + backpressure', e: 'RBAC/ABAC; separation of duties' },
      { element: 'Evidence & audit store (data store)', s: 'Not specified', t: 'Append-only, hashed records', r: 'Immutable audit trail', i: 'Encryption at rest; customer custody', d: 'Backup + tested restore', e: 'Not specified' },
      ...(action ? [{ element: 'Response adapter (process)', s: 'Named authority + policy', t: 'Allowlisted exact action', r: 'Signed approval + receipt', i: 'Scoped to approved target', d: 'Circuit breaker + rate limit', e: 'Expiry, rollback, fresh verification' }] : []),
      { element: 'Operator / authority (entity)', s: 'MFA + PAM', t: 'Not specified', r: 'Per-user audit', i: 'Role-scoped views', d: 'Not specified', e: 'Break-glass is logged and bounded' },
    ],
    sequences: [
      { product: 'Secure', accent: 'secure', actors: ['Operator', 'Collector', 'Ingress', 'Secure', 'Store'], steps: [['Operator', 'Collector', 'Authorize scope, ROE, allowlist'], ['Collector', 'Ingress', isolated ? 'Signed offline package transfer with custody receipt' : 'Signed mTLS upload (collector-initiated)'], ['Ingress', 'Secure', 'Validated evidence'], ['Secure', 'Store', 'Named record + CBOM'], ['Secure', 'Operator', 'Exposure, attack paths, PQC readiness']] },
      { product: 'Assure', accent: 'assure', actors: ['Operator', 'Assure', 'Worker', 'Store'], steps: [['Operator', 'Assure', 'Submit authorized hash-bound source snapshot'], ['Assure', 'Worker', 'Read-only mount; deny-by-default egress'], ['Worker', 'Assure', 'Findings with exact-source provenance'], ['Assure', 'Store', 'Independently validated finding'], ['Assure', 'Operator', 'Finding report + source PQC readiness']] },
      { product: 'SOAR', accent: 'soar', actors: action ? ['Store', 'SOAR', 'Authority', 'Adapter', answers.response === 'lab' ? 'Lab target' : 'Approved target'] : ['Store', 'SOAR', 'Reviewer'], steps: action ? [['Store', 'SOAR', 'Typed evidence'], ['SOAR', 'Authority', 'Proposed action (evidence-bound)'], ['Authority', 'SOAR', 'Approval: exact scope, expiry, rollback'], ['SOAR', 'Adapter', 'Governed action'], ['Adapter', answers.response === 'lab' ? 'Lab target' : 'Approved target', 'Execute only within the separately approved scope'], ['Adapter', 'SOAR', 'Fresh verification / recovery']] : [['Store', 'SOAR', 'Typed evidence'], ['SOAR', 'Reviewer', answers.response === 'rehearse' ? 'Rehearsal proposal in a model or controlled range; no customer action' : 'Investigation and accountable handoff; no execution']] },
    ],
    assessment: [
      answers.inference === 'external' ? 'External inference may receive approved context. Confirm provider terms and egress policy.' : 'Design target: processing and evidence remain within the approved customer boundary.',
      'Validate the collector egress policy, redaction and permitted exports in the selected configuration before data leaves its custody boundary.',
      'Human authority: automation proposes; a named person approves every production change.',
      'Acceptance target: exercise backup, collector loss, rollback and revocation during the PoC; this planner has not tested them.',
    ],
    answers,
  };
}
