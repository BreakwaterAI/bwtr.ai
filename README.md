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
3. Syncing that artifact to S3 while preserving S3-only product-demo videos.
4. Invalidating the CloudFront distribution.

Large product-demo videos are stored directly in S3 under `assets/videos/` and are intentionally
not committed to this repository. The deploy workflow preserves that prefix during `aws s3 sync
--delete`. Repository-only files never enter the generated artifact.

Required repository configuration in `thogiti/bwtr.ai`:

### Actions Variables

| Variable | Example | Purpose |
|---|---|---|
| `AWS_REGION` | `us-east-1` | AWS region used by the deploy workflow. |
| `AWS_S3_BUCKET` | `bwtr-ai-site-prod` | Private S3 bucket for static site files. |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | `E123EXAMPLE` | CloudFront distribution to invalidate after deploy. |

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

After the static-site stack is created, deploy the least-privilege GitHub OIDC role:

```bash
aws cloudformation deploy \
  --region us-east-1 \
  --stack-name bwtr-ai-github-deploy-role \
  --template-file infra/cloudformation/github-deploy-role.yml \
  --parameter-overrides \
    BucketName=bwtr-ai-site-prod \
    CloudFrontDistributionId=YOUR_CLOUDFRONT_DISTRIBUTION_ID \
  --capabilities CAPABILITY_NAMED_IAM
```

The template assumes the account already has the GitHub OIDC provider:

```text
token.actions.githubusercontent.com
```

It limits trust to this repository and branch:

```text
repo:thogiti/bwtr.ai:ref:refs/heads/main
```

Copy the `RoleArn` output into the `AWS_ROLE_TO_ASSUME` GitHub Actions secret.

## Site Map

- `index.html`: company narrative, portfolio overview, roadmap, and contact
- `products/index.html`: portfolio details and comparison, served at `/products/`
- `platform/index.html`: ProscanX capability and evidence model, served at `/platform/`
- `research/index.html`: research themes, Cyber Analytics, and product translation, served at `/research/`
- `about/index.html`: company principles, founders, and research connection, served at `/about/`
- `security/index.html`: vulnerability disclosure guidance, served at `/security/`
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

Production rollout order:

1. Record the current stack template, distribution configuration, and S3 object versions.
2. Upload `404.html` and the five nested page directories without deleting or replacing existing
   production objects.
3. Create and inspect the CloudFormation change set, then execute it and wait for CloudFront to
   finish deploying.
4. Verify canonical redirects, directory rewrites, query preservation, and genuine 404 responses.
5. Publish the remaining static-site files, invalidate CloudFront, and run the full live smoke test.

During the initial soak, permanent redirects use a five-minute cache lifetime so a stack rollback
can take effect promptly. To roll back, restore the preceding stack template, restore or republish
the preceding Git revision, invalidate `/*`, and verify both canonical and legacy URLs. S3
versioning remains enabled as an additional object-recovery path.

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
node scripts/test-canonical-urls.mjs
git diff --check
```
