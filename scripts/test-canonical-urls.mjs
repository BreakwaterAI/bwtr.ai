import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const template = fs.readFileSync(
  new URL("../infra/cloudformation/static-site.yml", import.meta.url),
  "utf8",
);
const match = template.match(/      FunctionCode: (?:!Sub )?\|\n([\s\S]*?)\n\n  SiteDistribution:/);
if (!match) throw new Error("Could not extract CanonicalUrlFunction code");

const source = match[1]
  .split("\n")
  .map((line) => line.replace(/^        /, ""))
  .join("\n")
  .replaceAll("${AttachCustomDomains}", "true")
  .replaceAll("${AlternateDomainName}", "www.bwtr.ai");
const context = {};
vm.createContext(context);
vm.runInContext(source, context);

function event(uri, host = "www.bwtr.ai", querystring = {}) {
  return {
    request: {
      uri,
      headers: { host: { value: host } },
      querystring,
    },
  };
}

function expectRedirect(uri, location, host, querystring) {
  const result = context.handler(event(uri, host, querystring));
  if (result.statusCode !== 301 || result.headers.location.value !== location) {
    throw new Error(`${uri}: expected redirect ${location}, received ${JSON.stringify(result)}`);
  }
  if (result.headers["cache-control"]?.value !== "public, max-age=300") {
    throw new Error(`${uri}: redirect cache policy is missing or unsafe`);
  }
}

function expectRewrite(uri, rewritten) {
  const result = context.handler(event(uri));
  if (result.statusCode || result.uri !== rewritten) {
    throw new Error(`${uri}: expected rewrite ${rewritten}, received ${JSON.stringify(result)}`);
  }
}

const routes = [
  "products",
  "architecture",
  "research",
  "about",
  "security",
  "airports",
  "power-utilities",
  "connected-industry",
  "healthcare",
];
let checks = 0;
for (const route of routes) {
  const canonical = `https://www.bwtr.ai/${route}/`;
  expectRedirect(`/${route}`, canonical);
  expectRedirect(`/${route}.html`, canonical);
  expectRedirect(`/${route}/index.html`, canonical);
  expectRewrite(`/${route}/`, `/${route}/index.html`);
  checks += 4;

  const html = fs.readFileSync(new URL(`../${route}/index.html`, import.meta.url), "utf8");
  if (!html.includes(`property="og:url" content="${canonical}"`)) {
    throw new Error(`${route}: OpenGraph URL is not canonical`);
  }
  if (!html.includes(`rel="canonical" href="${canonical}"`)) {
    throw new Error(`${route}: canonical link is missing or inconsistent`);
  }
  checks += 2;
}

expectRedirect("/index.html", "https://www.bwtr.ai/");
expectRedirect("//products/", "https://www.bwtr.ai/products/");
expectRedirect("/about/", "https://www.bwtr.ai/about/", "bwtr.ai");
for (const legacyPlatformPath of [
  "/platform",
  "/platform/",
  "/platform.html",
  "/platform/index.html",
]) {
  expectRedirect(legacyPlatformPath, "https://www.bwtr.ai/architecture/");
  checks += 1;
}
const sitemap = fs.readFileSync(new URL("../sitemap.xml", import.meta.url), "utf8");
assert.deepEqual(
  [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((entry) => entry[1]),
  ["https://www.bwtr.ai/", ...routes.map((route) => `https://www.bwtr.ai/${route}/`)],
  "sitemap must contain only the canonical public routes in the intended order",
);
checks += 1;
expectRedirect(
  "/products.html",
  "https://www.bwtr.ai/products/?q=a%20b&plus=a%2Bb&slash=%2F&unicode=%E2%9C%93&tag=one&tag=two&empty=&flag=",
  "bwtr.ai",
  {
    q: { value: "a b" },
    plus: { value: "a+b" },
    slash: { value: "/" },
    unicode: { value: "✓" },
    tag: { value: "one", multiValue: [{ value: "one" }, { value: "two" }] },
    empty: { value: "" },
    flag: { value: "" },
  },
);
expectRedirect(
  "/security/",
  "https://www.bwtr.ai/security/",
  "d8xidtpdsz0p0.cloudfront.net",
  {},
);
expectRewrite("/", "/");
expectRewrite("/.well-known/security.txt", "/.well-known/security.txt");
expectRewrite("/missing", "/missing");
checks += 8;

const previewSource = match[1]
  .split("\n")
  .map((line) => line.replace(/^        /, ""))
  .join("\n")
  .replaceAll("${AttachCustomDomains}", "false")
  .replaceAll("${AlternateDomainName}", "www.bwtr.ai");
const previewContext = {};
vm.createContext(previewContext);
vm.runInContext(previewSource, previewContext);
const previewCanonical = previewContext.handler(event("/products.html", "preview.cloudfront.net"));
assert.equal(
  previewCanonical.headers.location.value,
  "https://preview.cloudfront.net/products/",
  "preview redirects must remain on the preview CloudFront hostname",
);
const previewHome = previewContext.handler(event("/", "preview.cloudfront.net"));
assert.equal(previewHome.statusCode, undefined, "preview root must not redirect to production");
checks += 2;

for (const route of routes) {
  if (!sitemap.includes(`<loc>https://www.bwtr.ai/${route}/</loc>`)) {
    throw new Error(`${route}: canonical URL is missing from sitemap.xml`);
  }
  checks += 1;
}

const securityTxt = fs.readFileSync(new URL("../.well-known/security.txt", import.meta.url), "utf8");
if (!securityTxt.includes("Policy: https://www.bwtr.ai/security/")) {
  throw new Error("security.txt policy URL is not canonical");
}
checks += 1;

for (const errorCode of ["403", "404"]) {
  const pattern = new RegExp(
    `ErrorCode: ${errorCode}\\s+ResponseCode: 404\\s+ResponsePagePath: /404\\.html`,
  );
  if (!pattern.test(template)) {
    throw new Error(`${errorCode}: CloudFront must return the branded page with HTTP 404`);
  }
  checks += 1;
}

const workflow = fs.readFileSync(
  new URL("../.github/workflows/deploy-aws.yml", import.meta.url),
  "utf8",
);
const publishScript = fs.readFileSync(new URL("../scripts/publish-site.sh", import.meta.url), "utf8");
const operatorDeployScript = fs.readFileSync(
  new URL("../deploy/aws/deploy.sh", import.meta.url),
  "utf8",
);
assert.ok(
  template.includes('UseCustomCertificate:') &&
    template.includes('ShouldUseCustomCertificate:') &&
    template.includes('- ShouldUseCustomCertificate'),
  "CloudFront certificate attachment must be separable from aliases for cross-account cutover",
);
checks += 1;
for (const required of [
  'bash scripts/build-site-artifact.sh "${RUNNER_TEMP}/bwtr-site"',
  "node scripts/test-positioning.mjs",
  "node scripts/test-deployment-target.mjs",
  "bash scripts/test-publish-site.sh",
  "bash scripts/test-deploy-entrypoint.sh",
  'node scripts/test-site-artifact.mjs "${RUNNER_TEMP}/bwtr-site"',
  "BWTR_ARTIFACT: ${{ runner.temp }}/bwtr-site",
  "BWTR_ROLLBACK_ARTIFACT: ${{ runner.temp }}/bwtr-site-rollback",
  "BWTR_DEPLOY_TARGET: ${{ vars.DEPLOY_TARGET }}",
  "BWTR_EXPECTED_AWS_ACCOUNT_ID: ${{ vars.AWS_ACCOUNT_ID }}",
  "BWTR_CERTIFICATE_ARN: ${{ vars.AWS_ACM_CERTIFICATE_ARN }}",
  "BWTR_CLOUDFRONT_DOMAIN: ${{ vars.AWS_CLOUDFRONT_DOMAIN }}",
  "BWTR_EXPECTED_GITHUB_SUBJECT: ${{ vars.AWS_OIDC_SUBJECT }}",
  'GitHub OIDC subject: ${payload.sub}',
  'test "${actual_account_id}" = "${BWTR_EXPECTED_AWS_ACCOUNT_ID}"',
  "node deploy/aws/validate-target.mjs",
  "run: bash scripts/publish-site.sh",
  '--exclude "assets/videos/*"',
  "${BWTR_SITE_BASE_URL}/architecture/",
]) {
  if (!workflow.includes(required)) {
    throw new Error(`Safe deployment step missing: ${required}`);
  }
  checks += 1;
}
if (`${workflow}\n${publishScript}`.includes("aws s3 sync . ")) {
  throw new Error("Deployment must not sync the repository root");
}
checks += 1;
for (const operatorGuard of [
  'EXPECTED_ACCOUNT_ID="506126099258"',
  'BUCKET_NAME="bwtr-ai-site-prod-506126099258"',
  'DISTRIBUTION_ID="E173Y881SRDFT0"',
  'CLOUDFRONT_DOMAIN="d363eyllse1zcb.cloudfront.net"',
  'Production publication requires --confirm-production.',
  'Publication requires a clean main branch.',
  'Publication requires local HEAD to equal origin/main.',
  'bash scripts/publish-site.sh',
]) {
  assert.ok(operatorDeployScript.includes(operatorGuard), `operator deploy guard is missing: ${operatorGuard}`);
  checks += 1;
}
for (const forbiddenOperatorMutation of [
  "route53 change-resource-record-sets",
  "cloudfront update-distribution",
  "cloudfront associate-alias",
  "acm request-certificate",
]) {
  assert.ok(
    !operatorDeployScript.includes(forbiddenOperatorMutation),
    `content deploy script must not mutate infrastructure: ${forbiddenOperatorMutation}`,
  );
  checks += 1;
}

const orderedWorkflowMarkers = [
  "Verify canonical route infrastructure",
  "Snapshot current production site",
  "run: bash scripts/publish-site.sh",
];
let previousMarkerIndex = -1;
for (const marker of orderedWorkflowMarkers) {
  const markerIndex = workflow.indexOf(marker, previousMarkerIndex + 1);
  assert.ok(markerIndex > previousMarkerIndex, `workflow phase is missing or out of order: ${marker}`);
  previousMarkerIndex = markerIndex;
  checks += 1;
}
const orderedPublishMarkers = [
  'run_phase "snapshot-validation"',
  '--cache-control "public, max-age=31536000, immutable"',
  '--exclude "styles.*.css"',
  'run_phase "homepage-switch"',
  'invalidate_and_wait "publish"',
  'run_phase "smoke-architecture"',
];
previousMarkerIndex = -1;
for (const marker of orderedPublishMarkers) {
  const markerIndex = publishScript.indexOf(marker, previousMarkerIndex + 1);
  assert.ok(markerIndex > previousMarkerIndex, `deployment phase is missing or out of order: ${marker}`);
  previousMarkerIndex = markerIndex;
  checks += 1;
}
if (publishScript.includes('aws s3 sync "${artifact}" "s3://${bucket}"') ||
    publishScript.includes('aws s3 sync "${rollback_artifact}" "s3://${bucket}"') ||
    publishScript.includes("--delete")) {
  throw new Error("Release and rollback must retain superseded objects through the soak window");
}
checks += 1;
for (const migrationPreflight of [
  '"${BWTR_SITE_BASE_URL}/architecture")" = "301 ${BWTR_SITE_BASE_URL}/architecture/"',
  '"${BWTR_SITE_BASE_URL}/platform/")" = "301 ${BWTR_SITE_BASE_URL}/architecture/"',
  '"${BWTR_SITE_BASE_URL}/architecture/")" = "200"',
]) {
  assert.ok(workflow.includes(migrationPreflight), `migration preflight is missing: ${migrationPreflight}`);
  checks += 1;
}

for (const [label, cacheControlledUpload] of [
  [
    "supporting artifact",
    /aws s3 cp "\$\{artifact\}" "s3:\/\/\$\{bucket\}"[\s\S]{0,220}?--recursive[\s\S]{0,220}?--exclude "index\.html"[\s\S]{0,220}?--cache-control "no-cache"/,
  ],
  [
    "homepage",
    /aws s3 cp "\$\{artifact\}\/index\.html" "s3:\/\/\$\{bucket\}\/index\.html"[\s\S]{0,220}?--content-type "text\/html"[\s\S]{0,220}?--cache-control "no-cache"/,
  ],
  [
    "rollback artifact",
    /aws s3 cp "\$\{rollback_artifact\}" "s3:\/\/\$\{bucket\}"[\s\S]{0,220}?--recursive[\s\S]{0,220}?--cache-control "no-cache"/,
  ],
]) {
  if (!cacheControlledUpload.test(publishScript)) {
    throw new Error(`Cache-controlled upload step missing: ${label}`);
  }
  checks += 1;
}
for (const requiredPublishGuard of [
  'node "${script_dir}/validate-rollback-artifact.mjs"',
  'run_phase "rollback-restore"',
  'invalidate_and_wait "rollback"',
  'Automatic rollback was incomplete; manual recovery is required.',
]) {
  assert.ok(publishScript.includes(requiredPublishGuard), `publish guard is missing: ${requiredPublishGuard}`);
  checks += 1;
}
assert.ok(!template.includes("rawQueryString"), "CloudFront Function uses a non-existent request API");
checks += 1;

const assetRevision = "20260912";
for (const relativePath of [
  "index.html",
  "404.html",
  "products/index.html",
  "architecture/index.html",
  "platform/index.html",
  "research/index.html",
  "about/index.html",
  "security/index.html",
]) {
  const html = fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
  for (const versionedAsset of [
    `/styles.css?v=${assetRevision}`,
    `/script.js?v=${assetRevision}`,
  ]) {
    if (!html.includes(versionedAsset)) {
      throw new Error(`${relativePath}: versioned asset reference missing: ${versionedAsset}`);
    }
    checks += 1;
  }
}

const deployRole = fs.readFileSync(
  new URL("../infra/cloudformation/github-deploy-role.yml", import.meta.url),
  "utf8",
);
const oidcProvider = fs.readFileSync(
  new URL("../infra/cloudformation/github-oidc-provider.yml", import.meta.url),
  "utf8",
);
assert.ok(
  oidcProvider.includes("https://token.actions.githubusercontent.com") &&
    oidcProvider.includes("sts.amazonaws.com"),
  "GitHub OIDC provider must trust only the GitHub issuer for the AWS STS audience",
);
checks += 1;
assert.ok(
  deployRole.includes("BreakwaterAI@323852433/bwtr.ai@1234382108") &&
    deployRole.includes("repo:${RepositorySubject}:ref:refs/heads/${Branch}"),
  "Deploy role must use the exact immutable-ID GitHub OIDC repository subject",
);
checks += 1;
for (const permission of [
  "cloudfront:CreateInvalidation",
  "cloudfront:GetDistribution",
  "cloudfront:GetInvalidation",
  "s3:GetBucketLocation",
]) {
  if (!deployRole.includes(permission)) {
    throw new Error(`Deploy role is missing required permission: ${permission}`);
  }
  checks += 1;
}

console.log(`Canonical URL and metadata tests: ${checks} passed`);
