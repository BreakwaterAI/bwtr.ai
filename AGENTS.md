# Repository Guidelines

## Repository Boundaries
This repository, `BreakwaterAI/bwtr.ai`, is the public marketing website repository for `bwtr.ai`.
It is intentionally separate from the Breakwater product/platform repository.

Use Breakwater-owned organization resources for release work. The marketing git
remote must remain `https://github.com/BreakwaterAI/bwtr.ai.git`; do not push to a
legacy personal repository. AWS calls must explicitly select `breakwater-prod`
and verify account `506126099258` (or use the validated GitHub OIDC role). Do not
fall back to the legacy `breakwater` or `default` profile when authentication fails.
Verify organization ownership of third-party release dependencies, including the
Apps Script deployment and Leads spreadsheet, rather than inferring it from an
existing public URL. Never print credentials or change service ownership without
separate authorization.

Historical owner-approved exception (September 20, 2026): the redesign initially
could retain the legacy lead endpoint while ownership was unresolved. The later
replacement setup and release approval below supersede that endpoint deferral;
they do not authorize unrelated ownership changes or additional real submissions.

Subsequent September 20 preparation: a replacement Leads sheet is verified as owned
by `nagu@bwtr.ai`, and the new endpoint in `site-release.json` passed an
owner-authorized anonymous POST and exact sheet-row readback (including timestamp
and user agent). The approved release switches the website to that endpoint.
A separate owner-authorized real
browser submission on September 20 was read back in row 4 of the new Leads sheet.
This verifies browser delivery, not independently the deployment owner's identity.
Retain the old deployment and sheet for rollback; do not delete or migrate leads
as an incidental deployment step.

Product source, dashboard, API, customer installers, Docker assets, licensing code, and product
documentation live in:

- Secure: `https://github.com/BreakwaterAI/bwtr`
- Assure: `https://github.com/BreakwaterAI/assure`
- SOAR: `https://github.com/BreakwaterAI/soar`

Do not add platform source, private operational docs, customer installer secrets, Docker build
contexts, production app code, or license-server code to this repository. If the user asks for
product changes, dashboard fixes, API work, Docker tags/images, or installer changes, work in
the corresponding product repository above. Legacy ProscanX v1 and course materials remain
separate; confirm the owning codebase before changing legacy `app.bwtr.ai` services.

## Hosting Model
The public website is hosted on AWS:

- `bwtr.ai` and `www.bwtr.ai` -> Route 53 -> CloudFront -> private S3 bucket
- AWS account: `506126099258`
- S3 bucket: `bwtr-ai-site-prod-506126099258`
- CloudFront distribution ID: `E173Y881SRDFT0`
- CloudFront domain: `d363eyllse1zcb.cloudfront.net`

These are the current GitHub Actions targets, confirmed by the site owner on
September 20, 2026. The earlier unsuffixed bucket and `E2M3MM3HR6HAUB` distribution
are not this release's deployment target. Do not change DNS or product subdomains.

Do not move this site to GitHub Pages unless the user explicitly changes the hosting strategy.
The old GitHub Pages `CNAME` workflow was removed intentionally.

## Safe DNS Scope
Only the exact records `bwtr.ai` and `www.bwtr.ai` belong to this marketing site.
Do not change these production subdomains from this repository:

- `app.bwtr.ai`
- `install.bwtr.ai`
- `license.bwtr.ai`

## Brand Lock

Read `BRAND.md` and `brand-contract.json` before changing website styling, colors, logos, or visual
assets. The canonical website colors are locked to Vantablack `#000100` and Breakwater Red
`#F0443E`. Do not change those values, add a new brand accent, recolor logo artwork, or expand the
approved color inventory without explicit user approval. A failing brand-contract test is a release
blocker; do not weaken the test or its allowlist to bypass the contract.

## Development
This is a static site. The main files are:

- `index.html`
- `products/index.html`, `platform/index.html`, `research/index.html`, `about/index.html`, and
  `security/index.html`
- `404.html`
- `assets/site-ui/` (content-addressed CSS, JavaScript and favicon)
- `assets/product-proof/` (approved product captures and optimized brand artwork)
- `site-release.json` (source-only exact public-file and media inventory)
- `.github/workflows/deploy-aws.yml`
- `infra/cloudformation/static-site.yml`
- `infra/cloudformation/github-oidc-provider.yml`
- `infra/cloudformation/github-deploy-role.yml`

Preview locally with:

```bash
bash scripts/build-site-artifact.sh /tmp/bwtr-NEW-preview/site
node scripts/serve-public-site.mjs /tmp/bwtr-NEW-preview/site
```

Keep the local website on **http://localhost:4177/**. Do not introduce alternate
preview ports. Serve only the built public artifact, not the repository root, for
release verification. Verify existing listeners belong to this repository before
replacing them. Browser tests intercept form submissions; never send a real test
inquiry without specific owner approval.

## Deployment
Deployment is through GitHub Actions using AWS OIDC. Required repo configuration:

- Variable `AWS_REGION=us-east-1`
- Variable `DEPLOY_TARGET=production`
- Variable `AWS_ACCOUNT_ID=506126099258`
- Variable `AWS_S3_BUCKET=bwtr-ai-site-prod-506126099258`
- Variable `AWS_CLOUDFRONT_DISTRIBUTION_ID=E173Y881SRDFT0`
- Variable `AWS_CLOUDFRONT_DOMAIN=d363eyllse1zcb.cloudfront.net`
- Variable `SITE_BASE_URL=https://www.bwtr.ai`
- Variable `AWS_ACM_CERTIFICATE_ARN=<validated production certificate ARN>`
- Variable `AWS_OIDC_SUBJECT=repo:BreakwaterAI@323852433/bwtr.ai@1234382108:ref:refs/heads/main`
- Secret `AWS_ROLE_TO_ASSUME=<deploy role ARN>`

Pushing `main` automatically starts production deployment. Preparing a candidate
or a commit does not authorize a push/deploy. Verify the current variables and
deployment guards before release; do not infer AWS authority from a local profile.

If an explicitly authorized operator fallback is needed, use the guarded entrypoint
instead of a raw S3 sync. It validates account/distribution, requires a clean main
branch matching origin/main, snapshots the current site and rolls back on failure:

```bash
AWS_PROFILE=breakwater-prod deploy/aws/deploy.sh check production
# Only after explicit production approval:
AWS_PROFILE=breakwater-prod deploy/aws/deploy.sh publish production --confirm-production
```

Large media assets are intentionally stored directly in S3, not in git. Keep
`assets/videos/*` excluded from standard publication and rollback. Provision new
approved clips separately and verify their hashes/MIME/range responses before a
page references them. Retain superseded objects through the release soak window;
do not replace the guarded publisher with a destructive `--delete` sync.

Build production with `bash scripts/build-site-artifact.sh NEW_DIRECTORY`. It
copies exactly the hash-verified public files in `site-release.json`; videos are
provisioned separately. Never upload review evidence, internal release manifests,
repository/planning documents, or the `redesign-preview/` working directory.
See `RELEASE.md` for the approved release boundary and verification procedure.

## Lead Capture Form
The static form in `index.html` submits through the hashed `lead-form.js` resource
listed in `site-release.json` to a Google Apps Script Web App. The active template
is `google-apps-script/org-owned/Code.gs` and appends the unchanged 14-column schema
to the organization-owned `Leads` sheet. The root `script.js` and original
`google-apps-script/Code.gs` are legacy source, not part of the redesigned artifact.

Do not add a backend service just for this form unless the user explicitly asks for one.
The active endpoint is pinned in `site-release.json` and the hashed form adapter.
Keep both consistent. An opaque browser response is not proof of sheet delivery.
Preserve the existing deployment/sheet for rollback; never delete historical leads.

## Validation
For content-only changes, at minimum run:

```bash
git diff --check
```

For any styling, asset, or design change, also run:

```bash
node scripts/test-brand-contract.mjs
node scripts/test-positioning.mjs
node scripts/test-rendered-layout.mjs
```

For deployment changes, validate the affected workflow/template and test both:

```bash
curl -I https://bwtr.ai
curl -I https://www.bwtr.ai
```
