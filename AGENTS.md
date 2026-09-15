# Repository Guidelines

## Repository Boundaries
This repository, `BreakwaterAI/bwtr.ai`, is the public marketing website repository for `bwtr.ai`.
It is intentionally separate from the Breakwater product/platform repository.

Product source, dashboard, API, customer installers, Docker assets, licensing code, and product
documentation live in:

- Product repo: `https://github.com/gwuml/proscanx`

Do not add platform source, private operational docs, customer installer secrets, Docker build
contexts, production app code, or license-server code to this repository. If the user asks for
product changes, dashboard fixes, API work, Docker tags/images, installer changes, or production
`app.bwtr.ai` changes, work in `gwuml/proscanx` instead.

## Hosting Model
The public website is hosted on AWS:

- `bwtr.ai` and `www.bwtr.ai` -> Route 53 -> CloudFront -> private S3 bucket
- S3 bucket: `bwtr-ai-site-prod`
- CloudFront distribution ID: `E2M3MM3HR6HAUB`
- CloudFront domain: `d8xidtpdsz0p0.cloudfront.net`

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
- `styles.css`
- `.github/workflows/deploy-aws.yml`
- `infra/cloudformation/static-site.yml`
- `infra/cloudformation/github-oidc-provider.yml`
- `infra/cloudformation/github-deploy-role.yml`

Preview locally with:

```bash
python3 -m http.server 4177
```

## Deployment
Deployment is through GitHub Actions using AWS OIDC. Required repo configuration:

- Variable `AWS_REGION=us-east-1`
- Variable `AWS_S3_BUCKET=bwtr-ai-site-prod`
- Variable `AWS_CLOUDFRONT_DISTRIBUTION_ID=E2M3MM3HR6HAUB`
- Secret `AWS_ROLE_TO_ASSUME=<deploy role ARN>`

Manual deploy fallback from AWS CloudShell:

```bash
artifact_root="$(mktemp -d)"
bash scripts/build-site-artifact.sh "${artifact_root}/site"
aws s3 sync "${artifact_root}/site" s3://bwtr-ai-site-prod \
  --delete \
  --exclude "assets/videos/*"
aws cloudfront create-invalidation \
  --distribution-id E2M3MM3HR6HAUB \
  --paths "/*"
```

Large media assets are intentionally stored directly in S3, not in git. Preserve the
`assets/videos/*` exclusion whenever deploying with `--delete`; otherwise S3-only product demo
videos will be removed from the bucket.

## Lead Capture Form
The static form in `index.html` submits through `script.js` to a Google Apps Script Web App.
The Apps Script template lives at `google-apps-script/Code.gs` and appends rows to a Google
Sheet named `Leads`.

Do not add a backend service just for this form unless the user explicitly asks for one.
The deployed Apps Script URL is the `FORM_ENDPOINT` fallback in `script.js`; it can also be
overridden by setting `window.BREAKWATER_FORM_ENDPOINT` before `script.js` loads.

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
