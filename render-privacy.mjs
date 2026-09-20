#!/usr/bin/env node
/**
 * Renders privacy/index.html from the app repository's docs/privacy-policy.md,
 * so the published policy and the one in the repo cannot say different things.
 *
 *   node render-privacy.mjs [path/to/privacy-policy.md]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(process.argv[2] ?? join(here, '..', 'sbl-app', 'docs', 'privacy-policy.md'));
const md = readFileSync(source, 'utf8');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1">$1</a>')
    .replace(/([a-z0-9._-]+@citedlifting\.com)/gi, '<a href="mailto:$1">$1</a>');

const body = [];
let para = [];
let list = [];
const flushPara = () => { if (para.length) { body.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
const flushList = () => { if (list.length) { body.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>`); list = []; } };
let first = true;
for (const raw of md.split('\n')) {
  const line = raw.trimEnd();
  if (first && line.startsWith('# ')) { first = false; continue; } // the page has its own H1
  first = false;
  if (line.startsWith('> ')) continue; // repo-only notes
  if (line.startsWith('**Last updated')) { flushPara(); body.push(`<p class="meta">${inline(line.replace(/\*\*/g, ''))}</p>`); continue; }
  if (line === '---') { flushPara(); flushList(); body.push('<hr>'); continue; }
  if (line.startsWith('## ')) { flushPara(); flushList(); body.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
  if (line.startsWith('- ')) { flushPara(); list.push(line.slice(2)); continue; }
  if (line.startsWith('  ') && list.length) { list[list.length - 1] += ' ' + line.trim(); continue; }
  if (line === '') { flushPara(); flushList(); continue; }
  para.push(line);
}
flushPara(); flushList();

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy policy — Cited</title>
<meta name="description" content="What the Cited app collects, where it goes, and what it never touches.">
<meta name="theme-color" content="#0B0D10">
<link rel="icon" href="/favicon.png"><link rel="apple-touch-icon" href="/icon.png">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<header><div class="wrap">
  <a class="brand" href="/"><img src="/icon.png" alt="">Cited</a>
  <nav><a href="/privacy/">Privacy</a><a href="/support/">Support</a></nav>
</div></header>
<main class="wrap prose">
  <p class="eyebrow">PRIVACY POLICY</p>
  <h1 style="font-size:40px">What Cited collects, and what it never touches.</h1>
${body.map((b) => '  ' + b).join('\n')}
</main>
<footer><div class="wrap">
  <span>© 2026 Ernst Development LLC</span>
  <span><a href="/privacy/">Privacy policy</a> · <a href="/support/">Support</a> · <a href="mailto:support@citedlifting.com">support@citedlifting.com</a></span>
</div></footer>
</body>
</html>
`;
writeFileSync(join(here, 'privacy', 'index.html'), html);
console.log(`privacy/index.html rendered from ${source} (${body.length} blocks)`);
