export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export function makeDemoCandles(count = 500): Candle[] {
  const rows: Candle[] = [];
  let price = 62000;
  const now = Math.floor(Date.now() / 60000);
  for (let i = count; i > 0; i--) {
    const drift = Math.sin(i / 17) * 24 + Math.cos(i / 43) * 13 + (Math.random() - 0.48) * 95;
    const open = price;
    const close = Math.max(100, open + drift);
    const wick = Math.random() * 45 + 8;
    rows.push({ time: (now - i) * 60, open, close, high: Math.max(open, close) + wick, low: Math.min(open, close) - wick, volume: 10 + Math.random() * 90 });
    price = close;
  }
  return rows;
}

export async function loadCandles(symbol = 'BTCUSDT', interval = '1m'): Promise<Candle[]> {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`);
    if (!response.ok) throw new Error('Market data request failed');
    const raw: unknown[][] = await response.json();
    return raw.map(k => ({ time: Math.floor(Number(k[0]) / 1000), open: Number(k[1]), high: Number(k[2]), low: Number(k[3]), close: Number(k[4]), volume: Number(k[5]) }));
  } catch {
    return makeDemoCandles();
  }
}