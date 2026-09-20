import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/test-redesign-release-candidate.mjs', process.env.BWTR_ARTIFACT || '.'], { stdio: 'inherit' });
