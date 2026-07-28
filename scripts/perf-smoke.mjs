/**
 * Cold/warm response-time harness for CASE Home + Store critical path.
 * Run: node scripts/perf-smoke.mjs
 * Optional: API_BASE=http://127.0.0.1:5000/api/v1 node scripts/perf-smoke.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvApi() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return null;
  const text = readFileSync(envPath, 'utf8');
  const m = text.match(/^EXPO_PUBLIC_API_URL=(.+)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

const API_BASE =
  process.env.API_BASE ||
  loadEnvApi() ||
  'http://127.0.0.1:5000/api/v1';

const THRESHOLDS = {
  bootstrap: 2500,
  popular: 2500,
  storePage: 3000,
  menu: 2500,
  quote: 3000,
};

function ms(n) {
  return `${Math.round(n)}ms`;
}

function grade(elapsed, limit) {
  if (elapsed <= limit * 0.4) return '🟢';
  if (elapsed <= limit) return '🟡';
  return '🔴';
}

async function timedFetch(label, path, init) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const t0 = performance.now();
  let status = 0;
  let bytes = 0;
  let err = null;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {}),
      },
    });
    status = res.status;
    const buf = await res.arrayBuffer();
    bytes = buf.byteLength;
    if (!res.ok) err = `HTTP ${res.status}`;
    let json = null;
    try {
      json = JSON.parse(Buffer.from(buf).toString('utf8'));
    } catch {
      /* ignore */
    }
    const elapsed = performance.now() - t0;
    return { label, path, elapsed, status, bytes, err, json };
  } catch (e) {
    const elapsed = performance.now() - t0;
    return {
      label,
      path,
      elapsed,
      status: 0,
      bytes: 0,
      err: String(e?.message || e),
      json: null,
    };
  }
}

function printRow(r, limit) {
  const icon = r.err ? '❌' : grade(r.elapsed, limit);
  const extra = r.err ? ` ERR=${r.err}` : ` ${r.bytes}B`;
  console.log(
    `  ${icon} ${r.label.padEnd(14)} ${ms(r.elapsed).padStart(8)}  HTTP ${String(r.status).padStart(3)}  ${r.path}${extra}`,
  );
}

async function runPass(name) {
  console.log(`\n══ ${name} ══`);
  const results = [];

  const bootstrap = await timedFetch('bootstrap', '/public/bootstrap');
  results.push({ r: bootstrap, limit: THRESHOLDS.bootstrap });
  printRow(bootstrap, THRESHOLDS.bootstrap);

  const popular = await timedFetch('popular', '/public/popular-near-you?limit=24');
  results.push({ r: popular, limit: THRESHOLDS.popular });
  printRow(popular, THRESHOLDS.popular);

  const merchants =
    bootstrap.json?.data?.popularNearYou ??
    popular.json?.data?.items ??
    popular.json?.data ??
    [];
  const list = Array.isArray(merchants) ? merchants : merchants?.items ?? [];
  const firstId = String(list[0]?.id || list[0]?._id || '');

  let storePage = null;
  let menu = null;
  if (firstId) {
    storePage = await timedFetch('store-page', `/restaurants/${firstId}/store-page`);
    results.push({ r: storePage, limit: THRESHOLDS.storePage });
    printRow(storePage, THRESHOLDS.storePage);

    menu = await timedFetch('menu', `/case/merchants/${firstId}/menu`);
    results.push({ r: menu, limit: THRESHOLDS.menu });
    printRow(menu, THRESHOLDS.menu);
  } else {
    console.log('  ⚠️  No merchant id — skipped store-page / menu');
  }

  const points = bootstrap.json?.data?.deliveryPoints ?? [];
  const pointId = points[0]?.id || points[0]?._id;
  const quoteBody = {
    deliveryPointId: pointId || undefined,
    lines: firstId
      ? [{ merchantId: firstId, quantity: 1, unitPrice: 500 }]
      : [{ merchantId: 'unknown', quantity: 1, unitPrice: 500 }],
  };
  const quote = await timedFetch('quote', '/public/quote', {
    method: 'POST',
    body: JSON.stringify(quoteBody),
  });
  results.push({ r: quote, limit: THRESHOLDS.quote });
  printRow(quote, THRESHOLDS.quote);

  const total = results.reduce((s, x) => s + x.r.elapsed, 0);
  const fails = results.filter((x) => x.r.err || x.r.elapsed > x.limit);
  console.log(
    `  ── pass total ${ms(total)} · ${results.length - fails.length}/${results.length} within threshold`,
  );
  return { results, fails, total, merchantId: firstId };
}

async function main() {
  console.log('CASE perf smoke');
  console.log(`API_BASE = ${API_BASE}`);

  // Health
  const health = await timedFetch('health', API_BASE.replace(/\/api\/v1\/?$/, '') + '/api/v1/health');
  if (health.err || health.status >= 400) {
    // try /health without rewrite
    const h2 = await timedFetch('health', '/../health'.replace('/../', '/'));
    void h2;
  }
  const ping = await timedFetch('health', API_BASE.endsWith('/api/v1') ? API_BASE.replace(/\/api\/v1$/, '/api/v1/health') : `${API_BASE}/health`);
  // Many apps expose /api/v1/health — try both
  let ok = false;
  for (const p of ['/health', '']) {
    const r = await timedFetch('ping', p === '' ? '/public/categories' : p);
    if (!r.err && r.status && r.status < 500) {
      ok = true;
      console.log(`Reachable ✓ (${r.label} ${ms(r.elapsed)})`);
      break;
    }
  }
  if (!ok) {
    console.error('Backend not reachable. Start clone-backend (npm run dev) and retry.');
    process.exit(1);
  }

  const cold = await runPass('COLD (1st hit)');
  // brief pause then warm
  await new Promise((r) => setTimeout(r, 300));
  const warm = await runPass('WARM (cached / pool hot)');

  console.log('\n══ SUMMARY ══');
  console.log(`Cold total: ${ms(cold.total)} · Warm total: ${ms(warm.total)}`);
  if (cold.merchantId) console.log(`Sample merchant: ${cold.merchantId}`);

  const stillSlow = [...cold.fails, ...warm.fails].filter((x) => !x.r.err);
  const hardFail = [...cold.fails, ...warm.fails].filter((x) => x.r.err);

  if (hardFail.length) {
    console.log('\nHard failures:');
    hardFail.forEach((x) => console.log(`  - ${x.r.label}: ${x.r.err}`));
  }
  if (stillSlow.length) {
    console.log('\nOver threshold (network/DB — not client render):');
    stillSlow.forEach((x) =>
      console.log(`  - ${x.r.label}: ${ms(x.r.elapsed)} > ${ms(x.limit)}`),
    );
  } else if (!hardFail.length) {
    console.log('\nAll measured endpoints within thresholds on this host.');
  }

  console.log(`
Note: This script measures SERVER+NETWORK from this machine.
Phone afterParse (JS render) is separate — watch Metro [GAP] lines on device.
`);

  process.exit(hardFail.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
