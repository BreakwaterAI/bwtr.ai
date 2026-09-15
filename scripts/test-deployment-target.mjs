import assert from "node:assert/strict";
import { validateDistribution } from "../deploy/aws/validate-target.mjs";

const certificateArn = "arn:aws:acm:us-east-1:506126099258:certificate/test";
const domain = "d123example.cloudfront.net";
const origin = "site-bucket.s3.us-east-1.amazonaws.com";

function fixture({ aliases = [], defaultOriginDomain = origin, oac = "OAC123", status = "Deployed" } = {}) {
  return {
    Distribution: {
      Status: status,
      DomainName: domain,
      DistributionConfig: {
        Enabled: true,
        Aliases: { Quantity: aliases.length, Items: aliases },
        DefaultCacheBehavior: { TargetOriginId: "default-origin" },
        Origins: {
          Items: [
            {
              Id: "default-origin",
              DomainName: defaultOriginDomain,
              OriginAccessControlId: oac,
              S3OriginConfig: { OriginAccessIdentity: "" },
            },
            {
              Id: "unused-origin",
              DomainName: origin,
              OriginAccessControlId: "OAC999",
              S3OriginConfig: { OriginAccessIdentity: "" },
            },
          ],
        },
        ViewerCertificate: { ACMCertificateArn: certificateArn },
      },
    },
  };
}

function expected(target) {
  return { target, domain, origin, certificateArn };
}

let checks = 0;
validateDistribution(fixture(), expected("preview"));
checks += 1;
validateDistribution(fixture({ aliases: ["www.bwtr.ai", "bwtr.ai"] }), expected("production"));
checks += 1;

for (const [label, payload, target] of [
  ["secondary origin cannot satisfy default origin binding", fixture({ defaultOriginDomain: "other.example" }), "preview"],
  ["missing OAC is refused", fixture({ oac: "" }), "preview"],
  ["wrong preview aliases are refused", fixture({ aliases: ["www.bwtr.ai"] }), "preview"],
  ["in-progress distribution is refused", fixture({ status: "InProgress" }), "preview"],
]) {
  assert.throws(() => validateDistribution(payload, expected(target)), undefined, label);
  checks += 1;
}

const wrongCertificate = fixture();
wrongCertificate.Distribution.DistributionConfig.ViewerCertificate.ACMCertificateArn = "wrong";
assert.throws(
  () => validateDistribution(wrongCertificate, expected("preview")),
  undefined,
  "wrong preview certificate is refused",
);
checks += 1;

console.log(`AWS deployment target tests: ${checks} passed`);
