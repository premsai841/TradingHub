import { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, createSeriesMarkers, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts';
import { Activity, Play, Pause, SkipBack, SkipForward, Code2, CandlestickChart, RotateCcw, Terminal, Zap } from 'lucide-react';
import { DEFAULT_SCRIPT, runPine, type RunResult } from './engine/pine';
import { loadCandles, type Candle } from './engine/market';

export default function App() {
  const chartHost = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineRefs = useRef<ISeriesApi<'Line'>[]>([]);
  const markersRef = useRef<ReturnType<typeof createSeriesMarkers> | null>(null);
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState('');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1m');
  const [replay, setReplay] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const visible = useMemo(() => replay ? candles.slice(0, Math.max(1, cursor + 1)) : candles, [candles, cursor, replay]);

  useEffect(() => { loadCandles(symbol, interval).then(data => { setCandles(data); setCursor(data.length - 1); setResult(null); }); }, [symbol, interval]);
  useEffect(() => {
    if (!chartHost.current) return;
    const chart = createChart(chartHost.current, { autoSize: true, layout: { background: { color: '#080d17' }, textColor: '#8995a9', fontFamily: 'Inter, sans-serif' }, grid: { vertLines: { color: '#151e2c' }, horzLines: { color: '#151e2c' } }, rightPriceScale: { borderColor: '#202b3c' }, timeScale: { borderColor: '#202b3c', timeVisible: true, secondsVisible: false }, crosshair: { vertLine: { color: '#64748b' }, horzLine: { color: '#64748b' } } });
    const candle = chart.addSeries(CandlestickSeries, { upColor: '#16b981', downColor: '#ef5350', borderUpColor: '#16b981', borderDownColor: '#ef5350', wickUpColor: '#16b981', wickDownColor: '#ef5350' });
    chartRef.current = chart; candleRef.current = candle;
    const resize = new ResizeObserver(() => chart.timeScale().fitContent());
    resize.observe(chartHost.current);
    return () => { resize.disconnect(); chart.remove(); chartRef.current = null; };
  }, []);
  useEffect(() => {
    if (!candleRef.current || !visible.length) return;
    candleRef.current.setData(visible.map(c => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })));
    if (!markersRef.current) markersRef.current = createSeriesMarkers(candleRef.current, []);
    markersRef.current.setMarkers((result?.signals ?? []).filter(s => s.index < visible.length).map(s => ({ time: candles[s.index].time as Time, position: s.side === 'BUY' ? 'belowBar' : 'aboveBar', color: s.side === 'BUY' ? '#22c99a' : '#ef5350', shape: s.side === 'BUY' ? 'arrowUp' : 'arrowDown', text: s.side })));
    lineRefs.current.forEach(s => chartRef.current?.removeSeries(s)); lineRefs.current = [];
    if (result) result.plots.forEach(p => {
      const series = chartRef.current!.addSeries(LineSeries, { color: p.color, lineWidth: 2, title: p.title, priceLineVisible: false, lastValueVisible: true });
      series.setData(visible.flatMap((c, i) => p.values[i] == null ? [] : [{ time: c.time as Time, value: p.values[i]! }]));
      lineRefs.current.push(series);
    });
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  }, [visible, result]);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setCursor(c => { if (c >= candles.length - 1) { setPlaying(false); return c; } return c + 1; }), 350);
    return () => window.clearInterval(id);
  }, [playing, candles.length]);
  function run() { try { const output = runPine(script, candles); setResult(output); setError(''); setReplay(false); setCursor(candles.length - 1); } catch (e) { setError(e instanceof Error ? e.message : 'Script error'); } }
  function startReplay() { setReplay(true); setPlaying(false); setCursor(Math.max(0, candles.length - 80)); }
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-icon"><Activity size={19}/></div><span>TRADING<span className="brand-accent">HUB</span></span><small> BETA</small></div><div className="top-meta"><span className="status-dot"/> ENGINE ONLINE <span className="top-divider"/> FREE WORKSPACE</div></header>
    <section className="toolbar"><div className="market-select"><CandlestickChart size={16}/><select value={symbol} onChange={e=>setSymbol(e.target.value)}><option value="BTCUSDT">BTC / USDT</option><option value="ETHUSDT">ETH / USDT</option><option value="SOLUSDT">SOL / USDT</option></select></div><div className="intervals">{['1m','5m','15m','1h','4h','1d'].map(v=><button className={interval===v?'active':''} onClick={()=>setInterval(v)} key={v}>{v}</button>)}</div><div className="toolbar-right"><span className="data-label">BINANCE DATA · DEMO FALLBACK</span><button className="icon-button" onClick={()=>loadCandles(symbol,interval).then(setCandles)} title="Refresh"><RotateCcw size={15}/></button></div></section>
    <section className="workspace"><div className="chart-panel"><div className="panel-heading"><div><span className="eyebrow">MARKET OVERVIEW</span><h2>{symbol.replace('USDT','')} <span>/ USDT</span></h2></div><div className="chart-legend"><span><i className="green"/> Bullish</span><span><i className="red"/> Bearish</span></div></div><div className="chart-area" ref={chartHost}/><div className="chart-footer"><span>● {candles.length} HISTORICAL BARS LOADED</span><span>Times shown in UTC</span></div></div>
    <aside className="editor-panel"><div className="panel-heading editor-heading"><div><span className="eyebrow">PINE SCRIPT WORKSPACE</span><h2><Code2 size={18}/> Script Editor</h2></div><span className="version-tag">v5 subset</span></div><div className="editor-toolbar"><span>main.pine</span><span>● Unsaved changes</span></div><textarea spellCheck={false} value={script} onChange={e=>setScript(e.target.value)} aria-label="Pine Script editor"/><div className="editor-actions"><button className="run-button" onClick={run}><Play size={15} fill="currentColor"/> Run Script</button><button className="replay-button" onClick={startReplay}><SkipBack size={15}/> Bar Replay</button></div>{error&&<div className="error-box">{error}</div>}<div className="engine-note"><Zap size={14}/> First milestone supports EMA/SMA plots and crossover signals. More Pine features will be added incrementally.</div></aside></section>
    <section className="bottom-panel"><div className="bottom-title"><div><Terminal size={16}/><b>OUTPUT CONSOLE</b></div><span>{result?'SCRIPT EXECUTED':'WAITING FOR RUN'}</span></div>{result?<div className="console-lines">{result.logs.map((l,i)=><p key={i}><span>{String(i+1).padStart(2,'0')}</span>{l}</p>)}{result.signals.slice(-5).map((s,i)=><p key={'s'+i} className={s.side==='BUY'?'buy-text':'sell-text'}><span>↳</span>{s.side} signal · {s.price.toFixed(2)} · bar #{s.index}</p>)}</div>:<p className="empty-console">Run your Pine Script to see compiler messages, indicator output and signals here.</p>}</section>
    {replay&&<section className="replay-bar"><div className="replay-label"><span className="replay-live"/> BAR REPLAY <small>{cursor+1} / {candles.length}</small></div><div className="replay-controls"><button onClick={()=>{setPlaying(false);setCursor(0)}} title="Beginning"><SkipBack size={16}/></button><button className="play-control" onClick={()=>setPlaying(v=>!v)}>{playing?<Pause size={16}/>:<Play size={16} fill="currentColor"/>}</button><button onClick={()=>setCursor(c=>Math.min(candles.length-1,c+1))} title="Next bar"><SkipForward size={16}/></button><input type="range" min="0" max={Math.max(0,candles.length-1)} value={cursor} onChange={e=>{setPlaying(false);setCursor(+e.target.value)}}/></div><button className="close-replay" onClick={()=>{setPlaying(false);setReplay(false)}}>Exit replay</button></section>}
    <footer><span>TRADING HUB <b>0.1.0</b></span><span>Independent open-source project · Not affiliated with TradingView</span><span>Market data availability depends on provider terms.</span></footer>
  </main>;
}