import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
const release = JSON.parse(readFileSync('site-release.json'));
for (const format of ['legacy', 'product-led', 'ciso-led']) {
  const root = mkdtempSync('/tmp/bwtr-rollback-test-');
  mkdirSync(join(root, 'architecture'));
  const dependencies = [];
  if (format === 'legacy') {
    for (const [stem, suffix, content] of [['styles','css', ':root{}'], ['script','js', 'void 0;']]) {
      const hash = createHash('sha256').update(content).digest('hex').slice(0,12);
      const path = `${stem}.${hash}.${suffix}`;
      writeFileSync(join(root, path), content); dependencies.push(path);
    }
    writeFileSync(join(root, 'architecture/index.html'), `CUSTOMER-CONTROLLED DECISION BOUNDARY<link href="/${dependencies[0]}"><script src="/${dependencies[1]}"></script>`);
  } else {
    const architecture = readFileSync('architecture/index.html', 'utf8');
    writeFileSync(join(root, 'architecture/index.html'), format === 'product-led'
      ? architecture.replace('How Breakwater connects to your environment.', 'Know what connects.')
      : architecture);
    for (const path of Object.values(release.resources)) {
      mkdirSync(dirname(join(root, path)), { recursive: true }); copyFileSync(path, join(root, path)); dependencies.push(path);
    }
  }
  const run = () => spawnSync(process.execPath, ['scripts/validate-rollback-artifact.mjs', root], { encoding: 'utf8' });
  assert.equal(run().status, 0, `${format}: valid snapshot rejected`);
  const path = join(root, dependencies[0]); renameSync(path, path + '.saved');
  assert.notEqual(run().status, 0, `${format}: missing dependency accepted`);
  writeFileSync(path, 'corrupted'); assert.notEqual(run().status, 0, `${format}: corrupted dependency accepted`);
}
console.log('Legacy, product-led and CISO-led rollback snapshots: valid, missing and corrupted dependency tests passed.');
