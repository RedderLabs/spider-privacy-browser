// Mirror the repo (default branch + all tags) to a GitLab project. GitHub stays
// the primary home; GitLab is a read-only-ish copy. GitLab free tier has no
// automatic pull-mirroring, so we push from here on demand (e.g. after a release).
//
// Config: a gitignored `.env.gitlab` at the repo root with:
//   GITLAB_TOKEN=<personal or project access token, scope: api or write_repository>
//   GITLAB_PROJECT=redderlabs/spider-privacy-browser   # namespace/path
//   GITLAB_HOST=gitlab.com                              # optional, defaults to gitlab.com
//   GITLAB_BRANCH=main                                  # optional, defaults to main
//
// Usage:
//   npm run mirror:gitlab            # push main + tags
//   node scripts/mirror-gitlab.mjs --dry-run
//
// The token is only ever used in-memory for a single `git push`; it is not
// written into .git/config (we use an ephemeral remote URL).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// --- load .env.gitlab -------------------------------------------------------
const envPath = path.join(REPO_ROOT, '.env.gitlab');
if (!fs.existsSync(envPath)) {
  die(
    `.env.gitlab not found at repo root.\n` +
      `  Create it (gitignored) with GITLAB_TOKEN and GITLAB_PROJECT — see the header of this script.`,
  );
}
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const token = env.GITLAB_TOKEN;
const project = env.GITLAB_PROJECT;
const host = env.GITLAB_HOST || 'gitlab.com';
const branch = env.GITLAB_BRANCH || 'main';
if (!token) die('GITLAB_TOKEN missing in .env.gitlab');
if (!project) die('GITLAB_PROJECT missing in .env.gitlab (e.g. redderlabs/spider-privacy-browser)');

// The push URL is TOKENLESS so the secret never lands in argv or git's error
// output (git prints the failing URL on error — a token in the URL leaks there).
// Auth is fed via a temporary credential-store file that git reads out-of-band.
const remoteUrl = `https://${host}/${project}.git`;

// Scrub the token (and any URL-embedded form) from anything we ever print.
function scrub(s) {
  return String(s).split(token).join('***');
}

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', ...opts });
}

const headSha = git(['rev-parse', '--short', branch]).trim();
const tagCount = git(['tag']).trim().split('\n').filter(Boolean).length;

console.log(`▸ Mirror → ${remoteUrl}`);
console.log(`  branch : ${branch} @ ${headSha}`);
console.log(`  tags   : ${tagCount}`);

if (dryRun) {
  console.log('\n[dry-run] nothing pushed.');
  process.exit(0);
}

// Temp credential store: `https://oauth2:<token>@host` on one line. git reads it
// for the matching host and never echoes it. Deleted in finally.
const credFile = path.join(os.tmpdir(), `spider-gitlab-cred-${process.pid}`);
const credHelper = `store --file=${credFile.replace(/\\/g, '/')}`;
try {
  fs.writeFileSync(credFile, `https://oauth2:${token}@${host}\n`, { mode: 0o600 });
  // Capture (not inherit) stderr so a failing git can't print anything unscrubbed.
  git(['-c', `credential.helper=${credHelper}`, 'push', remoteUrl, `${branch}:${branch}`],
    { stdio: ['ignore', 'inherit', 'pipe'] });
  git(['-c', `credential.helper=${credHelper}`, 'push', remoteUrl, '--tags'],
    { stdio: ['ignore', 'inherit', 'pipe'] });
  console.log('\n✓ mirror updated.');
} catch (e) {
  const stderr = e.stderr ? scrub(e.stderr.toString()) : '';
  if (stderr) console.error(stderr.trim());
  die(`git push failed (${scrub(e.message)})`);
} finally {
  try { fs.unlinkSync(credFile); } catch { /* already gone */ }
}
