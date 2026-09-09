import fs from "node:fs";
import vm from "node:vm";

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
  .replaceAll("${AlternateDomainName}", "www.bwtr.ai");
const context = {};
vm.createContext(context);
vm.runInContext(source, context);

function event(uri, host = "www.bwtr.ai", rawQuery) {
  return {
    request: {
      uri,
      headers: { host: { value: host } },
      querystring: {},
      rawQueryString: () => rawQuery,
    },
  };
}

function expectRedirect(uri, location, host, rawQuery) {
  const result = context.handler(event(uri, host, rawQuery));
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

const routes = ["products", "platform", "research", "about", "security"];
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
expectRedirect(
  "/products.html",
  "https://www.bwtr.ai/products/?q=a%20b&plus=a+b&slash=%2F&unicode=%E2%9C%93&tag=one&tag=two&empty=&flag",
  "bwtr.ai",
  "q=a%20b&plus=a+b&slash=%2F&unicode=%E2%9C%93&tag=one&tag=two&empty=&flag",
);
expectRedirect(
  "/security/",
  "https://www.bwtr.ai/security/?",
  "d8xidtpdsz0p0.cloudfront.net",
  "",
);
expectRewrite("/", "/");
expectRewrite("/.well-known/security.txt", "/.well-known/security.txt");
expectRewrite("/missing", "/missing");
checks += 8;

const sitemap = fs.readFileSync(new URL("../sitemap.xml", import.meta.url), "utf8");
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
for (const exclusion of ['--exclude "scripts/*"', '--exclude "AGENTS.md"']) {
  if (!workflow.includes(exclusion)) {
    throw new Error(`Deployment exclusion missing: ${exclusion}`);
  }
  checks += 1;
}

console.log(`Canonical URL and metadata tests: ${checks} passed`);
