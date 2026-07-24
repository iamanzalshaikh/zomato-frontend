#!/usr/bin/env node
/**
 * ⚡ QuickBite Frontend API Response Time Checker
 * Run: node scripts/check-response-times.mjs
 *
 * Hits every major API endpoint your frontend uses and measures response times.
 * Colour-codes each result: 🟢 fast (<300ms) | 🟠 warn (300-1000ms) | 🔴 slow (>1000ms)
 *
 * Requires: a running backend (npm run dev in clone-backend)
 * Edit BASE_URL below if your backend runs on a different port.
 */

import { performance } from 'perf_hooks';

const BASE_URL = process.env.API_URL ?? 'http://localhost:5000/api/v1';

// ── Paste a valid Bearer token here to test authenticated routes ───────────
// You can get one by logging in via Postman or the app.
const AUTH_TOKEN = process.env.TEST_TOKEN ?? '';

const headers = {
  'Content-Type': 'application/json',
  ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
};

// ── Endpoints to test ─────────────────────────────────────────────────────
const ENDPOINTS = [
  // Public / unauthenticated
  { label: 'Health Check',              url: `${BASE_URL}/health`,                                        auth: false },
  { label: 'Browse Restaurants (pg 1)', url: `${BASE_URL}/restaurants?page=1&limit=10&sort=rating`,       auth: false },
  { label: 'Search Restaurants',        url: `${BASE_URL}/restaurants/search?q=pizza&page=1&limit=10`,   auth: false },
  { label: 'Trending Searches',         url: `${BASE_URL}/search/trending`,                              auth: false },

  // Authenticated
  { label: 'My Profile',                url: `${BASE_URL}/users/profile`,                                 auth: true  },
  { label: 'My Cart',                   url: `${BASE_URL}/cart`,                                          auth: true  },
  { label: 'Order History',             url: `${BASE_URL}/orders/user/history`,                           auth: true  },
  { label: 'My Favorites',              url: `${BASE_URL}/users/favorites`,                               auth: true  },
  { label: 'My Notifications',          url: `${BASE_URL}/notifications`,                                 auth: true  },
  { label: 'Global Search (biryani)',   url: `${BASE_URL}/search?q=biryani`,                              auth: false },
];

// ── Runner ────────────────────────────────────────────────────────────────

function colorLabel(ms) {
  if (ms < 300)  return `\x1b[32m🟢 ${ms}ms\x1b[0m`;   // green
  if (ms < 1000) return `\x1b[33m🟠 ${ms}ms\x1b[0m`;   // yellow
  return              `\x1b[31m🔴 ${ms}ms\x1b[0m`;     // red
}

async function checkEndpoint({ label, url, auth }) {
  const reqHeaders = auth ? headers : { 'Content-Type': 'application/json' };

  if (auth && !AUTH_TOKEN) {
    console.log(`  ⏭  ${label.padEnd(35)} — skipped (no token)`);
    return null;
  }

  const t0 = performance.now();
  try {
    const res = await fetch(url, { headers: reqHeaders });
    const ms  = Math.round(performance.now() - t0);
    const tag = colorLabel(ms);
    const status = res.status;
    const statusIcon = status < 300 ? '✅' : status < 500 ? '⚠️ ' : '❌';
    console.log(`  ${statusIcon} ${label.padEnd(35)} ${tag}  (HTTP ${status})`);
    return { label, ms, status };
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    console.log(`  ❌ ${label.padEnd(35)} \x1b[31mERROR after ${ms}ms\x1b[0m — ${err.message}`);
    return { label, ms, status: 'ERR', error: err.message };
  }
}

async function run() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   ⚡ QuickBite — Frontend API Response Time Check        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n  Target: ${BASE_URL}`);
  if (!AUTH_TOKEN) {
    console.log('  ⚠️  No TEST_TOKEN set — authenticated routes will be skipped');
    console.log('     Set it with: TEST_TOKEN=<your_jwt> node scripts/check-response-times.mjs\n');
  } else {
    console.log('  🔐 Auth token: set ✅\n');
  }
  console.log('─'.repeat(62));

  const results = [];
  for (const ep of ENDPOINTS) {
    const r = await checkEndpoint(ep);
    if (r) results.push(r);
    // small stagger between requests to avoid rate-limiter
    await new Promise(r => setTimeout(r, 80));
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  const valid = results.filter(r => typeof r.ms === 'number' && r.status !== 'ERR');
  if (valid.length === 0) {
    console.log('\n  ⚠️  No results to summarise.');
    return;
  }

  const avg  = Math.round(valid.reduce((s, r) => s + r.ms, 0) / valid.length);
  const max  = Math.max(...valid.map(r => r.ms));
  const min  = Math.min(...valid.map(r => r.ms));
  const slow = valid.filter(r => r.ms > 1000);

  console.log('\n' + '─'.repeat(62));
  console.log('  📊 SUMMARY');
  console.log('─'.repeat(62));
  console.log(`  Average response time : ${colorLabel(avg)}`);
  console.log(`  Fastest endpoint      : ${colorLabel(min)}`);
  console.log(`  Slowest endpoint      : ${colorLabel(max)}`);
  if (slow.length > 0) {
    console.log(`\n  🔴 SLOW endpoints (>1s) — investigate these:`);
    slow.forEach(r => console.log(`     • ${r.label} → ${r.ms}ms`));
  } else {
    console.log(`\n  ✅ All endpoints responded within 1 second!`);
  }
  console.log('\n');
}

run().catch(err => {
  console.error('Script crashed:', err);
  process.exit(1);
});
