# bwtr.ai Static Site

This repository contains the public multi-page company and product marketing site for `bwtr.ai`.
It is intentionally separate from the Breakwater platform source repository.

## Hosting Model

Production hosting should stay in AWS, consistent with the rest of Breakwater's public infrastructure:

- `bwtr.ai` and `www.bwtr.ai` -> Route 53 -> CloudFront -> private S3 bucket
- `app.bwtr.ai` remains on the production application infrastructure
- `install.bwtr.ai` remains on the installer CloudFront/S3 infrastructure
- `license.bwtr.ai` remains on the license CloudFront/Lambda infrastructure

## Repository Deployment

The GitHub Actions workflow at `.github/workflows/deploy-aws.yml` deploys this static site to AWS by:

1. Assuming an AWS IAM role through GitHub OIDC.
2. Building an explicit public-site artifact that contains no repository operations files.
3. Publishing that artifact to S3 while preserving S3-only product-demo videos and prior
   content-addressed assets through the release soak window.
4. Invalidating the CloudFront distribution.

Large product-demo videos are stored directly in S3 under `assets/videos/` and are intentionally
not committed to this repository. The deploy workflow excludes that prefix from content uploads.
It does not delete superseded objects during deployment; cleanup happens separately after the
rollback window. Repository-only files never enter the generated artifact.

Required repository configuration in `BreakwaterAI/bwtr.ai`:

### Actions Variables

| Variable | Example | Purpose |
|---|---|---|
| `AWS_REGION` | `us-east-1` | AWS region used by the deploy workflow. |
| `AWS_ACCOUNT_ID` | `506126099258` | Exact AWS account that the workflow must assume. |
| `AWS_S3_BUCKET` | `bwtr-ai-site-prod` | Private S3 bucket for static site files. |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | `E123EXAMPLE` | CloudFront distribution to invalidate after deploy. |
| `AWS_CLOUDFRONT_DOMAIN` | `d123example.cloudfront.net` | Distribution hostname used to bind deployment and validation targets. |
| `SITE_BASE_URL` | `https://d123example.cloudfront.net` | Exact URL validated after publishing; it must match `AWS_CLOUDFRONT_DOMAIN`. |

### Actions Secret

| Secret | Purpose |
|---|---|
| `AWS_ROLE_TO_ASSUME` | ARN of the deploy IAM role trusted by GitHub OIDC. |

## AWS Infrastructure

`infra/cloudformation/static-site.yml` creates:

- Private encrypted S3 bucket
- CloudFront distribution with Origin Access Control
- Security response headers
- Optional Route 53 aliases for `bwtr.ai` and `www.bwtr.ai`

You need an issued ACM certificate in `us-east-1` covering both:

- `bwtr.ai`
- `www.bwtr.ai`

For a non-live migration preview, deploy without aliases, DNS records, or an ACM certificate:

```bash
test "$(aws sts get-caller-identity \
  --profile breakwater-prod \
  --query Account \
  --output text)" = "506126099258" && \
aws cloudformation deploy \
  --profile breakwater-prod \
  --region us-east-1 \
  --stack-name bwtr-ai-static-site-preview \
  --template-file infra/cloudformation/static-site.yml \
  --parameter-overrides \
    AttachCustomDomains=false \
    CreateRoute53Records=false \
    BucketName=bwtr-ai-site-prod-506126099258
```

Test the `PreviewUrl` stack output before attaching the production aliases.

Deploy example:

```bash
aws cloudformation deploy \
  --region us-east-1 \
  --stack-name bwtr-ai-static-site \
  --template-file infra/cloudformation/static-site.yml \
  --parameter-overrides \
    CertificateArn=YOUR_US_EAST_1_ACM_CERT_ARN \
    BucketName=bwtr-ai-site-prod
```

After stack creation, copy the stack outputs into the GitHub Actions variables listed above. Then update only the exact Route 53 records for `bwtr.ai` and `www.bwtr.ai` to alias to the `CloudFrontDomainName` output. Leave `app.bwtr.ai`, `install.bwtr.ai`, and `license.bwtr.ai` unchanged.

If you want CloudFormation to create the apex and `www` aliases, add these parameters and make sure no unmanaged exact records already exist for `bwtr.ai` or `www.bwtr.ai`:

```bash
CreateRoute53Records=true \
HostedZoneId=YOUR_BWTR_AI_HOSTED_ZONE_ID
```

## Deploy Role

Create the account-level GitHub Actions OIDC provider once in a new AWS account:

```bash
test "$(aws sts get-caller-identity \
  --profile breakwater-prod \
  --query Account \
  --output text)" = "506126099258" && \
aws cloudformation deploy \
  --profile breakwater-prod \
  --region us-east-1 \
  --stack-name github-actions-oidc-provider \
  --template-file infra/cloudformation/github-oidc-provider.yml
```

After the static-site stack is created, deploy the least-privilege GitHub OIDC role:

```bash
test "$(aws sts get-caller-identity \
  --profile breakwater-prod \
  --query Account \
  --output text)" = "506126099258" && \
aws cloudformation deploy \
  --profile breakwater-prod \
  --region us-east-1 \
  --stack-name bwtr-ai-github-deploy-role \
  --template-file infra/cloudformation/github-deploy-role.yml \
  --parameter-overrides \
    BucketName=bwtr-ai-site-prod-506126099258 \
    CloudFrontDistributionId=E173Y881SRDFT0 \
  --capabilities CAPABILITY_NAMED_IAM
```

The deploy-role template assumes the account already has the GitHub OIDC provider:

```text
token.actions.githubusercontent.com
```

It limits trust to this repository and branch:

```text
repo:BreakwaterAI/bwtr.ai:ref:refs/heads/main
```

Copy the `RoleArn` output into the `AWS_ROLE_TO_ASSUME` GitHub Actions secret.

## Site Map

- `index.html`: CISO-facing company narrative, decision gaps, ASOC overview, and contact
- `products/index.html`: Breakwater ASOC and its Secure, Assure, and SOAR modules, served at `/products/`
- `architecture/index.html`: executive reference architecture, trust boundaries, and deployment patterns, served at `/architecture/`
- `platform/index.html`: browser fallback from the retired `/platform/` route to `/architecture/`
- `research/index.html`: research themes, Cyber Analytics, and product translation, served at `/research/`
- `about/index.html`: company principles, founders, and research connection, served at `/about/`
- `security/index.html`: vulnerability disclosure guidance, served at `/security/`
- `airports/index.html`: how Secure, Assure, and SOAR apply to airport and transportation environments, served at `/airports/`
- `power-utilities/index.html`: how Secure, Assure, and SOAR apply to power and utility environments, served at `/power-utilities/`
- `connected-industry/index.html`: how Secure, Assure, and SOAR apply to connected industrial environments, served at `/connected-industry/`
- `healthcare/index.html`: how Secure, Assure, and SOAR apply to healthcare environments, served at `/healthcare/`
- `404.html`: real not-found response body
- `.well-known/security.txt`: machine-readable security contact metadata

## Lead Capture Form

The site includes a branded company inquiry form. It posts to a Google Apps Script Web App,
which appends submissions to a Google Sheet.
This keeps lead capture simple without adding an AWS API, database, or sales platform.

Setup:

1. Create a Google Sheet named `Breakwater Website Leads`.
2. In the Sheet, open `Extensions` -> `Apps Script`.
3. Paste the contents of `google-apps-script/Code.gs`.
4. Deploy it as a Web App:
   - Execute as: `Me`
   - Who has access: `Anyone`
5. Copy the Web App URL into the `FORM_ENDPOINT` fallback in `script.js`, or set
   `window.BREAKWATER_FORM_ENDPOINT` before loading `script.js`.

The script writes submissions to a `Leads` sheet and includes a hidden honeypot field named
`website` for basic spam filtering. Submitted fields are length-limited and escaped before they
reach the sheet so user-controlled values cannot be interpreted as spreadsheet formulas. The
public form discloses that Google Apps Script and a Breakwater-managed Google Sheet process the
contact details.

## Canonical URLs

Public pages use directory-style canonical URLs. The CloudFront viewer-request function redirects
legacy `.html`, extensionless, explicit `index.html`, apex-domain, and CloudFront-domain variants
to the matching `https://www.bwtr.ai/<page>/` URL. It then rewrites the canonical directory request
to the corresponding S3 `index.html` object without changing the browser-visible URL.

The retired `/platform`, `/platform/`, `/platform.html`, and `/platform/index.html` variants redirect
to the canonical `/architecture/` route. Follow the staged rollout order below so the destination is
available before the edge begins returning those HTTP 301 responses.

Production rollout order:

1. Before changing S3 or CloudFront, record the current stack template and distribution
   configuration, and capture an immutable S3 inventory or download of the current object versions.
2. Build and validate a release artifact locally. Pre-stage only its content-addressed `styles.*.css`
   and `script.*.js` files plus `architecture/index.html`. Do not replace the homepage or any other
   existing HTML during this phase.
3. Create and inspect the CloudFormation change set. Execute it, wait for CloudFront to finish
   deploying, then verify that `/architecture` redirects to `/architecture/`, `/platform/` redirects
   to `/architecture/`, and the destination returns HTTP 200 with the expected release marker.
4. Trigger the normal site workflow. Its preflight requires that migration-safe state before it takes
   a rollback snapshot or changes any public object. Its rollback therefore preserves a working
   Architecture destination even though the new edge redirect remains active.
5. Verify canonical redirects, query preservation, genuine 404 responses, immutable asset headers,
   all primary pages, and the inquiry form. Retain the baseline artifacts through the soak window.

The repository tests validate artifact integrity, canonical routing, required cache policies,
deployment phase ordering, and rollback behavior. The publish test uses mocked AWS and HTTP
commands to inject failures before each material release phase and during rollback; it confirms
that the snapshot is restored without deleting superseded objects. This does not replace an AWS
staging exercise for IAM, network, and CloudFront service behavior. Retain the pre-release S3
snapshot and CloudFront configuration for every production rollout.

During the initial soak, permanent redirects use a five-minute cache lifetime so a stack rollback
can take effect promptly. A normal content-publish failure restores the workflow snapshot, which
already includes the valid Architecture destination. To reverse the route migration itself, restore
and fully deploy the preceding CloudFront function first; only then restore the pre-stage S3 object
versions and remove `architecture/index.html`. Invalidate `/*` and verify both canonical and legacy
URLs. Never remove `architecture/index.html` while the edge redirect remains active. S3 versioning
remains enabled as an additional object-recovery path.

## Route 53 Safety

Only `bwtr.ai` and `www.bwtr.ai` should point to the new marketing-site CloudFront distribution.
Do not change these production subdomains while deploying the marketing site:

- `app.bwtr.ai`
- `install.bwtr.ai`
- `license.bwtr.ai`

## Local Preview

```bash
python3 -m http.server 4177
```

Then open:

```text
http://127.0.0.1:4177/
```

## Validation

```bash
node scripts/test-brand-contract.mjs
node scripts/test-canonical-urls.mjs
node scripts/test-homepage-content.mjs
node scripts/test-positioning.mjs
# With the local preview running; set CHROME_PATH when Chrome is not in a standard location.
node scripts/test-rendered-layout.mjs
bash scripts/test-publish-site.sh
artifact_parent="$(mktemp -d)"
bash scripts/build-site-artifact.sh "${artifact_parent}/site"
node scripts/test-site-artifact.mjs "${artifact_parent}/site"
node scripts/test-brand-contract.mjs --artifact "${artifact_parent}/site"
git diff --check
```
