import type { Candle } from './market';

export type PlotLine = { title: string; color: string; values: (number | null)[] };
export type Signal = { index: number; side: 'BUY' | 'SELL'; price: number };
export type RunResult = { plots: PlotLine[]; signals: Signal[]; logs: string[] };

const DEFAULT_SCRIPT = `//@version=5
indicator("EMA Crossover", overlay=true)
fastLength = input.int(9, "Fast EMA")
slowLength = input.int(21, "Slow EMA")
fast = ta.ema(close, fastLength)
slow = ta.ema(close, slowLength)
plot(fast, "Fast EMA", color=color.aqua, linewidth=2)
plot(slow, "Slow EMA", color=color.orange, linewidth=2)
buySignal = ta.crossover(fast, slow)
sellSignal = ta.crossunder(fast, slow)
plotshape(buySignal, title="Buy", style=shape.triangleup, location=location.belowbar, color=color.lime)
plotshape(sellSignal, title="Sell", style=shape.triangledown, location=location.abovebar, color=color.red)`;

export { DEFAULT_SCRIPT };

function lengthOf(script: string, name: string, fallback: number): number {
  const match = script.match(new RegExp(name + String.raw`\\s*=\\s*input\\.int\\(\\s*(\\d+)`));
  return match ? Math.max(1, Math.min(500, Number(match[1]))) : fallback;
}
function ema(values: number[], length: number): (number | null)[] {
  const out: (number | null)[] = [];
  const alpha = 2 / (length + 1);
  let current = 0;
  values.forEach((v, i) => {
    current = i === 0 ? v : v * alpha + current * (1 - alpha);
    out.push(i < length - 1 ? null : current);
  });
  return out;
}
function sma(values: number[], length: number): (number | null)[] {
  return values.map((_, i) => i < length - 1 ? null : values.slice(i - length + 1, i + 1).reduce((a, b) => a + b, 0) / length);
}
function colorFrom(script: string, variable: string, fallback: string): string {
  const line = script.match(new RegExp(String.raw`plot\\(\\s*${variable}\\s*,[^\\n]*color\\s*=\\s*color\\.(\\w+)`));
  const named: Record<string, string> = { aqua: '#22d3ee', orange: '#f59e0b', lime: '#84cc16', red: '#ef4444', blue: '#3b82f6', yellow: '#eab308', white: '#ffffff', fuchsia: '#d946ef', teal: '#14b8a6', gray: '#9ca3af' };
  return line ? (named[line[1]] ?? fallback) : fallback;
}

export function runPine(script: string, candles: Candle[]): RunResult {
  const logs: string[] = [];
  if (!script.includes('indicator(') && !script.includes('strategy(')) throw new Error('Add indicator() or strategy() to your script.');
  const closes = candles.map(c => c.close);
  const fastLen = lengthOf(script, 'fastLength', 9);
  const slowLen = lengthOf(script, 'slowLength', 21);
  const hasFast = /ta\.ema\(\s*close\s*,/.test(script) || /ta\.ema\(close,/.test(script);
  const hasSma = /ta\.sma\(/.test(script);
  const plots: PlotLine[] = [];
  const vars = new Map<string, (number | null)[]>();
  const assignments = [...script.matchAll(/^\s*(\w+)\s*=\s*ta\.(ema|sma)\(\s*(close|hl2|open|high|low)\s*,\s*(\w+|\d+)\s*\)/gm)];
  for (const match of assignments) {
    const [, variable, kind, source, period] = match;
    const n = /^\d+$/.test(period) ? Number(period) : period === 'fastLength' ? fastLen : period === 'slowLength' ? slowLen : 14;
    const input = candles.map(c => source === 'open' ? c.open : source === 'high' ? c.high : source === 'low' ? c.low : source === 'hl2' ? (c.high + c.low) / 2 : c.close);
    vars.set(variable, kind === 'ema' ? ema(input, n) : sma(input, n));
  }
  if (!assignments.length && hasFast) vars.set('ema', ema(closes, fastLen));
  const plotCalls = [...script.matchAll(/plot\(\s*(\w+)\s*,\s*"([^"]+)"[^\n]*\)/g)];
  for (const match of plotCalls) {
    const [, variable, title] = match;
    const values = vars.get(variable);
    if (values) plots.push({ title, color: colorFrom(script, variable, plots.length ? '#f59e0b' : '#22d3ee'), values });
  }
  if (!plots.length && hasFast) plots.push({ title: 'EMA', color: '#22d3ee', values: ema(closes, fastLen) });
  const signals: Signal[] = [];
  const crossoverVars = [...script.matchAll(/(\w+)\s*=\s*ta\.(crossover|crossunder)\(\s*(\w+)\s*,\s*(\w+)\s*\)/g)];
  for (const match of crossoverVars) {
    const [, , direction, aName, bName] = match;
    const a = vars.get(aName), b = vars.get(bName);
    if (!a || !b) continue;
    for (let i = 1; i < candles.length; i++) {
      if (a[i] == null || b[i] == null || a[i - 1] == null || b[i - 1] == null) continue;
      const crossed = direction === 'crossover' ? a[i - 1]! <= b[i - 1]! && a[i]! > b[i]! : a[i - 1]! >= b[i - 1]! && a[i]! < b[i]!;
      if (crossed) signals.push({ index: i, side: direction === 'crossover' ? 'BUY' : 'SELL', price: candles[i].close });
    }
  }
  if (hasSma) logs.push('SMA calculations detected.');
  logs.push(`Processed ${candles.length} candles. ${plots.length} plot(s), ${signals.length} crossover signal(s).`);
  logs.push('Supported subset: indicator(), input.int(), close/open/high/low/hl2, ta.ema(), ta.sma(), ta.crossover(), ta.crossunder(), plot().');
  logs.push('This is an early compatibility engine, not the official TradingView Pine runtime.');
  return { plots, signals, logs };
}