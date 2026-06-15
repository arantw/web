// sort-viz.jsx
// Renders the bar chart for a sorting timeline + the App (Stage + Tweaks).
// Depends on: animations.jsx (Stage, useTime, Easing, clamp),
//             sort-algos.jsx (buildTimeline, genValues, ALGO_LABELS),
//             tweaks-panel.jsx (useTweaks, TweaksPanel, Tweak* controls).

const W = 1920, H = 1080;
const MARGIN_X = 190;
const BASELINE = 858;          // y of the chart baseline (bars grow up from here)
const MAX_BAR = 600;           // px height of the tallest bar
const PLOT_W = W - 2 * MARGIN_X;
const MONO = "'DM Mono', ui-monospace, SFMono-Regular, monospace";
const SANS = "'Inter Tight', Inter, system-ui, sans-serif";

const PAPER = '#F2EEE5';
const PENDING = '#C6C0B2';
const SORTED = '#2A2722';
const INK = '#2A2722';
const HOP = 230;               // lift of the over-arcing swap bar

const BASE_SPW = 0.34;         // seconds per weight-unit at 1× speed

// ── one bar ─────────────────────────────────────────────────────────────────
function colorFor(pose, id, accent) {
  if (pose.swapping && pose.swapping.indexOf(id) !== -1) return { fill: accent, hot: true };
  if (pose.comparing && pose.comparing.indexOf(id) !== -1) return { fill: accent, hot: true };
  if (pose.pivot === id) return { fill: `color-mix(in oklab, ${accent} 52%, ${PAPER})`, pivot: true };
  if (pose.sorted.indexOf(id) !== -1) return { fill: SORTED };
  return { fill: PENDING };
}

function SortBars({ timeline, accent, showNumbers, spw }) {
  const t = useTime();                       // seconds
  const { poses, T, sortedWeight, n, values } = timeline;
  const maxVal = Math.max.apply(null, values);
  const slotW = PLOT_W / n;
  const barW = Math.min(82, slotW * 0.58);

  const wt = t / spw;                        // weight-time

  // locate segment A -> B
  let A, B, p;
  if (wt <= T[0]) { A = poses[0]; B = poses[0]; p = 0; }
  else {
    let i = 0;
    while (i < T.length - 1 && T[i] < wt) i++;
    const t0 = T[i - 1], t1 = T[i];
    p = (wt - t0) / Math.max(1e-6, t1 - t0);
    A = poses[i - 1]; B = poses[i];
  }
  p = clamp(p, 0, 1);
  const pe = Easing.easeInOutCubic(p);

  const cx = (slot) => MARGIN_X + slotW * (slot + 0.5);
  const finaleW = wt - sortedWeight;         // weight-units into the finale

  const bars = [];
  for (let id = 0; id < n; id++) {
    const v = values[id];
    const barH = Math.max(26, (v / maxVal) * MAX_BAR);
    const slotA = A.order.indexOf(id);
    const slotB = B.order.indexOf(id);
    const slot = slotA + (slotB - slotA) * pe;
    const x = cx(slot);

    // swap = pure horizontal translate: both bars glide along the baseline and
    // cross past each other (the moving pair rides above the stationary bars).
    let hop = 0, swapping = false, zLift = 10;
    if (B.swapping && B.swapping.indexOf(id) !== -1 && slotA !== slotB) {
      swapping = true;
      zLift = slotB > slotA ? 60 : 50;   // distinct z so the pair doesn't z-fight
    }

    let { fill, hot, pivot } = colorFor(B, id, accent);

    // finale ripple sweep across the sorted bars
    if (finaleW > 0) {
      const local = finaleW - slot * 0.16;
      if (local > 0 && local < 0.55) {
        const k = Math.sin((local / 0.55) * Math.PI);
        fill = `color-mix(in oklab, ${accent} ${Math.round(k * 100)}%, ${SORTED})`;
      }
    }

    bars.push(
      <div key={id} style={{
        position: 'absolute', left: 0, top: 0,
        transform: `translate(${x}px, ${hop}px)`,
        zIndex: swapping ? zLift : (hot ? 30 : 10),
        willChange: 'transform',
      }}>
        <div style={{
          position: 'absolute',
          left: -barW / 2, top: BASELINE - barH,
          width: barW, height: barH,
          background: fill,
          borderRadius: '5px 5px 2px 2px',
          boxShadow: swapping ? '0 10px 22px -10px rgba(42,39,34,0.35)' : 'none',
          transition: 'background-color 130ms linear',
        }} />
        {showNumbers &&
          <div style={{
            position: 'absolute',
            left: -slotW / 2, top: BASELINE + 16,
            width: slotW, textAlign: 'center',
            fontFamily: MONO, fontSize: 25, fontWeight: 500,
            color: hot ? accent : INK,
            transition: 'color 130ms linear',
            fontVariantNumeric: 'tabular-nums',
          }}>{v}</div>}
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* baseline axis */}
      <div style={{
        position: 'absolute', left: MARGIN_X - 24, width: PLOT_W + 48,
        top: BASELINE, height: 2, background: 'rgba(42,39,34,0.16)',
      }} />
      {bars}
    </div>
  );
}

// ── static chrome (algo label + legend) ─────────────────────────────────────
function Chrome({ algoKey, accent }) {
  const swatch = (c, label) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 16, height: 16, borderRadius: 3, background: c }} />
      <span style={{ fontFamily: MONO, fontSize: 16, letterSpacing: '0.04em', color: 'rgba(42,39,34,0.62)' }}>{label}</span>
    </div>
  );
  return (
    <React.Fragment>
      <div style={{
        position: 'absolute', left: 80, top: 70,
        fontFamily: MONO, fontSize: 22, letterSpacing: '0.28em',
        color: 'rgba(42,39,34,0.55)', fontWeight: 500,
      }}>{ALGO_LABELS[algoKey]}</div>
      <div style={{
        position: 'absolute', left: 80, top: 104,
        fontFamily: SANS, fontSize: 46, fontWeight: 600, letterSpacing: '-0.02em',
        color: INK, whiteSpace: 'nowrap',
      }}>n = 13</div>
      <div style={{
        position: 'absolute', right: 80, top: 78,
        display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start',
      }}>
        {swatch(accent, 'comparing')}
        {swatch(SORTED, 'sorted')}
        {swatch(PENDING, 'unsorted')}
      </div>
    </React.Fragment>
  );
}

// ── App ─────────────────────────────────────────────────────────────────────
const ACCENTS = ['#CC5B33', '#C2A23A', '#2F7D63', '#3667A6', '#8A54B8'];
const SPEEDS = { '0.5×': 0.5, '1×': 1, '1.5×': 1.5, '2×': 2 };
const ALGO_OPTS = { 'Bubble': 'bubble', 'Selection': 'selection', 'Insertion': 'insertion', 'Quick': 'quick' };

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "algorithm": "Bubble",
  "accent": "#CC5B33",
  "speed": "1×",
  "showNumbers": true,
  "seed": 7
}/*EDITMODE-END*/;

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const algoKey = ALGO_OPTS[tw.algorithm] || 'bubble';
  const speed = SPEEDS[tw.speed] || 1;

  const values = React.useMemo(() => genValues(tw.seed, 13), [tw.seed]);
  const timeline = React.useMemo(() => buildTimeline(values, algoKey), [values, algoKey]);
  const spw = BASE_SPW / speed;
  const duration = timeline.totalWeight * spw;

  return (
    <React.Fragment>
      <Stage
        key={`${algoKey}|${speed}|${tw.seed}`}
        width={W} height={H} duration={duration}
        background={PAPER} loop={true} autoplay={true}
        persistKey={`sortviz:${algoKey}`}
      >
        <Chrome algoKey={algoKey} accent={tw.accent} />
        <SortBars timeline={timeline} accent={tw.accent} showNumbers={tw.showNumbers} spw={spw} />
      </Stage>

      <TweaksPanel>
        <TweakSection label="Algorithm" />
        <TweakSelect label="Sort" value={tw.algorithm}
          options={Object.keys(ALGO_OPTS)}
          onChange={(v) => setTweak('algorithm', v)} />
        <TweakRadio label="Speed" value={tw.speed}
          options={Object.keys(SPEEDS)}
          onChange={(v) => setTweak('speed', v)} />
        <TweakButton label="Reshuffle numbers" onClick={() => setTweak('seed', tw.seed + 1)} />
        <TweakToggle label="Show values" value={tw.showNumbers}
          onChange={(v) => setTweak('showNumbers', v)} />
        <TweakSection label="Color" />
        <TweakColor label="Accent" value={tw.accent}
          options={ACCENTS}
          onChange={(v) => setTweak('accent', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
