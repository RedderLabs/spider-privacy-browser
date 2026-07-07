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

// oauth2:<token> works for both personal and project access tokens over HTTPS.
const remoteUrl = `https://oauth2:${token}@${host}/${project}.git`;
const safeUrl = `https://oauth2:***@${host}/${project}.git`;

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', ...opts });
}

const headSha = git(['rev-parse', '--short', branch]).trim();
const tagCount = git(['tag']).trim().split('\n').filter(Boolean).length;

console.log(`▸ Mirror → ${safeUrl}`);
console.log(`  branch : ${branch} @ ${headSha}`);
console.log(`  tags   : ${tagCount}`);

if (dryRun) {
  console.log('\n[dry-run] nothing pushed.');
  process.exit(0);
}

try {
  // Push the branch, then all tags. stdio inherited so the user sees progress;
  // the URL (with token) is never printed by git push.
  git(['push', remoteUrl, `${branch}:${branch}`], { stdio: 'inherit' });
  git(['push', remoteUrl, '--tags'], { stdio: 'inherit' });
  console.log('\n✓ mirror updated.');
} catch (e) {
  die(`git push failed: ${e.message}`);
}
