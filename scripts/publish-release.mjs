#!/usr/bin/env node
/**
 * Reusable release publisher for RedderLabs projects. Two sinks, one command:
 *
 *   1. GitHub Release  — uploads the APKs as release assets. GitHub serves each at
 *      a permanent, public URL:  <repo>/releases/latest/download/<AssetName>
 *      This is the link to put in the repo (DOWNLOAD.md). Creates the release +
 *      git tag if they don't exist yet, or re-uploads (clobber) if they do.
 *   2. Backblaze B2    — mirrors the same APKs to the shared (private) bucket under
 *      <project>/<tag>/<AssetName>, via the B2 native API. No external deps
 *      (Node's global fetch + node:crypto). Credentials come from .env.backblaze
 *      at the repo root (gitignored — NEVER commit it).
 *
 * Asset names are normalized and STABLE across releases (no version in the file
 * name), e.g. app-standard-arm64-v8a-release.apk -> Spider-standard-arm64-v8a.apk,
 * so the /releases/latest/download/<name> links in DOWNLOAD.md never change.
 *
 * Usage:
 *   node scripts/publish-release.mjs --tag v0.0.13 [options]
 *
 * Options:
 *   --tag <vX.Y.Z>     Release tag (required). Also the B2 path segment.
 *   --files <dir|glob> Where to find the APKs. Default: the Gradle release outputs
 *                      apps/mobile/android/app/build/outputs/apk/<flavor>/release/.
 *   --notes <text>     Release notes (default: pulled from the changelog if found).
 *   --project <name>   Project slug for the B2 path (default: the GitHub repo name).
 *   --prefix <name>    Asset name prefix (default: "Spider").
 *   --skip-github      Only mirror to B2.
 *   --skip-b2          Only publish the GitHub Release.
 *   --dry-run          Print the plan (matched APKs, asset names, targets) and exit
 *                      WITHOUT creating a release or uploading anything.
 *
 * Requires: `gh` CLI authenticated (repo scope) for the GitHub step.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- tiny arg parser -------------------------------------------------------
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));

function die(msg) { console.error('✗ ' + msg); process.exit(1); }

const tag = args.tag;
if (!tag) die('missing --tag (e.g. --tag v0.0.13)');
if (!/^v\d+\.\d+\.\d+/.test(tag)) die(`--tag "${tag}" should look like v1.2.3`);

const prefix = args.prefix || 'Spider';
const dryRun = !!args['dry-run'];

// ---- locate APKs -----------------------------------------------------------
const defaultOutDir = path.join(
  REPO_ROOT, 'apps/mobile/android/app/build/outputs/apk'
);
function findApks(root) {
  const found = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.apk') && p.includes(`${path.sep}release${path.sep}`)) found.push(p);
    }
  };
  const stat = fs.existsSync(root) ? fs.statSync(root) : null;
  if (stat?.isFile()) return [root];
  walk(root);
  return found.sort();
}
const apkRoot = args.files ? path.resolve(args.files) : defaultOutDir;
const apks = findApks(apkRoot);
if (apks.length === 0) {
  die(`no release APKs found under ${apkRoot}\n` +
      `  Build them first, e.g.:\n` +
      `    cd apps/mobile/android && ./gradlew assembleStandardRelease assembleGeckoRelease`);
}

// app-standard-arm64-v8a-release.apk -> Spider-standard-arm64-v8a.apk
function assetName(apkPath) {
  const base = path.basename(apkPath, '.apk').replace(/^app-/, '').replace(/-release$/, '');
  return `${prefix}-${base}.apk`;
}

// Stage renamed copies so the GitHub asset name (= download filename) is stable.
const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-release-'));
const assets = apks.map((apk) => {
  const name = assetName(apk);
  const dest = path.join(staging, name);
  if (!dryRun) fs.copyFileSync(apk, dest);
  return { src: apk, name, staged: dest, size: fs.statSync(apk).size };
});

console.log(`\nRelease ${tag} — ${assets.length} APK(s):`);
for (const a of assets) {
  console.log(`  ${a.name.padEnd(34)} ${(a.size / 1e6).toFixed(1)} MB`);
}

// ---- resolve project slug (B2 path) ---------------------------------------
function repoName() {
  try {
    return execFileSync('gh', ['repo', 'view', '--json', 'name', '-q', '.name'], {
      cwd: REPO_ROOT, encoding: 'utf8',
    }).trim();
  } catch { return path.basename(REPO_ROOT); }
}
const project = args.project || repoName();

// ---- notes -----------------------------------------------------------------
function defaultNotes() {
  if (args.notes && args.notes !== true) return args.notes;
  const code = tag.replace(/^v/, '').split('.').join(''); // best-effort
  const guesses = [
    path.join(REPO_ROOT, `apps/mobile/fastlane/metadata/android/en-US/changelogs`),
  ];
  for (const dir of guesses) {
    try {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.txt'));
      const latest = files.map((f) => parseInt(f)).filter(Number.isFinite).sort((a, b) => b - a)[0];
      if (latest != null) return fs.readFileSync(path.join(dir, `${latest}.txt`), 'utf8').trim();
    } catch { /* ignore */ }
  }
  void code;
  return `${project} ${tag}`;
}
const notes = defaultNotes();

if (dryRun) {
  console.log(`\n[dry-run] project (B2 path): ${project}`);
  console.log(`[dry-run] GitHub: ${args['skip-github'] ? 'SKIP' : `release ${tag} with ${assets.length} assets`}`);
  console.log(`[dry-run] B2    : ${args['skip-b2'] ? 'SKIP' : `mirror to <bucket>/${project}/${tag}/`}`);
  console.log(`[dry-run] notes :\n${notes.split('\n').map((l) => '    ' + l).join('\n')}`);
  console.log('\n[dry-run] nothing was created or uploaded.');
  process.exit(0);
}

// ---- 1. GitHub Release -----------------------------------------------------
function publishGitHub() {
  const filesArgs = assets.map((a) => a.staged);
  let exists = false;
  try {
    execFileSync('gh', ['release', 'view', tag], { cwd: REPO_ROOT, stdio: 'ignore' });
    exists = true;
  } catch { /* not created yet */ }

  if (exists) {
    console.log(`\n▸ GitHub: release ${tag} exists — uploading assets (clobber)`);
    execFileSync('gh', ['release', 'upload', tag, ...filesArgs, '--clobber'],
      { cwd: REPO_ROOT, stdio: 'inherit' });
  } else {
    console.log(`\n▸ GitHub: creating release ${tag}`);
    execFileSync('gh', ['release', 'create', tag, ...filesArgs,
      '--title', `${project} ${tag}`, '--notes', notes],
      { cwd: REPO_ROOT, stdio: 'inherit' });
  }
  try {
    const url = execFileSync('gh', ['release', 'view', tag, '--json', 'url', '-q', '.url'],
      { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
    console.log(`  ✓ ${url}`);
  } catch { /* ignore */ }
}

// ---- 2. Backblaze B2 mirror (native API, no deps) --------------------------
function readEnvBackblaze() {
  const p = path.join(REPO_ROOT, '.env.backblaze');
  if (!fs.existsSync(p)) die('.env.backblaze not found at repo root (B2 credentials)');
  const raw = fs.readFileSync(p, 'utf8');
  return Object.fromEntries(
    raw.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
  );
}

async function b2Authorize(cfg) {
  const auth = 'Basic ' + Buffer.from(`${cfg.keyID}:${cfg.applicationKey}`).toString('base64');
  const r = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { Authorization: auth },
  });
  const j = await r.json();
  if (!r.ok) die(`B2 authorize failed: ${JSON.stringify(j)}`);
  return j;
}

async function b2Upload(cfg, auth, asset, keyPath) {
  const sa = auth.apiInfo.storageApi;
  const bucketId = sa.bucketId || cfg.bucketId;
  if (!bucketId) die('B2 key is not restricted to a bucket and no bucketId given');

  const gu = await fetch(`${sa.apiUrl}/b2api/v3/b2_get_upload_url`, {
    method: 'POST',
    headers: { Authorization: auth.authorizationToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId }),
  }).then((r) => r.json());
  if (!gu.uploadUrl) die(`B2 get_upload_url failed: ${JSON.stringify(gu)}`);

  const body = fs.readFileSync(asset.staged);
  const sha1 = createHash('sha1').update(body).digest('hex');
  const encoded = keyPath.split('/').map(encodeURIComponent).join('/');

  const up = await fetch(gu.uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: gu.authorizationToken,
      'X-Bz-File-Name': encoded,
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': String(body.length),
      'X-Bz-Content-Sha1': sha1,
    },
    body,
  }).then((r) => r.json());
  if (!up.fileId) die(`B2 upload failed for ${keyPath}: ${JSON.stringify(up)}`);
  return up;
}

async function mirrorB2() {
  const cfg = readEnvBackblaze();
  const auth = await b2Authorize(cfg);
  const bucket = auth.apiInfo.storageApi.bucketName || cfg.bucketName || '(bucket)';
  console.log(`\n▸ B2: mirroring to ${bucket}/${project}/${tag}/ (private)`);
  for (const a of assets) {
    const keyPath = `${project}/${tag}/${a.name}`;
    process.stdout.write(`  ↑ ${a.name} … `);
    await b2Upload(cfg, auth, a, keyPath);
    console.log('ok');
  }
  console.log(`  ✓ ${assets.length} file(s) mirrored (private bucket — no public URL)`);
}

// ---- run -------------------------------------------------------------------
try {
  if (!args['skip-github']) publishGitHub();
  if (!args['skip-b2']) await mirrorB2();
  console.log('\n✓ done.');
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
}
