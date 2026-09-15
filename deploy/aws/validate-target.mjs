import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export function validateDistribution(payload, expected) {
  const distribution = payload.Distribution;
  const config = distribution.DistributionConfig;
  const aliases = [...(config.Aliases.Items || [])].sort();
  const expectedAliases = expected.target === "production" ? ["bwtr.ai", "www.bwtr.ai"] : [];
  const defaultOrigin = config.Origins.Items.find(
    (origin) => origin.Id === config.DefaultCacheBehavior.TargetOriginId,
  );

  assert.equal(distribution.Status, "Deployed", "CloudFront target is not fully deployed");
  assert.equal(config.Enabled, true, "CloudFront target is disabled");
  assert.equal(distribution.DomainName, expected.domain, "CloudFront distribution/domain mismatch");
  assert.deepEqual(aliases, expectedAliases, `CloudFront aliases do not match ${expected.target} state`);
  assert.ok(defaultOrigin, "CloudFront default behavior references a missing origin");
  assert.equal(defaultOrigin.DomainName, expected.origin, "CloudFront default origin/bucket mismatch");
  assert.ok(defaultOrigin.S3OriginConfig, "CloudFront default origin is not an S3 origin");
  assert.ok(defaultOrigin.OriginAccessControlId, "CloudFront default S3 origin has no OAC");
  assert.equal(
    config.ViewerCertificate.ACMCertificateArn,
    expected.certificateArn,
    "CloudFront certificate mismatch",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [jsonPath, target, domain, origin, certificateArn] = process.argv.slice(2);
  if (!jsonPath || !["preview", "production"].includes(target) || !domain || !origin || !certificateArn) {
    throw new Error(
      "usage: validate-target.mjs DISTRIBUTION_JSON preview|production DOMAIN ORIGIN CERTIFICATE_ARN",
    );
  }
  validateDistribution(JSON.parse(fs.readFileSync(jsonPath, "utf8")), {
    target,
    domain,
    origin,
    certificateArn,
  });
  console.log(`AWS deployment target verified for ${target}.`);
}
