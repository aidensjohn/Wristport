import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync, spawn } from 'node:child_process';
import esbuild from 'esbuild';
import JSZip from 'jszip';
import { inject } from 'postject';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const BUILD_DIR = path.join(ROOT, 'build-exe');
const CACHE_DIR = path.join(ROOT, '.cache', 'win-node');
const RELEASE_DIR = path.join(ROOT, 'release');
const OUT_EXE = path.join(RELEASE_DIR, 'wristport.exe');

const NODE_VERSION = process.versions.node;
const WIN_ZIP_URL = `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`;
const SENTINEL_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

function guessMime(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  if (lower.endsWith('.woff2')) return 'font/woff2';
  return 'application/octet-stream';
}

function collectDistFiles(dir, prefix = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (rel === 'assets/aistudio' || rel.startsWith('assets/aistudio/')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectDistFiles(full, rel));
    } else if (entry.isFile()) {
      results.push({ rel, full });
    }
  }
  return results;
}

async function getWindowsNodeBinary() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cachedExe = path.join(CACHE_DIR, `node-v${NODE_VERSION}-win-x64.exe`);
  if (fs.existsSync(cachedExe) && fs.statSync(cachedExe).size > 20_000_000) {
    console.log(`[build:exe] Using cached Windows Node v${NODE_VERSION} runtime`);
    return fs.readFileSync(cachedExe);
  }

  console.log(`[build:exe] Downloading official Node.js v${NODE_VERSION} win-x64 base binary...`);
  const res = await fetch(WIN_ZIP_URL);
  if (!res.ok) {
    throw new Error(`Failed to download ${WIN_ZIP_URL}: HTTP ${res.status}`);
  }
  const zipBuf = Buffer.from(await res.arrayBuffer());
  const zip = await JSZip.loadAsync(zipBuf);
  const entryName = `node-v${NODE_VERSION}-win-x64/node.exe`;
  const file = zip.file(entryName);
  if (!file) {
    throw new Error(`Could not find ${entryName} inside downloaded archive.`);
  }
  const exeBuf = await file.async('nodebuffer');
  fs.writeFileSync(cachedExe, exeBuf);
  console.log(`[build:exe] Cached Windows Node base (${Math.round(exeBuf.byteLength / (1024 * 1024))} MB)`);
  return exeBuf;
}

async function testStandaloneBundle(bundlePath) {
  console.log('[build:exe] Running smoke test on compiled bundle...');
  const testPort = '3919';
  const child = spawn(process.execPath, [bundlePath], {
    env: {
      ...process.env,
      PORT: testPort,
      WRISTPORT_STANDALONE: '1',
      WRISTPORT_NO_BROWSER: '1',
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => { stdout += d.toString(); });
  child.stderr.on('data', (d) => { stderr += d.toString(); });

  try {
    let ok = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 150));
      try {
        const res = await fetch(`http://127.0.0.1:${testPort}/api/health`);
        if (res.ok) {
          const rootRes = await fetch(`http://127.0.0.1:${testPort}/`);
          const html = await rootRes.text();
          if (rootRes.ok && html.includes('wristport')) {
            ok = true;
            break;
          }
        }
      } catch {
        // waiting for listener
      }
    }
    if (!ok) {
      throw new Error(`Bundle smoke test failed.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
    }
    console.log('[build:exe] Standalone bundle smoke test passed (HTTP 200 on / and /api/health)');
  } finally {
    child.kill('SIGTERM');
  }
}

function verifyPeBinary(exePath) {
  const buf = fs.readFileSync(exePath);
  if (buf[0] !== 0x4d || buf[1] !== 0x5a) {
    throw new Error('Output .exe does not start with MZ header.');
  }
  const peOffset = buf.readUInt32LE(0x3c);
  const peSig = buf.subarray(peOffset, peOffset + 4).toString('ascii');
  if (peSig !== 'PE\0\0') {
    throw new Error('Output .exe does not contain valid PE signature.');
  }
  const machine = buf.readUInt16LE(peOffset + 4);
  if (machine !== 0x8664) {
    throw new Error(`Unexpected PE machine type: 0x${machine.toString(16)}`);
  }
  if (!buf.includes(Buffer.from('NODE_SEA_BLOB'))) {
    throw new Error('NODE_SEA_BLOB resource missing from output .exe.');
  }
  console.log(
    `[build:exe] Verified valid Windows PE32+ x64 executable with embedded SEA payload (${(
      buf.byteLength /
      (1024 * 1024)
    ).toFixed(1)} MB)`
  );
}

function stripPeSignature(buf) {
  const peOffset = buf.readUInt32LE(0x3c);
  const optOffset = peOffset + 24;
  const magic = buf.readUInt16LE(optOffset);
  if (magic !== 0x20b) return buf;
  const certOffset = buf.readUInt32LE(optOffset + 144);
  const certSize = buf.readUInt32LE(optOffset + 148);
  let out = Buffer.from(buf);
  if (certOffset > 0 && certSize > 0 && certOffset + certSize === out.length) {
    out = out.subarray(0, certOffset);
  }
  out.writeUInt32LE(0, optOffset + 64); // clear PE checksum
  out.writeUInt32LE(0, optOffset + 144); // clear Certificate Table offset
  out.writeUInt32LE(0, optOffset + 148); // clear Certificate Table size
  return out;
}

async function main() {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.mkdirSync(RELEASE_DIR, { recursive: true });

  console.log('[build:exe] 1/5 Building production frontend (vite build)...');
  execFileSync(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  console.log('[build:exe] 2/5 Embedding compressed UI assets...');
  const files = collectDistFiles(DIST_DIR);
  const packedAssets = files.map((f) => {
    const raw = fs.readFileSync(f.full);
    const gz = zlib.gzipSync(raw, { level: 9 }).toString('base64');
    return { rel: f.rel, mime: guessMime(f.rel), gz };
  });

  const entryTsPath = path.join(BUILD_DIR, 'standalone-entry.ts');
  const entrySource = `import zlib from 'node:zlib';

const PACKED_ASSETS = ${JSON.stringify(packedAssets)};
const distMap: Record<string, { mime: string; data: Buffer }> = {};
for (const item of PACKED_ASSETS) {
  distMap[item.rel] = {
    mime: item.mime,
    data: zlib.gunzipSync(Buffer.from(item.gz, 'base64')),
  };
}
(globalThis as { __WRISTPORT_EMBEDDED_DIST__?: typeof distMap }).__WRISTPORT_EMBEDDED_DIST__ = distMap;

require('../server.ts');
`;
  fs.writeFileSync(entryTsPath, entrySource, 'utf-8');

  console.log('[build:exe] 3/5 Bundling standalone server with esbuild...');
  const bundlePath = path.join(BUILD_DIR, 'wristport.cjs');
  await esbuild.build({
    entryPoints: [entryTsPath],
    bundle: true,
    platform: 'node',
    target: `node${NODE_VERSION.split('.')[0]}`,
    format: 'cjs',
    minify: true,
    outfile: bundlePath,
    external: ['vite', '@tailwindcss/vite', '@vitejs/plugin-react'],
    define: {
      'process.env.WRISTPORT_STANDALONE': '"1"',
      'process.env.NODE_ENV': '"production"',
    },
  });

  await testStandaloneBundle(bundlePath);

  console.log('[build:exe] 4/5 Generating Node Single Executable Application blob...');
  const seaBlobPath = path.join(BUILD_DIR, 'sea-prep.blob');
  const seaConfigPath = path.join(BUILD_DIR, 'sea-config.json');
  fs.writeFileSync(
    seaConfigPath,
    JSON.stringify(
      {
        main: bundlePath,
        output: seaBlobPath,
        disableExperimentalSEAWarning: true,
        useSnapshot: false,
        useCodeCache: false,
      },
      null,
      2
    )
  );
  execFileSync(process.execPath, ['--experimental-sea-config', seaConfigPath], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  console.log('[build:exe] 5/5 Packaging release/wristport.exe...');
  const winNodeBuf = stripPeSignature(await getWindowsNodeBinary());
  fs.writeFileSync(OUT_EXE, winNodeBuf);
  const blobBuf = fs.readFileSync(seaBlobPath);
  await inject(OUT_EXE, 'NODE_SEA_BLOB', blobBuf, {
    sentinelFuse: SENTINEL_FUSE,
    overwrite: true,
  });

  verifyPeBinary(OUT_EXE);
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, '.cache'), { recursive: true, force: true });
  console.log(`[build:exe] Success! Created ${path.relative(ROOT, OUT_EXE)}`);
}

main().catch((err) => {
  console.error('[build:exe] Failed:', err);
  process.exit(1);
});
