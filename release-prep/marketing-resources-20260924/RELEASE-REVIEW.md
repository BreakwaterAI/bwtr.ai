# Marketing resources release candidate

September 24, 2026. **Ready for owner release approval; not published.**

Subsequent owner decision: **approved for release** by "go ahead" in response to
the explicit candidate/routing/main-push request. The approval is recorded in
`publication-approval.json`; the pending record below is retained as historical
review evidence. Deployment outcome is recorded separately after verification.

Review: http://localhost:4177/ (same port). Public artifact:
`/tmp/bwtr-marketing-resources-rc1/public`.

## Exact candidate

- 121 inventoried public files, plus the generated public asset manifest.
- Manifest SHA-256: `97c3d9b446bd88581dd590ea394af8fa3030884195239b52e772b2c78f804c48`.
- Source baseline and current GitHub main: `2a56061340e40b793870818bd6fb41c9824d97c7`.
- `approval-pending.json` pins the public manifest and implementation inputs.
  Its publication flag deliberately remains false. It is not an approval receipt.
- The previous logo publication approval remains unchanged; it does not approve
  these new pages. Default production checks remain closed until the owner
  approves the candidate and a new source-bound approval is recorded.

## Included

The reader hub, eleven public v05-branded PDFs, 38 chapter outcomes and both
ten-question planners, including results, exports, explicit sharing and local
review checklists. Protected full books remain sign-in links, not public files.

Evaluate navigation appears across all fifteen HTML documents. Home, Products,
Architecture and Research have separate resource cards before contact. PQC has
no standalone primary-nav item or homepage hero treatment. Singular/plural
collector grammar is corrected in both rendered specifications and model copy.

The previously separate corrections are now in this candidate:

- Secure, Assure and SOAR each have a public product-website link on Products.
- Assure console points to `https://assure.bwtr.ai/app/login`.
- Utility hero and homepage thumbnail hide the source photograph's thin edges.
- Architecture no longer sends readers to outdated ASOC. It offers a discussion
  of deployment requirements and preserves the reference-design qualifications.

No complete preview rebuild was promoted. Changes were applied narrowly to the
existing production-shaped pages. Source templates retain the corrections on
rebuild. Existing brand artwork, palette, lead endpoint, social cards and videos
are unchanged. No inquiry was sent, no product authentication was altered, and
ASOC hosting/DNS remains untouched.

## Verification on this candidate

- 175 planner/navigation/browser checks, both themes, 320 through 1440 CSS pixels.
  Includes product-site and console links, both image crops, all primary-nav
  states, questionnaire/results flows, keyboard operation and export behavior.
  Zero external requests, JavaScript exceptions or real form submissions in this suite.
- Full-site suite: 155 checks; all 39 cold-cache budgets pass. Twelve form requests
  were intercepted, zero sent. Evidence: `/tmp/bwtr-release-checks-3CjLNf`.
- Eight model/security tests, including collector grammar and publication refusal.
- 178 canonical/metadata checks; source and built-artifact brand checks pass.
- Exact artifact inventory and hashes pass. No internal reports, old asset
  revisions, private briefs or product source are packaged.
- Nine offline lead-adapter checks, seven AWS target-guard tests, snapshot
  dependency validation, publisher success/failure/rollback simulation and
  deploy-entrypoint refusal tests pass.
- Both existing public videos verified by full hash, length, MIME and byte ranges.
- AWS CloudFormation template validation passes. The proposed routing function
  differs from the observed live function only by the three new route names.
- Desktop/mobile crop screenshots inspected; planner/card/theme visual evidence
  is in `/tmp/bwtr-planner-browser-20260924`.

The rollback test fixtures initially omitted the new page-specific stylesheet.
Both fixtures now copy every hashed Architecture dependency as well as the five
shared aliases; missing/corrupt dependency rejection is preserved. The production
rollback validator was not weakened. Run publisher simulations without the
local-candidate environment variable, since that flag correctly refuses all
publication entrypoints, including simulations that invoke the publisher.

## Required routing step: do not skip

Read-only checks confirmed organization account `506126099258`, GitHub main and
deployment variables, bucket `bwtr-ai-site-prod-506126099258`, distribution
`E173Y881SRDFT0`, and live function
`bwtr-ai-static-site-preview-canonical-urls`.

The current live function does **not** recognize `/reader-pack/`, `/poc-planner/`
or `/pqc-planner/`. Uploading HTML alone cannot make these S3-backed directory
URLs work. Merely committing `infra/cloudformation/static-site.yml` does not
apply its changes through the current content-deployment workflow.

`routing-before.js` records observed live code (ETag `E3UN6WX5RRO2AG`).
`routing-candidate.js` is extracted from the updated template. Neither has been
applied. The workflow now refuses content publication unless the three slashless
URLs already redirect to their canonical trailing-slash URLs. Existing page,
query-string and apex redirects remain covered by the canonical tests.

After explicit approval:

1. Re-check source hashes, GitHub main, AWS ownership and live routing for drift.
   Obtain fresh stage-specific ETags; do not reuse this review's ETag for writes.
2. Retain routing and content rollback snapshots. Apply only the reviewed
   three-route addition to this marketing function using the authorized
   infrastructure process. Do not change distribution origins, DNS or subdomains.
3. Verify the new canonical redirects, existing routes, queries and apex behavior.
   New page bodies become available after content upload; do not advertise them
   from production before that upload. If publication is abandoned, restore the
   routing snapshot as appropriate. The content publisher does not restore edge code.
4. Record explicit publication approval tied to this manifest, wire that receipt
   into the production approval gate, and rerun normal CI without candidate mode.
5. Commit the reviewed scope to main and push only with publication authority.
   That push automatically deploys. Include current inventoried assets, planner
   sources, tests and routing changes; exclude superseded untracked assets and
   unrelated local reports/preview experiments.
6. Watch Actions through live smoke verification. Confirm all three pages, eleven
   PDFs, canonical paths, product links, crop presentation, both themes, media,
   platform redirect and unknown-path 404. No new real lead submission is needed.
7. Keep the prior content and routing snapshots through the soak period.
   Decommissioning ASOC is a separate, authorized follow-up after migration works.

## Owner decision requested

Approve this exact candidate for public release, commit/push to organization main,
and the three-route marketing CloudFront change. The independent review in the
conversation is recorded as design acceptance, not silently converted into
production or infrastructure authorization. No new manual Safari/device/
screen-reader completion is claimed by these automated checks.
