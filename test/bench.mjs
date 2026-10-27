import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import { loadScore, analyzeLine, playbackOrder, defaultTempoRows } from '../src/score-parser.js';
import { renderPlan, mix, makeSounds, decodeRecorded, encodeWav } from '../src/audio-engine.js';
import { mixNotes, guessInstrument, setBank } from '../src/melody-engine.js';
const T = () => performance.now();
if (process.env.BANKDIR) for (const f of fs.readdirSync(new URL('../banks', import.meta.url)).filter(f => f.endsWith('.json'))) { const n = f.slice(0, -5); const raw = fs.readFileSync(process.env.BANKDIR + '/' + n + '.f32'); setBank(n, JSON.parse(fs.readFileSync(new URL('../banks/' + f, import.meta.url))), new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4)); }
let t = T(); const S = { ...makeSounds(), ...decodeRecorded(JSON.parse(fs.readFileSync(new URL('../src/samples.json', import.meta.url), 'utf8'))) }; console.log('sounds init ms', (T() - t).toFixed(0));
const f = process.argv[2];
t = T(); const sc = await loadScore(pdfjs, new Uint8Array(fs.readFileSync(f))); console.log('loadScore ms', (T() - t).toFixed(0), 'pages', sc.numPages, 'lines', sc.lines.length);
t = T(); const res = sc.lines.map((l, id) => { const t0 = T(); const r = analyzeLine(sc, id); return { id, r, ms: T() - t0 }; }); console.log('analyze all lines ms', (T() - t).toFixed(0), res.map(x => x.ms.toFixed(0)).join(' '));
const master = res.sort((a, b) => b.r.bars.length - a.r.bars.length)[0];
const bars = master.r.bars.map(b => ({ ...b, events: [] })); const byNum = new Map(bars.map((b, i) => [b.number, i]));
const melodic = {}, sounds = {};
for (const { id, r } of res) { r.bars.forEach(b => { const k = byNum.get(b.number); if (k != null) for (const e of b.events) bars[k].events.push({ ...e, line: String(id) }); });
  if (sc.lines[id].clef === 'pitched') melodic[id] = { inst: guessInstrument(sc.lines[id].label) || 'gayageum', oct: 0 }; else { sounds[id + ':R'] = '따'; sounds[id + ':L'] = '궁'; } }
const order = playbackOrder(bars);
t = T(); const plan = renderPlan(bars, order, { tempoRows: defaultTempoRows(bars), speed: 1, sounds, melodic, lineGain: {}, countIn: false }); console.log('renderPlan ms', (T() - t).toFixed(0), 'notes', plan.notes.length, 'hits', plan.hits.length, 'sec', plan.total.toFixed(0));
t = T(); const buf = mix(plan, S, {}, null, false); console.log('mix perc ms', (T() - t).toFixed(0));
t = T(); mixNotes(buf, plan.notes); console.log('mixNotes ms', (T() - t).toFixed(0));
t = T(); mixNotes(buf, plan.notes); console.log('mixNotes 2nd (cache) ms', (T() - t).toFixed(0));
t = T(); const w = encodeWav(buf); console.log('encodeWav ms', (T() - t).toFixed(0), 'MB', (w.byteLength / 1e6).toFixed(1));
console.log('heap MB', (process.memoryUsage().heapUsed / 1e6).toFixed(0), 'rss', (process.memoryUsage().rss / 1e6).toFixed(0));
