// FineTune v4 — the tuning voice of the knob (from v3): a 25 % pulse wave with a hard attack and a
// long synthetic reverb, walking a scale in thirds as the dial moves. Browsers only allow sound
// after a real click / tap / key press, so it stays silent until then; Motion off = silent.

const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];
const DIAL = [-12, -10, -8, -7, -5, -3, -1, ...SCALE, 26, 28, 29, 31, 33, 35, 36];
let AC = null, verb = null, PULSE = null, pos = 7, dir = 1, allowed = () => true;

function ctx() {
  if (AC) return AC;
  const Ctor = window.AudioContext || window.webkitAudioContext; if (!Ctor) return null;
  AC = new Ctor();
  const len = Math.floor(AC.sampleRate * 4.6), buf = AC.createBuffer(2, len, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2); }
  verb = AC.createConvolver(); verb.buffer = buf;
  const wet = AC.createGain(); wet.gain.value = 1.05; verb.connect(wet).connect(AC.destination);
  return AC;
}
const unlock = () => { const a = ctx(); if (a && a.state !== "running") a.resume().catch(() => {}); };
["pointerup", "keydown"].forEach((ev) => addEventListener(ev, unlock, { capture: true, once: false, passive: true }));

export function setSoundGate(fn) { allowed = fn; }
export function note(semi, { gain = 0.05, dur = 0.07, when = 0 } = {}) {
  if (!AC || AC.state !== "running" || !allowed()) return;
  if (!PULSE) { const n = 48, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25); PULSE = AC.createPeriodicWave(re, im); }
  const t = AC.currentTime + when, f = 392 * Math.pow(2, semi / 12), g = AC.createGain(), lp = AC.createBiquadFilter();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * 2.2, t + 0.001); g.gain.exponentialRampToValueAtTime(gain * 0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02);
  lp.type = "lowpass"; lp.Q.value = 0.7; lp.frequency.value = 7000;
  const o = AC.createOscillator(); o.setPeriodicWave(PULSE); o.frequency.value = f; o.connect(lp); o.start(t); o.stop(t + dur + 0.03);
  lp.connect(g); g.connect(AC.destination); g.connect(verb);
}
/** one station further on the dial: moves two scale degrees in the turning direction, bouncing at the ends */
export function step(turn = 1) {
  let p = pos + 2 * turn * dir;
  if (p < 0 || p >= DIAL.length) { dir = -dir; p = pos + 2 * turn * dir; }
  pos = Math.max(0, Math.min(DIAL.length - 1, p));
  note(DIAL[pos]);
}
export const press = () => { note(DIAL[pos] - 12, { gain: 0.06, dur: 0.1 }); note(DIAL[pos] + 7, { gain: 0.04, dur: 0.08, when: 0.07 }); };
