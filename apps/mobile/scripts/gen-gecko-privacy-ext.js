/**
 * Generates the GeckoView privacy WebExtension from @spider/privacy-js — the SAME
 * single source of truth the react-native-webview engine injects. Output lives in
 * android/app/src/gecko/assets/privacy-ext/ (the `gecko` product-flavor source set,
 * so only the GeckoView edition ships it) and is committed; re-run this whenever
 * @spider/privacy-js changes (npm run gen:gecko-ext).
 *
 * Why an extension: GeckoView has no injectedJavaScriptBeforeContentLoaded. The
 * Gecko-native way to run code at document_start is a WebExtension content script.
 * It runs in world:"MAIN" so the fingerprint shims patch the PAGE's context (an
 * isolated-world script couldn't) and bypass page CSP.
 *
 * The in-page request blocker is intentionally NOT bundled here: it's redundant
 * with GeckoView's native ETP STRICT tracker blocking (see CONTENT_BLOCKING /
 * Phase 4 notes). Tracker counts come from the native onContentBlocked delegate.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const ts = require('typescript');

const PKG_SRC = path.resolve(__dirname, '../../../packages/privacy-js/src');
const OUT_DIR = path.resolve(__dirname, '../android/app/src/gecko/assets/privacy-ext');
const EXT_ID = 'spider-hardening@spider.privacy';

// Transpile every .ts in the package to CommonJS in a temp dir, preserving names
// so their relative require()s resolve, then load the compiled index.
function loadPrivacyJs() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spider-pjs-'));
  for (const file of fs.readdirSync(PKG_SRC)) {
    if (!file.endsWith('.ts')) continue;
    const src = fs.readFileSync(path.join(PKG_SRC, file), 'utf8');
    const js = ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
    }).outputText;
    fs.writeFileSync(path.join(tmp, file.replace(/\.ts$/, '.js')), js);
  }
  const mod = require(path.join(tmp, 'index.js'));
  return mod;
}

function main() {
  const { buildPrivacyBundle } = loadPrivacyJs();

  // Full hardening set — the GeckoView engine is the max-privacy path. (Per-toggle
  // / per-site granularity is a follow-up; documented in the Phase 4 notes.)
  const bundle = buildPrivacyBundle({
    canvasNoise: true,
    webglSpoof: true,
    navigatorHarden: true,
    fontBlock: true,
    timezoneUTC: true,
    autoconsent: true,
  });

  const manifest = {
    manifest_version: 3,
    name: 'Spider Privacy Hardening',
    version: '1.0',
    description: 'Injects Spider fingerprint-hardening shims at document_start.',
    browser_specific_settings: { gecko: { id: EXT_ID } },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        run_at: 'document_start',
        all_frames: true,
        world: 'MAIN',
        js: ['hardening.js'],
      },
    ],
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const header =
    '// GENERATED from @spider/privacy-js by scripts/gen-gecko-privacy-ext.js.\n' +
    '// Do NOT edit by hand — run `npm run gen:gecko-ext` to regenerate.\n';
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT_DIR, 'hardening.js'), header + bundle + '\n');

  console.log('Wrote', path.relative(process.cwd(), OUT_DIR));
  console.log('  manifest.json + hardening.js (' + bundle.length + ' bytes of bundle)');
}

main();
