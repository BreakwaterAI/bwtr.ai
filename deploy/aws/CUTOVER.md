# One-time CloudFront account cutover

This runbook moves only `bwtr.ai` and `www.bwtr.ai` from the legacy CloudFront distribution to
Breakwater Production. It does not move the Route 53 hosted zone and must not change email or
product-subdomain records.

## Pinned resources

| Resource | Legacy source | Breakwater target |
|---|---|---|
| AWS account | `743947337680` | `506126099258` |
| AWS profile | `breakwater` | `breakwater-prod` |
| CloudFront ID | `E2M3MM3HR6HAUB` | `E173Y881SRDFT0` |
| CloudFront domain | `d8xidtpdsz0p0.cloudfront.net` | `d363eyllse1zcb.cloudfront.net` |
| S3 bucket | `bwtr-ai-site-prod` | `bwtr-ai-site-prod-506126099258` |
| Hosted zone | `Z076105230H1ULM0MK0U9` | remains in the legacy account for this wave |

## No-outage preparation

1. Confirm ACM certificate
   `arn:aws:acm:us-east-1:506126099258:certificate/3ba2f2a9-fb4e-44a9-a9ae-fa6456fbaff4`
   is `ISSUED` for both names.
2. Update stack `bwtr-ai-static-site-preview` with `UseCustomCertificate=true`,
   `AttachCustomDomains=false`, and the pinned certificate ARN. Wait for `Deployed`.
3. Require successful `AWS_PROFILE=breakwater-prod deploy/aws/deploy.sh check preview` and a
   successful GitHub Actions deployment of the same commit.
4. Create ownership TXT records `_.bwtr.ai` and `_www.bwtr.ai`, both containing
   `d363eyllse1zcb.cloudfront.net`. Leave the ACM validation CNAMEs in place.
5. Export both CloudFront configurations and ETags, the four existing A/AAAA records, stack
   parameters, and current GitHub Actions variables into the encrypted migration-backup folder.

## Maintenance window

Reserve 30 minutes; abort and roll back if the target is not healthy within that window.

1. Recheck both sites, AWS account IDs, source/target status, target origin, certificate, ownership
   TXT records, and the rollback files.
2. Disable source distribution `E2M3MM3HR6HAUB` using its captured ETag and wait until its change
   is fully deployed. This begins the possible website interruption.
3. From `breakwater-prod`, move `bwtr.ai` and `www.bwtr.ai` to `E173Y881SRDFT0` with CloudFront's
   `associate-alias` operation. Do not use wildcards.
4. Reconcile stack `bwtr-ai-static-site-preview` with `AttachCustomDomains=true` and
   `UseCustomCertificate=true`; wait for CloudFront `Deployed`.
5. UPSERT only the apex/www A and AAAA aliases to `d363eyllse1zcb.cloudfront.net`, then wait for
   Route 53 `INSYNC`.
6. Verify HTTPS, redirects, all public pages, 404 behavior, assets, security headers, and the lead
   form from multiple DNS resolvers. Verify Google Workspace MX, SPF, DKIM, and DMARC are unchanged.
7. Set GitHub variables `DEPLOY_TARGET=production` and `SITE_BASE_URL=https://www.bwtr.ai`, then run
   the deployment workflow once and require success.

## Rollback

If failure occurs before alias movement, re-enable the source if it was disabled. If aliases have
moved:

1. Change ownership TXT records `_.bwtr.ai` and `_www.bwtr.ai` to
   `d8xidtpdsz0p0.cloudfront.net` and verify them publicly.
2. Re-enable legacy distribution `E2M3MM3HR6HAUB` and wait until it is fully deployed.
3. Disable target distribution `E173Y881SRDFT0` and wait until it is fully deployed.
4. Using legacy-account profile `breakwater`, run `associate-alias` for both names with
   `E2M3MM3HR6HAUB` as the target.
5. Restore the four saved A/AAAA records to `d8xidtpdsz0p0.cloudfront.net`, wait for Route 53
   `INSYNC`, and verify the legacy site.
6. Reconcile stack `bwtr-ai-static-site-preview` with `AttachCustomDomains=false`; this returns the
   target to an enabled, alias-free preview. Wait for CloudFront deployment.
7. Restore GitHub variables `DEPLOY_TARGET=preview` and
   `SITE_BASE_URL=https://d363eyllse1zcb.cloudfront.net`, then require the preview workflow to
   succeed before allowing another deployment.

Do not delete either distribution, bucket, certificate, validation record, ownership TXT record,
or saved configuration during the soak period.
