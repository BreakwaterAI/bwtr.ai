# bwtr.ai AWS deployment

This directory is the operator entry point for the public `bwtr.ai` marketing site. It deploys
only static content to the pinned Breakwater Production S3 bucket and CloudFront distribution.
It does not change DNS, certificates, email, EC2, licensing, APIs, or product applications.

## Normal release

The normal production path is a reviewed commit to `main`. GitHub Actions assumes the
least-privilege AWS role through OIDC, validates the exact account/bucket/distribution binding,
creates a rollback snapshot, publishes, invalidates CloudFront, and runs live smoke checks.

```bash
git push origin main
gh run list --repo BreakwaterAI/bwtr.ai --workflow deploy-aws.yml --limit 1
gh run watch RUN_ID --repo BreakwaterAI/bwtr.ai --exit-status
```

Do not push or deploy unless the user explicitly authorizes production publication.

## Operator preflight and fallback

Renew SSO, then run the non-writing check appropriate for the current state:

```bash
aws sso login --profile breakwater-prod
AWS_PROFILE=breakwater-prod deploy/aws/deploy.sh check production
```

The production aliases moved to the Breakwater account on 2026-09-15. Use `preview` only for a
new alias-free deployment before its domain cutover. A manual production publication is a
break-glass fallback for GitHub Actions:

```bash
AWS_PROFILE=breakwater-prod \
  deploy/aws/deploy.sh publish production --confirm-production
```

The script refuses the wrong AWS account, bucket origin, distribution domain, alias state,
certificate, dirty/non-main checkout, or a commit that differs from `origin/main`. Publication
uses the repository's tested publish state machine and automatically restores the captured S3
snapshot if an upload, invalidation, or smoke test fails. S3-only product-demo videos are retained.

## Infrastructure and cutover

Infrastructure is defined in `infra/cloudformation/`. The content deployment script deliberately
cannot perform the one-time cross-account CloudFront alias transfer or modify Route 53. Follow the
one-time `deploy/aws/CUTOVER.md` runbook for that operation and preserve the legacy A/AAAA values
for rollback. Never
modify MX, SPF, DKIM, DMARC, Google verification, or unrelated subdomain records during a website
release.

For a white-label deployment, copy the templates and replace every pinned account, bucket,
distribution, domain, certificate, OIDC subject, and release marker. Run `check` successfully
before enabling publication.
