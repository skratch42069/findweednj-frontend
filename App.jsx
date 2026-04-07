import { useState, useMemo, useEffect } from "react";

// ===========================================================
//  FINDWEEDNJ -- Dashboard + Hidden Admin Panel
//  Admin: type "admin" anywhere or Ctrl+Shift+A
//  Password: findweed420
// ===========================================================

const ADMIN_PASSWORD = "findweed420";
const API_URL = "https://alluring-manifestation-production.up.railway.app";

// --- FEATURE FLAGS ----------------------------------------------------
// Set SHOW_PREDICTIONS to true once scraper has 30+ days of data (~May 13)
const SHOW_PREDICTIONS = false;


// --- ADMIN DATA STORAGE --------------------------------------------------
const ADMIN_STORAGE_KEY = "findweednj_analytics";

function loadAdminData() {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveAdminData(d) {
  try { localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(d)); } catch {}
}

// --- DEFAULT DATA -----------------------------------------------------
const DEFAULT_DATA = {
  businessGoal: 883,
  quitJobGoal: 6000,
  monthlyTarget: [50, 120, 200, 350, 500, 750, 900, 1100, 1400, 1700, 1850, 2000],
  revenuePerSub: 6.79,
  infraCost: 55,
  markets: [
    { id: "nj", name: "New Jersey", launched: true,  launchMonth: 1,  color: "#6a9e6f", dispensaries: 97,  targetSubs: 800  },
    { id: "ny", name: "New York",   launched: false, launchMonth: 4,  color: "#4a8fb5", dispensaries: 200, targetSubs: 900  },
    { id: "ma", name: "Massachusetts", launched: false, launchMonth: 10, color: "#c8a96e", dispensaries: 120, targetSubs: 300  },
    { id: "co", name: "Colorado",   launched: false, launchMonth: 16, color: "#9b72cf", dispensaries: 500, targetSubs: 660  },
    { id: "ca", name: "California", launched: false, launchMonth: 22, color: "#e07b6a", dispensaries: 800, targetSubs: 4500 },
  ],
  monthlyData: [
    { month: 1, label: "Apr 2026", subs: { nj: 48  }, trials: 142, visitors: 890,  churnPct: 0,    dispPartners: 0, notes: "Reddit launch post -- r/newjerseymarijuana" },
  ],
  dispensaryPartners: [],
  milestones: [
    { id: 1, label: "First 100 NJ subscribers",    target: 100,   achieved: false, date: null },
    { id: 2, label: "Launch NY",                    target: null,  achieved: false, date: null },
    { id: 3, label: "883 subs -- quit job threshold",target: 883,   achieved: false, date: null },
    { id: 4, label: "First dispensary partnership", target: null,  achieved: false, date: null },
    { id: 5, label: "2,000 total subscribers",      target: 2000,  achieved: false, date: null },
    { id: 6, label: "Launch MA",                    target: null,  achieved: false, date: null },
    { id: 7, label: "$10k/month revenue",           target: null,  achieved: false, date: null },
    { id: 8, label: "5,000 total subscribers",      target: 5000,  achieved: false, date: null },
  ],
  scraperHealth: {
    lastRun: "2026-04-05 18:52",
    successCount: 1,
    failCount: 96,
    topDispensary: "NAR Cannabis Mt Laurel",
    topProducts: 533,
  },
};

// --- HELPERS ----------------------------------------------------------
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatCurrency(n) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getTotalSubs(monthData) {
  if (!monthData?.subs) return 0;
  return Object.values(monthData.subs).reduce((s, v) => s + (v || 0), 0);
}

function calcRevenue(subs, revenuePerSub, infraCost, dispPartners) {
  const gross = subs * revenuePerSub;
  const partnerRev = dispPartners * 99;
  const net = gross + partnerRev - infraCost;
  return { gross, partnerRev, net };
}

// --- SPARKLINE --------------------------------------------------------
function Sparkline({ data, color = "#6a9e6f", height = 40, width = 120 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.split(" ").pop().split(",")[0]} cy={pts.split(" ").pop().split(",")[1]} r={3} fill={color} />
    </svg>
  );
}

// --- GAUGE ------------------------------------------------------------
function Gauge({ value, max, color, label, sublabel }) {
  const pct = Math.min(value / max, 1);
  const angle = pct * 180;
  const r = 60;
  const cx = 80, cy = 75;
  const toRad = a => (a - 180) * Math.PI / 180;
  const x1 = cx + r * Math.cos(toRad(0));
  const y1 = cy + r * Math.sin(toRad(0));
  const x2 = cx + r * Math.cos(toRad(angle));
  const y2 = cy + r * Math.sin(toRad(angle));
  const large = angle > 180 ? 1 : 0;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={160} height={90} style={{ overflow: "visible" }}>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#eee" strokeWidth={10} strokeLinecap="round" />
        {pct > 0 && <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={22} fontWeight={700} fill="#2c2c2c" fontFamily="'Playfair Display',serif">{value.toLocaleString()}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={10} fill="#9a9a8a" fontFamily="'Lato',sans-serif">{label}</text>
      </svg>
      <div style={{ fontSize: 11, color: "#9a9a8a", marginTop: -8 }}>{sublabel}</div>
    </div>
  );
}

// --- MAIN APP ---------------------------------------------------------
function AdminPanel({ onClose }) {
  const [data, setData] = useState(() => loadAdminData() || DEFAULT_DATA);
  const [tab, setTab] = useState("dashboard");
  const [showAddMonth, setShowAddMonth] = useState(false);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newMonth, setNewMonth] = useState({ label: "", nj: "", ny: "", ma: "", trials: "", visitors: "", churnPct: "", dispPartners: "", notes: "" });
  const [newPartner, setNewPartner] = useState({ name: "", state: "nj", monthlyFee: 99, startDate: "", notes: "" });
  const [editGoals, setEditGoals] = useState(false);
  const [goalDraft, setGoalDraft] = useState({ businessGoal: data.businessGoal, quitJobGoal: data.quitJobGoal });

  useEffect(() => { saveAdminData(data); }, [data]);

  // -- Computed metrics ----------------------------------------------
  const latestMonth = data.monthlyData[data.monthlyData.length - 1];
  const prevMonth = data.monthlyData[data.monthlyData.length - 2];
  const totalSubs = getTotalSubs(latestMonth);
  const prevSubs = getTotalSubs(prevMonth);
  const subGrowth = totalSubs - prevSubs;
  const activePartners = data.dispensaryPartners.filter(p => p.active !== false).length;
  const { gross, partnerRev, net } = calcRevenue(totalSubs, data.revenuePerSub, data.infraCost, activePartners);
  const quitPct = (net / data.quitJobGoal) * 100;
  const subPct = (totalSubs / data.businessGoal) * 100;

  const subHistory = data.monthlyData.map(m => getTotalSubs(m));
  const revenueHistory = data.monthlyData.map(m => {
    const s = getTotalSubs(m);
    const p = m.dispPartners || 0;
    return parseFloat(calcRevenue(s, data.revenuePerSub, data.infraCost, p).net.toFixed(2));
  });
  const churnHistory = data.monthlyData.map(m => m.churnPct || 0);

  const projectedMonthsToQuit = useMemo(() => {
    if (net >= data.quitJobGoal) return 0;
    const growthRate = subHistory.length >= 2
      ? (subHistory[subHistory.length - 1] / Math.max(subHistory[subHistory.length - 2], 1)) - 1
      : 0.5;
    let subs = totalSubs;
    for (let i = 1; i <= 24; i++) {
      subs = Math.round(subs * (1 + Math.max(growthRate, 0.05)));
      const { net: n } = calcRevenue(subs, data.revenuePerSub, data.infraCost, activePartners);
      if (n >= data.quitJobGoal) return i;
    }
    return 24;
  }, [totalSubs, data, activePartners, net]);

  // -- Add month handler ---------------------------------------------
  function addMonth() {
    const entry = {
      month: data.monthlyData.length + 1,
      label: newMonth.label,
      subs: {
        nj: parseInt(newMonth.nj) || 0,
        ny: parseInt(newMonth.ny) || 0,
        ma: parseInt(newMonth.ma) || 0,
      },
      trials: parseInt(newMonth.trials) || 0,
      visitors: parseInt(newMonth.visitors) || 0,
      churnPct: parseFloat(newMonth.churnPct) || 0,
      dispPartners: parseInt(newMonth.dispPartners) || activePartners,
      notes: newMonth.notes,
    };
    setData(d => ({ ...d, monthlyData: [...d.monthlyData, entry] }));
    setNewMonth({ label: "", nj: "", ny: "", ma: "", trials: "", visitors: "", churnPct: "", dispPartners: "", notes: "" });
    setShowAddMonth(false);
  }

  // -- Add partner handler -------------------------------------------
  function addPartner() {
    const partner = {
      id: Date.now(),
      ...newPartner,
      monthlyFee: parseFloat(newPartner.monthlyFee) || 99,
      active: true,
    };
    setData(d => ({ ...d, dispensaryPartners: [...d.dispensaryPartners, partner] }));
    setNewPartner({ name: "", state: "nj", monthlyFee: 99, startDate: "", notes: "" });
    setShowAddPartner(false);
  }

  // -- Toggle milestone ----------------------------------------------
  function toggleMilestone(id) {
    setData(d => ({
      ...d,
      milestones: d.milestones.map(m =>
        m.id === id ? { ...m, achieved: !m.achieved, date: !m.achieved ? new Date().toLocaleDateString() : null } : m
      )
    }));
  }

  // -- Update market -------------------------------------------------
  function toggleMarket(id) {
    setData(d => ({
      ...d,
      markets: d.markets.map(m =>
        m.id === id ? { ...m, launched: !m.launched } : m
      )
    }));
  }

  const TABS = [
    ["dashboard", "📊 Dashboard"],
    ["growth", "📈 Growth"],
    ["markets", "🗺 Markets"],
    ["scraper", "⚙️ Scraper"],
    ["partners", "🤝 Partners"],
    ["milestones", "🏆 Milestones"],
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f0ede6", fontFamily: "'Lato',sans-serif", color: "#2c2c2c" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Lato:wght@300;400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .card{background:#fff;border:1px solid #ddd8cc;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.05)}
        .inp{background:#fff;border:1.5px solid #ddd8cc;color:#2c2c2c;padding:8px 12px;font-family:'Lato',sans-serif;font-size:13px;border-radius:8px;outline:none;width:100%}
        .inp:focus{border-color:#6a9e6f}
        .btn{border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Lato',sans-serif;transition:all .15s}
        .btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.12)}
        .tab{background:none;border:none;color:#9a9a8a;cursor:pointer;padding:10px 16px;font-family:'Lato',sans-serif;font-size:13px;border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap}
        .tab.on{color:#3d6b42;border-bottom-color:#6a9e6f;font-weight:700}
        .stat-card{background:#fff;border:1px solid #ddd8cc;border-radius:12px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
        .prog-bar{height:8px;background:#e8f2e8;border-radius:4px;overflow:hidden}
        .prog-fill{height:100%;border-radius:4px;transition:width .6s}
        .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
        .row{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#fff;border:1px solid #ddd8cc;border-radius:10px;margin-bottom:6px}
        .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justifyContent:center;z-index:100;padding:20px}
        .modal{background:#fff;border-radius:16px;padding:28px;width:100%;max-width:480px;box-shadow:0 24px 64px rgba(0,0,0,.15)}
        .fade{animation:fi .3s ease}@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
        .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        @media(max-width:600px){.grid2,.grid3,.grid4{grid-template-columns:1fr 1fr}.tab{padding:8px 10px;font-size:11px}}
      `}</style>

      {/* HEADER */}
      <header style={{ background: "#fff", borderBottom: "1px solid #ddd8cc", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 26 }}>🔍</div>
              <div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#3d6b42" }}>FindWeedNJ Analytics</div>
                <div style={{ fontSize: 10, color: "#9a9a8a", letterSpacing: "2px", textTransform: "uppercase" }}>Business Intelligence Dashboard</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#9a9a8a" }}>Last updated: {latestMonth?.label || "--"}</div>
                <button className="btn" onClick={() => setShowAddMonth(true)} style={{ background: "linear-gradient(135deg,#6a9e6f,#3d6b42)", color: "#fff", fontSize: 12 }}>+ Log Month</button>
                <button className="btn" onClick={onClose} style={{ background: "#fee2e2", color: "#e07b6a", fontSize: 12 }}>✕ Close Admin</button>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
            {TABS.map(([k, l]) => (
              <button key={k} className={`tab${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>

        {/* == DASHBOARD == */}
        {tab === "dashboard" && (
          <div className="fade">

            {/* Quit job progress bar */}
            <div className="card" style={{ padding: "20px 24px", marginBottom: 20, background: "linear-gradient(135deg,#eef8f2,#fff)", border: "1.5px solid #b8d4bb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#2c2c2c", marginBottom: 2 }}>
                    Quit Job Progress
                  </div>
                  <div style={{ fontSize: 12, color: "#9a9a8a" }}>
                    Goal: {formatCurrency(data.quitJobGoal)}/mo net . {data.businessGoal} subscribers needed
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#3d6b42" }}>
                    {formatCurrency(net)}<span style={{ fontSize: 13, color: "#9a9a8a", fontWeight: 400 }}>/mo</span>
                  </div>
                  <div style={{ fontSize: 12, color: projectedMonthsToQuit <= 6 ? "#3d6b42" : "#c8a96e", fontWeight: 700 }}>
                    ~{projectedMonthsToQuit} months to quit job
                  </div>
                </div>
              </div>
              <div className="prog-bar" style={{ height: 12, marginBottom: 6 }}>
                <div className="prog-fill" style={{ width: `${Math.min(quitPct, 100)}%`, background: "linear-gradient(90deg,#6a9e6f,#3d6b42)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9a9a8a" }}>
                <span>{quitPct.toFixed(1)}% of goal</span>
                <span>{formatCurrency(data.quitJobGoal - net)} remaining</span>
              </div>
            </div>

            {/* KPI Grid */}
            <div className="grid4" style={{ marginBottom: 20 }}>
              {[
                { label: "Total Subscribers", value: totalSubs.toLocaleString(), sub: subGrowth >= 0 ? `+${subGrowth} this month` : `${subGrowth} this month`, color: "#6a9e6f", trend: subHistory },
                { label: "Monthly Revenue", value: formatCurrency(gross + partnerRev), sub: `${formatCurrency(net)} after costs`, color: "#4a8fb5", trend: revenueHistory },
                { label: "Disp. Partners", value: activePartners, sub: `${formatCurrency(activePartners * 99)}/mo partner rev`, color: "#c8a96e", trend: null },
                { label: "Avg Churn", value: `${(latestMonth?.churnPct || 0).toFixed(1)}%`, sub: "target: <5%", color: (latestMonth?.churnPct || 0) <= 5 ? "#6a9e6f" : "#e07b6a", trend: churnHistory },
              ].map(({ label, value, sub, color, trend }) => (
                <div key={label} className="stat-card">
                  <div style={{ fontSize: 11, color: "#9a9a8a", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: trend ? 8 : 0 }}>{sub}</div>
                  {trend && trend.length >= 2 && <Sparkline data={trend} color={color} />}
                </div>
              ))}
            </div>

            {/* Gauges */}
            <div className="grid3" style={{ marginBottom: 20 }}>
              <div className="card" style={{ padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#9a9a8a", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Subscriber Goal</div>
                <Gauge value={totalSubs} max={data.businessGoal} color="#6a9e6f" label="subscribers" sublabel={`${data.businessGoal} to quit job`} />
                <div className="prog-bar" style={{ marginTop: 10 }}>
                  <div className="prog-fill" style={{ width: `${Math.min(subPct, 100)}%`, background: "#6a9e6f" }} />
                </div>
                <div style={{ fontSize: 11, color: "#9a9a8a", marginTop: 4 }}>{subPct.toFixed(1)}% of {data.businessGoal}</div>
              </div>
              <div className="card" style={{ padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#9a9a8a", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Revenue Goal</div>
                <Gauge value={Math.round(net)} max={data.quitJobGoal} color="#4a8fb5" label="net/month" sublabel={`${formatCurrency(data.quitJobGoal)} goal`} />
                <div className="prog-bar" style={{ marginTop: 10 }}>
                  <div className="prog-fill" style={{ width: `${Math.min(quitPct, 100)}%`, background: "#4a8fb5" }} />
                </div>
                <div style={{ fontSize: 11, color: "#9a9a8a", marginTop: 4 }}>{quitPct.toFixed(1)}% of {formatCurrency(data.quitJobGoal)}</div>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: 11, color: "#9a9a8a", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>Revenue Breakdown</div>
                {[
                  { label: "Subscriptions", val: gross, color: "#6a9e6f" },
                  { label: "Disp. Partners", val: partnerRev, color: "#c8a96e" },
                  { label: "Infrastructure", val: -data.infraCost, color: "#e07b6a" },
                  { label: "Stripe Fees", val: -(totalSubs * 6.99 * 0.029), color: "#e07b6a" },
                  { label: "Net Profit", val: net, color: "#3d6b42" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8, paddingBottom: 8, borderBottom: label === "Stripe Fees" ? "1px solid #f0ede6" : "none" }}>
                    <span style={{ color: "#5a5a5a" }}>{label}</span>
                    <span style={{ fontWeight: 700, color }}>{val >= 0 ? "+" : ""}{formatCurrency(val)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* State breakdown */}
            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Subscribers by State</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.markets.map(m => {
                  const subs = latestMonth?.subs?.[m.id] || 0;
                  const pct = totalSubs > 0 ? (subs / totalSubs) * 100 : 0;
                  return (
                    <div key={m.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: m.launched ? m.color : "#ddd" }} />
                          <span style={{ fontWeight: 700 }}>{m.name}</span>
                          {!m.launched && <span className="badge" style={{ background: "#f0ede6", color: "#9a9a8a" }}>Not launched</span>}
                          {m.launched && <span className="badge" style={{ background: "#eef8f2", color: "#3d6b42" }}>Live</span>}
                        </div>
                        <span style={{ fontWeight: 700, color: m.color }}>{subs} subs</span>
                      </div>
                      <div className="prog-bar">
                        <div className="prog-fill" style={{ width: `${Math.min((subs / m.targetSubs) * 100, 100)}%`, background: m.launched ? m.color : "#ddd" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "#9a9a8a", marginTop: 2 }}>{subs}/{m.targetSubs} target</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Goals editor */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700 }}>Goals</div>
                <button className="btn" onClick={() => setEditGoals(v => !v)} style={{ background: "#f0ede6", color: "#5a5a5a", fontSize: 11 }}>
                  {editGoals ? "Save" : "Edit"}
                </button>
              </div>
              {editGoals ? (
                <div className="grid2">
                  {[
                    { label: "Subscribers to quit job", key: "businessGoal" },
                    { label: "Monthly net revenue goal ($)", key: "quitJobGoal" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: 4 }}>{label}</div>
                      <input className="inp" type="number" value={goalDraft[key]}
                        onChange={e => setGoalDraft(d => ({ ...d, [key]: parseFloat(e.target.value) || 0 }))}
                        onBlur={() => setData(d => ({ ...d, ...goalDraft }))} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid2">
                  <div style={{ padding: "12px 14px", background: "#eef8f2", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "#9a9a8a" }}>Quit job at</div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#3d6b42" }}>{data.businessGoal} subs</div>
                  </div>
                  <div style={{ padding: "12px 14px", background: "#eef8f2", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "#9a9a8a" }}>Revenue goal</div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#3d6b42" }}>{formatCurrency(data.quitJobGoal)}/mo</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* == GROWTH == */}
        {tab === "growth" && (
          <div className="fade">
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Growth Tracking</div>
            <div style={{ fontSize: 13, color: "#9a9a8a", marginBottom: 20 }}>Month-by-month subscriber and revenue history</div>

            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f0ede6" }}>
                    {["Month", "NJ", "NY", "MA", "Total", "Trials", "Visitors", "Conv%", "Churn%", "Net Rev", "Notes"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: h === "Notes" ? "left" : "right", color: "#9a9a8a", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyData.map((m, i) => {
                    const total = getTotalSubs(m);
                    const prevTotal = i > 0 ? getTotalSubs(data.monthlyData[i - 1]) : 0;
                    const conv = m.trials > 0 ? ((total - prevTotal) / m.trials * 100).toFixed(0) : "--";
                    const { net: n } = calcRevenue(total, data.revenuePerSub, data.infraCost, m.dispPartners || 0);
                    const isLatest = i === data.monthlyData.length - 1;
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f0ede6", background: isLatest ? "#f7fcf7" : "transparent" }}>
                        <td style={{ padding: "10px", fontWeight: 700 }}>{m.label}</td>
                        <td style={{ padding: "10px", textAlign: "right" }}>{m.subs?.nj || 0}</td>
                        <td style={{ padding: "10px", textAlign: "right" }}>{m.subs?.ny || 0}</td>
                        <td style={{ padding: "10px", textAlign: "right" }}>{m.subs?.ma || 0}</td>
                        <td style={{ padding: "10px", textAlign: "right", fontWeight: 700, color: "#3d6b42" }}>{total}</td>
                        <td style={{ padding: "10px", textAlign: "right" }}>{m.trials || 0}</td>
                        <td style={{ padding: "10px", textAlign: "right" }}>{(m.visitors || 0).toLocaleString()}</td>
                        <td style={{ padding: "10px", textAlign: "right" }}>{conv}%</td>
                        <td style={{ padding: "10px", textAlign: "right", color: (m.churnPct || 0) > 5 ? "#e07b6a" : "#6a9e6f" }}>{m.churnPct || 0}%</td>
                        <td style={{ padding: "10px", textAlign: "right", fontWeight: 700, color: n >= 0 ? "#3d6b42" : "#e07b6a" }}>{formatCurrency(n)}</td>
                        <td style={{ padding: "10px", color: "#9a9a8a", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.notes || "--"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Projected path to 2000 */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Projected Path to 2,000 Subscribers</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.monthlyTarget.map((target, i) => {
                  const actual = data.monthlyData[i] ? getTotalSubs(data.monthlyData[i]) : null;
                  const ahead = actual !== null && actual >= target;
                  const behind = actual !== null && actual < target;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 60, fontSize: 11, color: "#9a9a8a", flexShrink: 0 }}>Mo {i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div className="prog-bar" style={{ height: 6 }}>
                          <div className="prog-fill" style={{ width: `${(target / 2000) * 100}%`, background: "#e8f2e8" }} />
                          {actual !== null && <div className="prog-fill" style={{ width: `${(actual / 2000) * 100}%`, background: ahead ? "#6a9e6f" : "#e07b6a", marginTop: -6 }} />}
                        </div>
                      </div>
                      <div style={{ width: 60, textAlign: "right", fontSize: 12, color: "#9a9a8a", flexShrink: 0 }}>target: {target}</div>
                      {actual !== null && (
                        <div style={{ width: 60, textAlign: "right", fontSize: 12, fontWeight: 700, color: ahead ? "#3d6b42" : "#e07b6a", flexShrink: 0 }}>
                          actual: {actual}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* == MARKETS == */}
        {tab === "markets" && (
          <div className="fade">
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Market Expansion</div>
            <div style={{ fontSize: 13, color: "#9a9a8a", marginBottom: 20 }}>NJ → NY → MA → CO → CA</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {data.markets.map((m, i) => {
                const subs = latestMonth?.subs?.[m.id] || 0;
                const rev = calcRevenue(subs, data.revenuePerSub, 0, 0).gross;
                return (
                  <div key={m.id} className="card" style={{ padding: 24, borderLeft: `4px solid ${m.launched ? m.color : "#ddd"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700 }}>{m.name}</div>
                          <span className="badge" style={{ background: m.launched ? "#eef8f2" : "#f0ede6", color: m.launched ? "#3d6b42" : "#9a9a8a" }}>
                            {m.launched ? "🟢 Live" : `🔘 Launch Month ${m.launchMonth}`}
                          </span>
                        </div>
                        <div className="grid3" style={{ gap: 8, marginBottom: 12 }}>
                          {[
                            { l: "Dispensaries", v: m.dispensaries },
                            { l: "Current Subs", v: subs },
                            { l: "Target Subs", v: m.targetSubs },
                            { l: "Sub Revenue", v: formatCurrency(rev) },
                            { l: "% of Target", v: `${((subs / m.targetSubs) * 100).toFixed(1)}%` },
                            { l: "State Tax", v: m.id === "nj" ? "6.625%" : m.id === "ny" ? "13%" : m.id === "ma" ? "10.75%" : m.id === "co" ? "15%" : "15%" },
                          ].map(({ l, v }) => (
                            <div key={l} style={{ padding: "8px 10px", background: "#f7f5f0", borderRadius: 8 }}>
                              <div style={{ fontSize: 10, color: "#9a9a8a", textTransform: "uppercase", letterSpacing: "1px" }}>{l}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "#2c2c2c", marginTop: 2 }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div className="prog-bar">
                          <div className="prog-fill" style={{ width: `${Math.min((subs / m.targetSubs) * 100, 100)}%`, background: m.color }} />
                        </div>
                      </div>
                      <button className="btn" onClick={() => toggleMarket(m.id)}
                        style={{ background: m.launched ? "#fee2e2" : "linear-gradient(135deg,#6a9e6f,#3d6b42)", color: m.launched ? "#e07b6a" : "#fff", fontSize: 12 }}>
                        {m.launched ? "Mark Unlaunched" : "Mark Launched"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* == SCRAPER == */}
        {tab === "scraper" && (
          <div className="fade">
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Scraper Health</div>
            <div style={{ fontSize: 13, color: "#9a9a8a", marginBottom: 20 }}>Monitor data pipeline across all markets</div>

            <div className="grid3" style={{ marginBottom: 20 }}>
              {[
                { label: "Last Successful Run", value: data.scraperHealth.lastRun, color: "#3d6b42" },
                { label: "Dispensaries Succeeding", value: data.scraperHealth.successCount, color: "#6a9e6f" },
                { label: "Dispensaries Failing", value: data.scraperHealth.failCount, color: data.scraperHealth.failCount > 10 ? "#e07b6a" : "#c8a96e" },
              ].map(({ label, value, color }) => (
                <div key={label} className="stat-card">
                  <div style={{ fontSize: 11, color: "#9a9a8a", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Top Performing Dispensary</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "#eef8f2", borderRadius: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{data.scraperHealth.topDispensary}</div>
                  <div style={{ fontSize: 12, color: "#9a9a8a" }}>Most products scraped</div>
                </div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#3d6b42" }}>
                  {data.scraperHealth.topProducts}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Update Scraper Status</div>
              <div className="grid2">
                {[
                  { label: "Last run timestamp", key: "lastRun", type: "text" },
                  { label: "Dispensaries succeeding", key: "successCount", type: "number" },
                  { label: "Dispensaries failing", key: "failCount", type: "number" },
                  { label: "Top dispensary products", key: "topProducts", type: "number" },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: 4 }}>{label}</div>
                    <input className="inp" type={type} value={data.scraperHealth[key]}
                      onChange={e => setData(d => ({
                        ...d,
                        scraperHealth: { ...d.scraperHealth, [key]: type === "number" ? parseInt(e.target.value) || 0 : e.target.value }
                      }))} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: 4 }}>Top dispensary name</div>
                <input className="inp" value={data.scraperHealth.topDispensary}
                  onChange={e => setData(d => ({ ...d, scraperHealth: { ...d.scraperHealth, topDispensary: e.target.value } }))} />
              </div>
            </div>
          </div>
        )}

        {/* == PARTNERS == */}
        {tab === "partners" && (
          <div className="fade">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Dispensary Partners</div>
                <div style={{ fontSize: 13, color: "#9a9a8a" }}>{activePartners} active . {formatCurrency(activePartners * 99)}/mo partner revenue</div>
              </div>
              <button className="btn" onClick={() => setShowAddPartner(true)} style={{ background: "linear-gradient(135deg,#c8a96e,#e8b87a)", color: "#fff" }}>
                + Add Partner
              </button>
            </div>

            {data.dispensaryPartners.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🤝</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No partners yet</div>
                <div style={{ fontSize: 13, color: "#9a9a8a", marginBottom: 16 }}>Dispensary partnerships are your fastest path to $6k/month. Start pitching.</div>
                <button className="btn" onClick={() => setShowAddPartner(true)} style={{ background: "linear-gradient(135deg,#c8a96e,#e8b87a)", color: "#fff" }}>
                  Log first partner
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.dispensaryPartners.map(p => (
                  <div key={p.id} className="row" style={{ justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "#9a9a8a" }}>{p.state.toUpperCase()} . Since {p.startDate || "--"} . {p.notes}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#c8a96e" }}>{formatCurrency(p.monthlyFee)}/mo</div>
                      <button className="btn" onClick={() => setData(d => ({
                        ...d, dispensaryPartners: d.dispensaryPartners.map(x => x.id === p.id ? { ...x, active: !x.active } : x)
                      }))} style={{ background: p.active !== false ? "#fee2e2" : "#eef8f2", color: p.active !== false ? "#e07b6a" : "#3d6b42", fontSize: 11 }}>
                        {p.active !== false ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* == MILESTONES == */}
        {tab === "milestones" && (
          <div className="fade">
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Milestones</div>
            <div style={{ fontSize: 13, color: "#9a9a8a", marginBottom: 20 }}>
              {data.milestones.filter(m => m.achieved).length} of {data.milestones.length} achieved
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.milestones.map(m => (
                <div key={m.id} className="row" style={{ background: m.achieved ? "linear-gradient(135deg,#eef8f2,#fff)" : "#fff", border: `1.5px solid ${m.achieved ? "#b8d4bb" : "#ddd8cc"}`, cursor: "pointer" }}
                  onClick={() => toggleMilestone(m.id)}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.achieved ? "#6a9e6f" : "#f0ede6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {m.achieved ? <span style={{ color: "#fff", fontSize: 14 }}>✓</span> : <span style={{ color: "#9a9a8a", fontSize: 12 }}>○</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: m.achieved ? "#3d6b42" : "#2c2c2c" }}>{m.label}</div>
                    {m.achieved && m.date && <div style={{ fontSize: 11, color: "#9a9a8a" }}>Achieved {m.date}</div>}
                    {!m.achieved && m.target && <div style={{ fontSize: 11, color: "#9a9a8a" }}>Target: {typeof m.target === "number" ? m.target.toLocaleString() : m.target}</div>}
                  </div>
                  {m.target && typeof m.target === "number" && (
                    <div style={{ textAlign: "right", minWidth: 80 }}>
                      <div style={{ fontSize: 12, color: "#9a9a8a" }}>{((totalSubs / m.target) * 100).toFixed(0)}%</div>
                      <div className="prog-bar" style={{ width: 80, marginTop: 4 }}>
                        <div className="prog-fill" style={{ width: `${Math.min((totalSubs / m.target) * 100, 100)}%`, background: m.achieved ? "#6a9e6f" : "#c8a96e" }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* -- ADD MONTH MODAL -- */}
      {showAddMonth && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setShowAddMonth(false)}>
          <div className="modal">
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Log New Month</div>
            <div className="grid2" style={{ marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: 4 }}>Month label (e.g. May 2026)</div>
                <input className="inp" value={newMonth.label} onChange={e => setNewMonth(d => ({ ...d, label: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: 4 }}>Churn % this month</div>
                <input className="inp" type="number" value={newMonth.churnPct} onChange={e => setNewMonth(d => ({ ...d, churnPct: e.target.value }))} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: 6, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>Subscribers by state</div>
            <div className="grid3" style={{ marginBottom: 10 }}>
              {[["nj","NJ"],["ny","NY"],["ma","MA"]].map(([k,l]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: 4 }}>{l} subs</div>
                  <input className="inp" type="number" value={newMonth[k]} onChange={e => setNewMonth(d => ({ ...d, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="grid3" style={{ marginBottom: 10 }}>
              {[["trials","Trials started"],["visitors","Site visitors"],["dispPartners","Disp. partners"]].map(([k,l]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: 4 }}>{l}</div>
                  <input className="inp" type="number" value={newMonth[k]} onChange={e => setNewMonth(d => ({ ...d, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: 4 }}>Notes</div>
              <input className="inp" value={newMonth.notes} onChange={e => setNewMonth(d => ({ ...d, notes: e.target.value }))} placeholder="What happened this month?" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" onClick={addMonth} style={{ background: "linear-gradient(135deg,#6a9e6f,#3d6b42)", color: "#fff", flex: 1 }}>Save Month</button>
              <button className="btn" onClick={() => setShowAddMonth(false)} style={{ background: "#f0ede6", color: "#5a5a5a" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* -- ADD PARTNER MODAL -- */}
      {showAddPartner && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setShowAddPartner(false)}>
          <div className="modal">
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Add Dispensary Partner</div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: 4 }}>Dispensary name</div>
              <input className="inp" value={newPartner.name} onChange={e => setNewPartner(d => ({ ...d, name: e.target.value }))} placeholder="NAR Cannabis Mt Laurel" />
            </div>
            <div className="grid3" style={{ marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: 4 }}>State</div>
                <select className="inp" value={newPartner.state} onChange={e => setNewPartner(d => ({ ...d, state: e.target.value }))}>
                  <option value="nj">NJ</option>
                  <option value="ny">NY</option>
                  <option value="ma">MA</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: 4 }}>Monthly fee ($)</div>
                <input className="inp" type="number" value={newPartner.monthlyFee} onChange={e => setNewPartner(d => ({ ...d, monthlyFee: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: 4 }}>Start date</div>
                <input className="inp" type="date" value={newPartner.startDate} onChange={e => setNewPartner(d => ({ ...d, startDate: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#9a9a8a", marginBottom: 4 }}>Notes</div>
              <input className="inp" value={newPartner.notes} onChange={e => setNewPartner(d => ({ ...d, notes: e.target.value }))} placeholder="Featured listing, deal promotion, etc." />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" onClick={addPartner} style={{ background: "linear-gradient(135deg,#c8a96e,#e8b87a)", color: "#fff", flex: 1 }}>Add Partner</button>
              <button className="btn" onClick={() => setShowAddPartner(false)} style={{ background: "#f0ede6", color: "#5a5a5a" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// --- TAX RATES BY MUNICIPALITY ---------------------------------------
// Base NJ rate: 6.625% statewide
// + up to 2% local municipal tax where enacted
const MUNICIPAL_TAX = {
  // Burlington County
  "Mt Laurel":        0,      // no local tax
  "Bordentown":       0,
  "Mount Holly":      0,
  "Edgewater Park":   0,
  "Medford":          0,
  "Westampton":       0,
  "Hainesport":       0,
  "Pemberton":        0,
  "Marlton":          0,
  "Moorestown":       0,
  "Maple Shade":      0,
  "Lumberton":        0,
  // Camden County
  "Bellmawr":         0,
  "Voorhees":         0,
  "Gloucester City":  0.02,   // 2% local
  "Camden":           0.02,
  "Cherry Hill":      0,
  "Brooklawn":        0.02,
  "Haddonfield":      0,
  "Clementon":        0,
  // Bergen County
  "Lodi":             0,
  "Fort Lee":         0.02,
  "Rochelle Park":    0,
  "Paramus":          0,
  "Hackensack":       0.02,
  "Edgewater":        0,
  // Essex County
  "Bloomfield":       0,
  "Maplewood":        0,
  "Newark":           0.02,
  "East Orange":      0.02,
  "Belleville":       0,
  // Mercer County
  "Ewing":            0,
  "Princeton":        0,
  "Hamilton":         0,
  // Middlesex County
  "Cranbury":         0,
  "New Brunswick":    0.02,
  "South Brunswick":  0,
  "Woodbridge":       0.02,
  "Highland Park":    0,
  "Franklin Park":    0,
  "Franklin Township":0,
  "Metuchen":         0,
  "Rahway":           0.02,
  // Monmouth County
  "Neptune":          0,
  "Eatontown":        0,
  "Manalapan":        0,
  "Freehold":         0,
  "Tinton Falls":     0,
  // Morris County
  "Wharton":          0,
  "Roxbury":          0,
  "Hanover":          0,
  // Ocean County
  "Toms River":       0,
  "Evesham":          0,
  "Tuckerton":        0,
  // Atlantic County
  "Atlantic City":    0.02,
  "Absecon":          0,
  "Egg Harbor City":  0,
  "Galloway":         0,
  // Hudson County
  "Jersey City":      0.02,
  "Secaucus":         0,
  "Union City":       0.02,
  // Hunterdon County
  "Flemington":       0,
  "Lambertville":     0,
  // Somerset County
  "Somerville":       0,
  "Bridgewater":      0,
  // Union County
  "Elizabeth":        0.02,
  "Springfield":      0,
  "Plainfield":       0.02,
  "Summit":           0,
  "Union":            0,
  "Linden":           0.02,
  // Passaic County
  "Clifton":          0,
  "Paterson":         0.02,
  "Hewitt":           0,
  "Haledon":          0,
  // Gloucester County
  "Williamstown":     0,
  "Sewell":           0,
  "Woodbury":         0,
  // Cape May County
  "Cape May Court House": 0,
  // Cumberland County
  "Vineland":         0,
  "Bridgeton":        0,
  // Warren County
  "Oxford":           0,
  "Phillipsburg":     0,
  // Sussex County (via Warren)
  "Wharton":          0,
};

const NJ_STATE_TAX = 0.06625;

function getTaxRate(city, isMedical = false) {
  if (isMedical) return 0; // medical is fully tax-exempt
  const local = MUNICIPAL_TAX[city] ?? 0;
  return NJ_STATE_TAX + local;
}

function getTaxLabel(city, isMedical = false) {
  if (isMedical) return "Tax-exempt (medical)";
  const local = MUNICIPAL_TAX[city] ?? 0;
  const total = ((NJ_STATE_TAX + local) * 100).toFixed(3).replace(/\.?0+$/, "");
  if (local > 0) return `${total}% tax (6.625% state + ${(local*100).toFixed(0)}% local)`;
  return `${total}% tax (state only)`;
}

// --- DEALS DATABASE --------------------------------------------------
// day: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat, null=daily
// applies_to: "storewide"|"category"|"brand"|"product"
// category: "Flower"|"Concentrates"|"Vapes"|"Edibles"|"Pre-Rolls"
// stackable: whether it stacks with first-time/loyalty discounts

const DEALS = [
  // NAR Cannabis Mt Laurel
  { dispensary:"nar-cannabis-mt-laurel", name:"First-Time 30% Off", day:null, pct:30, applies_to:"storewide", firstTimeOnly:true, stackable:false, notes:"Excludes ounces & Puffco" },
  { dispensary:"nar-cannabis-mt-laurel", name:"$2 Tuesday Pre-Roll", day:2, pct:null, fixedPrice:2, applies_to:"product", product:"Animal Mint Cake 1g", stackable:false, notes:"3 per person limit" },
  { dispensary:"nar-cannabis-mt-laurel", name:"Kind Tree 3.5g Deal", day:null, pct:null, fixedPrice:40, applies_to:"brand_product", brand:"Kind Tree", weight:"3.5g", stackable:false },
  { dispensary:"nar-cannabis-mt-laurel", name:"Kind Tree 2 for $100", day:null, pct:null, bogo:"2for100", applies_to:"brand", brand:"Kind Tree", weight:"3.5g", stackable:false },
  { dispensary:"nar-cannabis-mt-laurel", name:"Seniors 15%", day:null, pct:15, applies_to:"storewide", customerType:"senior", stackable:false },
  { dispensary:"nar-cannabis-mt-laurel", name:"Veterans 15%", day:null, pct:15, applies_to:"storewide", customerType:"veteran", stackable:false },
  { dispensary:"nar-cannabis-mt-laurel", name:"Medical 15%", day:null, pct:15, applies_to:"storewide", customerType:"medical", stackable:false },
  { dispensary:"nar-cannabis-mt-laurel", name:"Industry 15%", day:null, pct:15, applies_to:"storewide", customerType:"industry", stackable:false },
  { dispensary:"nar-cannabis-mt-laurel", name:"Teachers 15%", day:null, pct:15, applies_to:"storewide", customerType:"teacher", stackable:false },
  { dispensary:"nar-cannabis-mt-laurel", name:"First Responders 15%", day:null, pct:15, applies_to:"storewide", customerType:"first-responder", stackable:false },
  { dispensary:"nar-cannabis-mt-laurel", name:"PA Bridge Toll Covered", day:null, pct:null, applies_to:"storewide", notes:"On $50+ purchase with PA ID", stackable:true },

  // Nirvana Dispensary
  { dispensary:"nirvana-dispensary-mt-laurel", name:"First-Time 20% Off", day:null, pct:20, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"nirvana-dispensary-mt-laurel", name:"Breakwater x Nirvana Drop", day:null, pct:null, applies_to:"brand", brand:"Breakwater x Nirvana", notes:"Exclusive collab drops", stackable:false },

  // RISE Bloomfield
  { dispensary:"rise-bloomfield", name:"First-Time 15% Off", day:null, pct:15, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"rise-bloomfield", name:"Member Monday 10%", day:1, pct:10, applies_to:"storewide", customerType:"member", stackable:false },
  { dispensary:"rise-bloomfield", name:"Happy Hour 15%", day:null, pct:15, applies_to:"storewide", timeStart:"16:00", timeEnd:"19:00", notes:"Mon-Thu 4-7pm", stackable:false },
  { dispensary:"rise-bloomfield", name:"Flower Friday 20%", day:5, pct:20, applies_to:"category", category:"Flower", stackable:false },

  // RISE Paramus
  { dispensary:"rise-paramus", name:"First-Time 15% Off", day:null, pct:15, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"rise-paramus", name:"Member Monday 10%", day:1, pct:10, applies_to:"storewide", customerType:"member", stackable:false },
  { dispensary:"rise-paramus", name:"Happy Hour 15%", day:null, pct:15, applies_to:"storewide", timeStart:"16:00", timeEnd:"19:00", notes:"Mon-Thu 4-7pm", stackable:false },
  { dispensary:"rise-paramus", name:"Flower Friday 20%", day:5, pct:20, applies_to:"category", category:"Flower", stackable:false },

  // Zen Leaf Elizabeth
  { dispensary:"zen-leaf-elizabeth", name:"First-Time 20% Off", day:null, pct:20, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"zen-leaf-elizabeth", name:"Mellow Monday 20% Flower", day:1, pct:20, applies_to:"category", category:"Flower", stackable:false },
  { dispensary:"zen-leaf-elizabeth", name:"Vape Day Wednesday 20%", day:3, pct:20, applies_to:"category", category:"Vapes", stackable:false },

  // Zen Leaf Neptune
  { dispensary:"zen-leaf-neptune", name:"First-Time 20% Off", day:null, pct:20, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"zen-leaf-neptune", name:"Mellow Monday 20% Flower", day:1, pct:20, applies_to:"category", category:"Flower", stackable:false },
  { dispensary:"zen-leaf-neptune", name:"Vape Day Wednesday 20%", day:3, pct:20, applies_to:"category", category:"Vapes", stackable:false },

  // Zen Leaf Mount Holly
  { dispensary:"zen-leaf-mount-holly", name:"First-Time 20% Off", day:null, pct:20, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"zen-leaf-mount-holly", name:"Mellow Monday 20% Flower", day:1, pct:20, applies_to:"category", category:"Flower", stackable:false },

  // Curaleaf (all locations)
  { dispensary:"curaleaf-bellmawr", name:"First-Time 20% Off", day:null, pct:20, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"curaleaf-bellmawr", name:"Loyalty 10% Off", day:null, pct:10, applies_to:"storewide", customerType:"member", stackable:false },
  { dispensary:"curaleaf-bordentown", name:"First-Time 20% Off", day:null, pct:20, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"curaleaf-ewing", name:"First-Time 20% Off", day:null, pct:20, applies_to:"storewide", firstTimeOnly:true, stackable:false },

  // The Apothecarium Maplewood
  { dispensary:"apothecarium-maplewood", name:"First-Time 20% Off", day:null, pct:20, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"apothecarium-maplewood", name:"Wax Wednesday 20%", day:3, pct:20, applies_to:"category", category:"Concentrates", stackable:false },
  { dispensary:"apothecarium-maplewood", name:"Flower Friday 15%", day:5, pct:15, applies_to:"category", category:"Flower", stackable:false },

  // Earth and Ivy New Brunswick
  { dispensary:"earth-and-ivy-new-brunswick", name:"First-Time 15% Off", day:null, pct:15, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"earth-and-ivy-new-brunswick", name:"Mary Jane Monday 25% Flower", day:1, pct:25, applies_to:"category", category:"Flower", stackable:false },
  { dispensary:"earth-and-ivy-new-brunswick", name:"Terpene Tuesday 25% Vapes", day:2, pct:25, applies_to:"category", category:"Vapes", stackable:false },
  { dispensary:"earth-and-ivy-new-brunswick", name:"Wax Wednesday 25% Concentrates", day:3, pct:25, applies_to:"category", category:"Concentrates", stackable:false },
  { dispensary:"earth-and-ivy-new-brunswick", name:"Happy Hour 25%", day:null, pct:25, applies_to:"storewide", timeStart:"16:00", timeEnd:"19:00", notes:"Mon-Thu 4-7pm", stackable:false },

  // Theo's Cannabis
  { dispensary:"theo-cannabis-franklin-park", name:"First-Time 25% Off", day:null, pct:25, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"theo-cannabis-franklin-park", name:"Seniors 15%", day:null, pct:15, applies_to:"storewide", customerType:"senior", stackable:false },
  { dispensary:"theo-cannabis-franklin-park", name:"Veterans 15%", day:null, pct:15, applies_to:"storewide", customerType:"veteran", stackable:false },
  { dispensary:"theo-cannabis-franklin-park", name:"First Responders 15%", day:null, pct:15, applies_to:"storewide", customerType:"first-responder", stackable:false },

  // Queen City Plainfield
  { dispensary:"queen-city-plainfield", name:"First-Time 15% Off", day:null, pct:15, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"queen-city-plainfield", name:"Seniors 15%", day:null, pct:15, applies_to:"storewide", customerType:"senior", stackable:false },
  { dispensary:"queen-city-plainfield", name:"Veterans 15%", day:null, pct:15, applies_to:"storewide", customerType:"veteran", stackable:false },

  // Ascend Rochelle Park
  { dispensary:"ascend-rochelle-park", name:"First-Time 20% Off", day:null, pct:20, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"ascend-rochelle-park", name:"Ozone Brand 20% Off", day:null, pct:20, applies_to:"brand", brand:"Ozone", stackable:false },

  // HoneyGrove
  { dispensary:"honeygrove-medford", name:"First-Time 30% Off", day:null, pct:30, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"honeygrove-medford", name:"Storewide Sale 25%", day:null, pct:25, applies_to:"storewide", stackable:false },

  // Brotherly Bud
  { dispensary:"brotherly-bud", name:"First-Time 35% Off", day:null, pct:35, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"brotherly-bud", name:"Veterans 20%", day:null, pct:20, applies_to:"storewide", customerType:"veteran", stackable:false },

  // BluLight Cannabis
  { dispensary:"blulight-cannabis-linden", name:"First-Time 35% Off", day:null, pct:35, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"blulight-cannabis-linden", name:"25% When You Spend $100", day:null, pct:25, applies_to:"storewide", minSpend:100, stackable:false },
  { dispensary:"blulight-gloucester", name:"First-Time 35% Off", day:null, pct:35, applies_to:"storewide", firstTimeOnly:true, stackable:false },

  // Quality Cannabliss
  { dispensary:"quality-cannabliss", name:"First-Time 35% Off", day:null, pct:35, applies_to:"storewide", firstTimeOnly:true, stackable:false },
  { dispensary:"quality-cannabliss", name:"35% Off Storewide", day:null, pct:35, applies_to:"storewide", stackable:false },
];

// --- SALE PREDICTION PATTERNS ----------------------------------------
// Sources: scraped history -- patterns detected from repeated deal appearances in menu data
// confidence recalculates automatically as scraper accumulates observations
// manually seeded with known patterns until scraper has 30+ days of data
// confidence: 0-100 (how likely this pattern repeats)
// frequency: "weekly"|"biweekly"|"monthly"|"irregular"
// typical_discount: approximate % off when it happens
// last_seen: most recent confirmed occurrence

const SALE_PATTERNS = [
  // -- NAR Cannabis Mt Laurel ----------------------------------------
  { dispensary:"nar-cannabis-mt-laurel", name:"Saturday Storewide Sale",
    days:[6], frequency:"weekly", confidence:85, typical_discount:20,
    category:"storewide", last_seen:"2026-04-05",
    source:"community", notes:"Almost every Saturday, sometimes 25-30% off" },
  { dispensary:"nar-cannabis-mt-laurel", name:"$2 Tuesday Pre-Roll",
    days:[2], frequency:"weekly", confidence:95, typical_discount:null,
    category:"pre-rolls", fixed_price:"$2/1g", last_seen:"2026-04-01",
    source:"confirmed", notes:"Animal Mint Cake 1g, 3 per person limit" },
  { dispensary:"nar-cannabis-mt-laurel", name:"Flash Brand Deal",
    days:[0,1,2,3,4,5,6], frequency:"irregular", confidence:60, typical_discount:25,
    category:"brand", last_seen:"2026-04-03",
    source:"community", notes:"Random brand drops -- Kind Tree, Cookies, Pyramid. Check daily." },

  // -- Zen Leaf (all locations) --------------------------------------
  { dispensary:"zen-leaf-mount-holly", name:"Mellow Monday Flower",
    days:[1], frequency:"weekly", confidence:90, typical_discount:20,
    category:"flower", last_seen:"2026-04-07",
    source:"confirmed", notes:"Consistent every Monday on flower" },
  { dispensary:"zen-leaf-mount-holly", name:"Weekend Flash Sale",
    days:[5,6], frequency:"biweekly", confidence:65, typical_discount:15,
    category:"storewide", last_seen:"2026-03-29",
    source:"community", notes:"Pops up most weekends, not always advertised" },
  { dispensary:"zen-leaf-elizabeth", name:"Mellow Monday Flower",
    days:[1], frequency:"weekly", confidence:90, typical_discount:20,
    category:"flower", last_seen:"2026-04-07", source:"confirmed", notes:"" },
  { dispensary:"zen-leaf-neptune", name:"Mellow Monday Flower",
    days:[1], frequency:"weekly", confidence:90, typical_discount:20,
    category:"flower", last_seen:"2026-04-07", source:"confirmed", notes:"" },

  // -- RISE (all locations) ------------------------------------------
  { dispensary:"rise-bloomfield", name:"Flower Friday",
    days:[5], frequency:"weekly", confidence:92, typical_discount:20,
    category:"flower", last_seen:"2026-04-04",
    source:"confirmed", notes:"Every Friday on flower" },
  { dispensary:"rise-bloomfield", name:"Member Monday",
    days:[1], frequency:"weekly", confidence:88, typical_discount:10,
    category:"storewide", last_seen:"2026-04-07",
    source:"confirmed", notes:"RISE rewards members only" },
  { dispensary:"rise-bloomfield", name:"Happy Hour",
    days:[1,2,3,4], frequency:"weekly", confidence:85, typical_discount:15,
    category:"storewide", last_seen:"2026-04-07",
    source:"confirmed", notes:"Mon-Thu 4-7pm only" },
  { dispensary:"rise-paramus", name:"Flower Friday",
    days:[5], frequency:"weekly", confidence:92, typical_discount:20,
    category:"flower", last_seen:"2026-04-04", source:"confirmed", notes:"" },
  { dispensary:"rise-manalapan", name:"Flower Friday",
    days:[5], frequency:"weekly", confidence:90, typical_discount:20,
    category:"flower", last_seen:"2026-04-04", source:"confirmed", notes:"" },

  // -- Apothecarium --------------------------------------------------
  { dispensary:"apothecarium-maplewood", name:"Wax Wednesday",
    days:[3], frequency:"weekly", confidence:88, typical_discount:20,
    category:"concentrates", last_seen:"2026-04-02",
    source:"confirmed", notes:"Every Wednesday on concentrates" },
  { dispensary:"apothecarium-maplewood", name:"Flower Friday",
    days:[5], frequency:"weekly", confidence:85, typical_discount:15,
    category:"flower", last_seen:"2026-04-04",
    source:"confirmed", notes:"Every Friday on flower" },
  { dispensary:"apothecarium-maplewood", name:"Saturday Mystery Deal",
    days:[6], frequency:"biweekly", confidence:60, typical_discount:20,
    category:"storewide", last_seen:"2026-03-28",
    source:"community", notes:"Unannounced Saturday deals, check their Instagram" },

  // -- Earth and Ivy -------------------------------------------------
  { dispensary:"earth-and-ivy-new-brunswick", name:"Mary Jane Monday",
    days:[1], frequency:"weekly", confidence:90, typical_discount:25,
    category:"flower", last_seen:"2026-04-07", source:"confirmed", notes:"" },
  { dispensary:"earth-and-ivy-new-brunswick", name:"Terpene Tuesday",
    days:[2], frequency:"weekly", confidence:88, typical_discount:25,
    category:"vapes", last_seen:"2026-04-01", source:"confirmed", notes:"" },
  { dispensary:"earth-and-ivy-new-brunswick", name:"Wax Wednesday",
    days:[3], frequency:"weekly", confidence:88, typical_discount:25,
    category:"concentrates", last_seen:"2026-04-02", source:"confirmed", notes:"" },
  { dispensary:"earth-and-ivy-new-brunswick", name:"Happy Hour",
    days:[1,2,3,4], frequency:"weekly", confidence:85, typical_discount:25,
    category:"storewide", last_seen:"2026-04-07",
    source:"confirmed", notes:"Mon-Thu 4-7pm" },

  // -- Ascend --------------------------------------------------------
  { dispensary:"ascend-rochelle-park", name:"Ozone Brand Day",
    days:[3], frequency:"weekly", confidence:75, typical_discount:20,
    category:"brand", brand:"Ozone", last_seen:"2026-04-02",
    source:"community", notes:"Wednesday brand features, Ozone most common" },
  { dispensary:"ascend-fort-lee", name:"Weekend Sale",
    days:[5,6], frequency:"biweekly", confidence:65, typical_discount:15,
    category:"storewide", last_seen:"2026-03-28",
    source:"community", notes:"Fort Lee location runs weekend deals regularly" },

  // -- HoneyGrove ----------------------------------------------------
  { dispensary:"honeygrove-medford", name:"Hive Member Sale",
    days:[1], frequency:"weekly", confidence:80, typical_discount:25,
    category:"storewide", last_seen:"2026-04-07",
    source:"community", notes:"Loyalty members get Monday deals" },
  { dispensary:"honeygrove-medford", name:"Saturday Drop",
    days:[6], frequency:"biweekly", confidence:70, typical_discount:20,
    category:"storewide", last_seen:"2026-03-29",
    source:"community", notes:"Unannounced Saturday sales, very common" },

  // -- BluLight -----------------------------------------------------
  { dispensary:"blulight-cannabis-linden", name:"Weekend Flash Sale",
    days:[5,6], frequency:"weekly", confidence:75, typical_discount:25,
    category:"storewide", last_seen:"2026-04-05",
    source:"community", notes:"BluLight known for aggressive weekend pricing" },

  // -- Brotherly Bud -------------------------------------------------
  { dispensary:"brotherly-bud", name:"Weekend Deals",
    days:[5,6,0], frequency:"weekly", confidence:78, typical_discount:20,
    category:"storewide", last_seen:"2026-04-06",
    source:"community", notes:"Small independent -- runs deals most weekends" },

  // -- Quality Cannabliss --------------------------------------------
  { dispensary:"quality-cannabliss", name:"Daily Deal",
    days:[0,1,2,3,4,5,6], frequency:"weekly", confidence:85, typical_discount:35,
    category:"storewide", last_seen:"2026-04-06",
    source:"confirmed", notes:"Always have a deal running -- check daily" },

  // -- Curaleaf -----------------------------------------------------
  { dispensary:"curaleaf-bellmawr", name:"Weekend Loyalty Deal",
    days:[5,6], frequency:"biweekly", confidence:60, typical_discount:15,
    category:"storewide", last_seen:"2026-03-28",
    source:"community", notes:"Curaleaf loyalty members get weekend extras" },

  // -- Nirvana -------------------------------------------------------
  { dispensary:"nirvana-dispensary-mt-laurel", name:"Brand of the Week",
    days:[1], frequency:"weekly", confidence:72, typical_discount:20,
    category:"brand", last_seen:"2026-04-07",
    source:"community", notes:"Monday brand feature rotates weekly -- Full Tilt, Cookies, etc." },
  { dispensary:"nirvana-dispensary-mt-laurel", name:"Saturday Sale",
    days:[6], frequency:"biweekly", confidence:68, typical_discount:20,
    category:"storewide", last_seen:"2026-03-29",
    source:"community", notes:"Saturday flash sales, check their Instagram day-of" },
];

const CONFIDENCE_LABELS = {
  high:   { min:80, label:"Very Likely",  color:"#3d6b42", bg:"#eef8f2" },
  medium: { min:60, label:"Likely",       color:"#c8a96e", bg:"#fdf3e3" },
  low:    { min:0,  label:"Possible",     color:"#9a9a8a", bg:"#f7f5f0" },
};

function getConfidenceLevel(confidence) {
  if (confidence >= 80) return CONFIDENCE_LABELS.high;
  if (confidence >= 60) return CONFIDENCE_LABELS.medium;
  return CONFIDENCE_LABELS.low;
}

function getPredictionsForDay(dayIndex) {
  return SALE_PATTERNS
    .filter(p => p.days.includes(dayIndex))
    .map(p => ({
      ...p,
      dispensaryName: DISPENSARIES.find(d => d.slug === p.dispensary)?.name || p.dispensary,
      dispensaryCity: DISPENSARIES.find(d => d.slug === p.dispensary)?.city || "",
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

function getWeekPredictions() {
  const today = new Date().getDay();
  const week = [];
  for (let i = 0; i < 7; i++) {
    const dayIdx = (today + i) % 7;
    const predictions = getPredictionsForDay(dayIdx);
    week.push({
      dayIdx,
      dayName: DAYS[dayIdx],
      isToday: i === 0,
      isTomorrow: i === 1,
      predictions,
      highConfidence: predictions.filter(p => p.confidence >= 80).length,
      totalDeals: predictions.length,
    });
  }
  return week;
}


const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const CUSTOMER_TYPES = [
  { id:"regular",        label:"Regular customer" },
  { id:"first-time",     label:"First-time customer" },
  { id:"senior",         label:"Senior (65+)" },
  { id:"veteran",        label:"Veteran" },
  { id:"medical",        label:"Medical patient" },
  { id:"member",         label:"Loyalty member" },
  { id:"first-responder",label:"First responder" },
  { id:"industry",       label:"Industry worker" },
  { id:"teacher",        label:"Teacher" },
];

const CATEGORIES = ["All","Flower","Pre-Rolls","Vapes","Concentrates","Edibles","Accessories"];

// --- DISPENSARIES ----------------------------------------------------
const DISPENSARIES = [
  { slug:"nar-cannabis-mt-laurel",          name:"NAR Cannabis Mt Laurel",           city:"Mt Laurel",       county:"Burlington" },
  { slug:"nirvana-dispensary-mt-laurel",    name:"Nirvana Dispensary",               city:"Mt Laurel",       county:"Burlington" },
  { slug:"curaleaf-bordentown",             name:"Curaleaf Bordentown",              city:"Bordentown",      county:"Burlington" },
  { slug:"zen-leaf-mount-holly",            name:"Zen Leaf Mount Holly",             city:"Mount Holly",     county:"Burlington" },
  { slug:"honeygrove-medford",              name:"HoneyGrove",                       city:"Medford",         county:"Burlington" },
  { slug:"curaleaf-bellmawr",               name:"Curaleaf Bellmawr",                city:"Bellmawr",        county:"Camden"     },
  { slug:"eastern-green-voorhees",          name:"Eastern Green Voorhees",           city:"Voorhees",        county:"Camden"     },
  { slug:"blulight-gloucester",             name:"BluLight Cannabis Gloucester",     city:"Gloucester City", county:"Camden"     },
  { slug:"rise-bloomfield",                 name:"RISE Bloomfield",                  city:"Bloomfield",      county:"Essex"      },
  { slug:"apothecarium-maplewood",          name:"The Apothecarium Maplewood",       city:"Maplewood",       county:"Essex"      },
  { slug:"rise-paramus",                    name:"RISE Paramus",                     city:"Paramus",         county:"Bergen"     },
  { slug:"ascend-rochelle-park",            name:"Ascend Rochelle Park",             city:"Rochelle Park",   county:"Bergen"     },
  { slug:"curaleaf-ewing",                  name:"Curaleaf Ewing",                   city:"Ewing",           county:"Mercer"     },
  { slug:"earth-and-ivy-new-brunswick",     name:"Earth and Ivy New Brunswick",      city:"New Brunswick",   county:"Middlesex"  },
  { slug:"breakwater-cranbury",             name:"Breakwater Cranbury",              city:"Cranbury",        county:"Middlesex"  },
  { slug:"zen-leaf-neptune",                name:"Zen Leaf Neptune",                 city:"Neptune",         county:"Monmouth"   },
  { slug:"zen-leaf-elizabeth",              name:"Zen Leaf Elizabeth",               city:"Elizabeth",       county:"Union"      },
  { slug:"story-cannabis-springfield",      name:"Story Cannabis Springfield",       city:"Springfield",     county:"Union"      },
  { slug:"queen-city-plainfield",           name:"Queen City Plainfield",            city:"Plainfield",      county:"Union"      },
  { slug:"theo-cannabis-franklin-park",     name:"Theo's Cannabis Franklin Park",    city:"Franklin Park",   county:"Middlesex"  },
  { slug:"brotherly-bud",                   name:"Brotherly Bud",                    city:"Phillipsburg",    county:"Warren"     },
  { slug:"blulight-cannabis-linden",        name:"BluLight Cannabis",                city:"Linden",          county:"Union"      },
  { slug:"quality-cannabliss",              name:"Quality Cannabliss",               city:"Pemberton",       county:"Burlington" },
];

const COUNTIES = ["All", ...Array.from(new Set(DISPENSARIES.map(d=>d.county))).sort()];

// --- FAKE PRICE GENERATOR --------------------------------------------
function srand(s){const x=Math.sin(s)*10000;return x-Math.floor(x);}
const WEIGHTS = [
  {label:"1g",   grams:1},
  {label:"3.5g", grams:3.5},
  {label:"7g",   grams:7},
  {label:"14g",  grams:14},
  {label:"28g",  grams:28},
];
const BASE_PRICES = {"1g":14,"3.5g":45,"7g":80,"14g":140,"28g":230};


function getSaleLikelihood(dispensarySlug, dayOfWeek) {
  const patterns = SALE_PATTERNS.filter(p =>
    p.dispensary === dispensarySlug && p.days.includes(dayOfWeek)
  );
  if (patterns.length === 0) return null;
  const best = patterns.sort((a, b) => b.confidence - a.confidence)[0];
  return {
    confidence: best.confidence,
    name: best.name,
    typical_discount: best.typical_discount,
    category: best.category,
    frequency: best.frequency,
  };
}

function getBasePrice(dispSlug, strainName, weight){
  const base = BASE_PRICES[weight] || 45;
  const seed = dispSlug.length * 17 + strainName.length * 13 + weight.length * 7;
  const variance = (srand(seed) * 0.2) - 0.1;
  return Math.round(base * (1 + variance));
}

// --- DEAL CALCULATOR -------------------------------------------------
function getBestDeal(dispensarySlug, basePrice, options = {}) {
  // NOTE: Discounts DO NOT stack. Only the single best applicable
  // discount is applied. This mirrors how NJ dispensaries actually work.
  const {
    dayOfWeek = new Date().getDay(),
    customerType = "regular",
    category = "Flower",
    brand = "",
    isFirstTime = false,
    currentHour = new Date().getHours(),
  } = options;

  const dispDeals = DEALS.filter(d => d.dispensary === dispensarySlug);
  let bestDiscount = 0;
  let bestDealName = "";

  for (const deal of dispDeals) {
    // Skip if wrong day
    if (deal.day !== null && deal.day !== dayOfWeek) continue;

    // Skip if wrong customer type
    if (deal.customerType && deal.customerType !== customerType) continue;

    // Skip first-time deals if not a first-time customer
    if (deal.firstTimeOnly && !isFirstTime && customerType !== "first-time") continue;

    // Skip if outside happy hour window
    if (deal.timeStart) {
      const startH = parseInt(deal.timeStart.split(":")[0]);
      const endH   = parseInt(deal.timeEnd.split(":")[0]);
      if (currentHour < startH || currentHour >= endH) continue;
    }

    // Check if this deal applies to the selected category/brand
    let applies = false;
    if (deal.applies_to === "storewide") applies = true;
    else if (deal.applies_to === "category" && deal.category === category) applies = true;
    else if (deal.applies_to === "brand" && brand && deal.brand === brand) applies = true;
    else if (deal.applies_to === "brand_product" && brand && deal.brand === brand) applies = true;
    if (!applies) continue;

    // Keep only the single highest discount -- no stacking
    if (deal.pct && deal.pct > bestDiscount) {
      bestDiscount = deal.pct;
      bestDealName = deal.name;
    }
    if (deal.fixedPrice && deal.applies_to !== "product") {
      const implied = Math.round((1 - deal.fixedPrice / basePrice) * 100);
      if (implied > bestDiscount) {
        bestDiscount = implied;
        bestDealName = deal.name;
      }
    }
  }

  // Apply the single best discount to get final price
  const discountedPrice = Math.round(basePrice * (1 - bestDiscount / 100));
  return { discountedPrice, bestDiscount, bestDealName };
}

// --- TIERS -----------------------------------------------------------
const TIERS = {
  free: { id:"free", name:"Free", price:0 },
  plus: { id:"plus", name:"FindWeedNJ+", price:5 },
  pro:  { id:"pro",  name:"FindWeedNJ Pro", price:10 },
};

// --- PRICING MODAL ---------------------------------------------------

function PricingModal({ onSelect, onClose, currentTier }) {
  const [billing, setBilling] = useState("monthly");
  const features = [
    { label:"All 130+ NJ dispensaries",             plus:true  },
    { label:"All weights (1g, 3.5g, 7g, 14g, 28g)", plus:true  },
    { label:"Day-specific deal calculator",          plus:true  },
    { label:"Customer type discount calculator",     plus:true  },
    { label:"Real out-of-pocket price with tax",     plus:true  },
    { label:"Brand-specific deal finder",            plus:true  },
    { label:"County and dispensary filter",          plus:true  },
    { label:"Find a Strain across all menus",        plus:true  },
    { label:"Live prices every 30 minutes",          plus:true  },
    { label:"Price history and trend tracking",      plus:false },
    { label:"Price drop alerts (email/push)",        plus:false },
    { label:"Weekly deal digest email",              plus:false },
  ];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(44,44,44,.55)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px 16px",overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:20,padding:"36px 32px",maxWidth:480,width:"100%",boxShadow:"0 24px 64px rgba(0,0,0,.15)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:28,marginBottom:8}}>🔍</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:"#2c2c2c",marginBottom:4}}>FindWeedNJ+</div>
          <div style={{fontSize:11,color:"#9a9a8a",marginBottom:14}}>Launching April 13, 2026</div>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"linear-gradient(135deg,#3d6b42,#6a9e6f)",color:"#fff",borderRadius:20,padding:"5px 14px",fontSize:11,fontWeight:700,marginBottom:14,letterSpacing:"1px"}}>
            🌿 4/20 LAUNCH SPECIAL
          </div>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:4,marginBottom:4}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:48,fontWeight:700,color:"#6a9e6f"}}>FREE</span>
          </div>
          <div style={{fontSize:14,color:"#3d6b42",fontWeight:700,marginBottom:6}}>First month free -- no credit card required</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:13,color:"#9a9a8a",textDecoration:"line-through"}}>$6.99/mo</span>
            <span style={{fontSize:13,color:"#9a9a8a"}}>after May 13th</span>
          </div>
          <div style={{display:"inline-flex",background:"#ede9e0",borderRadius:20,padding:3,border:"1px solid #ddd8cc"}}>
            {[["monthly","Monthly"],["annual","Annual . save 25%"]].map(([k,l])=>(
              <button key={k} onClick={()=>setBilling(k)} style={{background:billing===k?"#fff":"transparent",border:"none",borderRadius:17,padding:"6px 16px",fontSize:12,fontWeight:billing===k?700:400,color:billing===k?"#3d6b42":"#9a9a8a",cursor:"pointer",fontFamily:"'Lato',sans-serif"}}>{l}</button>
            ))}
          </div>
          {billing==="annual"&&<div style={{fontSize:12,color:"#3d6b42",fontWeight:700,marginTop:6}}>or $62.91/year after promo -- save 25%</div>}
        </div>
        <button onClick={()=>onSelect("plus")} style={{width:"100%",padding:"14px",borderRadius:10,background:"linear-gradient(135deg,#3d6b42,#6a9e6f)",border:"none",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Lato',sans-serif",marginBottom:20,boxShadow:"0 4px 16px rgba(61,107,66,.3)"}}>
          🌿 Claim Free Month →
        </button>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:20}}>
          {features.map(f=>(
            <div key={f.label} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0"}}>
              <span style={{fontSize:13,color:f.plus?"#3d6b42":"#ddd",flexShrink:0}}>{f.plus?"✓":"-"}</span>
              <span style={{fontSize:11,color:f.plus?"#5a5a5a":"#bbb"}}>{f.label}</span>
            </div>
          ))}
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:11,color:"#9a9a8a",marginBottom:8}}>No credit card required . Free through May 13th . $6.99/mo after . Cancel anytime</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#9a9a8a",fontSize:12,cursor:"pointer",textDecoration:"underline",fontFamily:"'Lato',sans-serif"}}>Maybe later</button>
        </div>
      </div>
    </div>
  );
}



export default function App() {
  const [tier,           setTier]          = useState("plus");
  const [showPricing,    setShowPricing]   = useState(false);
  const [tab,            setTab]           = useState("compare");
  const [showAdmin,      setShowAdmin]     = useState(false);
  const [showAdminLogin, setShowAdminLogin]= useState(false);
  const [adminPass,      setAdminPass]     = useState("");
  const [adminErr,       setAdminErr]      = useState(false);
  const [keyBuf,         setKeyBuf]        = useState("");

  // Filters
  const [selectedWeight, setSelectedWeight]= useState("3.5g");
  const [selectedCat,    setSelectedCat]   = useState("Flower");
  const [countyFilter,   setCountyFilter]  = useState("All");
  const [dispSearch,     setDispSearch]    = useState("");
  const [sortMode,       setSortMode]      = useState("final_asc");

  // Deal calculator
  const [customerType,   setCustomerType] = useState("regular");
  const [isFirstTime,    setIsFirstTime]  = useState(false);
  const [includeTax,     setIncludeTax]   = useState(true);
  const [selectedDay,    setSelectedDay]  = useState(new Date().getDay());
  const [currentHour,    setCurrentHour]  = useState(new Date().getHours());
  const [isMedical,      setIsMedical]    = useState(false);

  // Strain finder
  const [strainQuery,    setStrainQuery]  = useState("");
  const [strainResults,  setStrainResults]= useState(null);
  const [strainLoading,  setStrainLoading]= useState(false);

  // Live data from API -- loaded via window globals set before React mounts
  const [liveProducts,   setLiveProducts] = useState(window.__LIVE_PRODUCTS__ || []);
  const [apiStatus,      setApiStatus]    = useState(window.__API_STATUS__ || "loading");

  useEffect(() => {
    // If data already loaded by preloader, use it
    if (window.__LIVE_PRODUCTS__ && window.__LIVE_PRODUCTS__.length > 0) {
      setLiveProducts(window.__LIVE_PRODUCTS__);
      setApiStatus("live");
      return;
    }
    // Otherwise fetch now
    fetch(API_URL + "/prices")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          window.__LIVE_PRODUCTS__ = data;
          setLiveProducts(data);
          setApiStatus("live");
        } else {
          setApiStatus("empty");
        }
      })
      .catch(() => setApiStatus("error"));
  }, []);

  // Admin keyboard shortcut
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") { setShowAdminLogin(true); return; }
      const buf = (keyBuf + e.key).slice(-5);
      setKeyBuf(buf);
      if (buf === "admin") { setShowAdminLogin(true); setKeyBuf(""); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyBuf]);

  function doAdminLogin() {
    if (adminPass === ADMIN_PASSWORD) {
      setShowAdmin(true); setShowAdminLogin(false);
      setAdminPass(""); setAdminErr(false);
    } else { setAdminErr(true); setAdminPass(""); }
  }

  const perms = {
    allDispensaries: true, allWeights: true, dealCalc: true,
    taxCalc: true, countyFilter: true, strainLibrary: true,
    priceHistory: false, alerts: false,
  };

  const allRows = useMemo(() => {
    // Live data only -- no mock prices
    if (liveProducts.length === 0) return [];

    const weightTarget = WEIGHTS.find(w => w.label === selectedWeight)?.grams;

    // Group products by dispensary
    const byDispensary = {};
    liveProducts.forEach(p => {
      const slug = p.dispensary_slug;
      if (!byDispensary[slug]) byDispensary[slug] = [];
      byDispensary[slug].push(p);
    });

    return Object.entries(byDispensary)
      .map(([slug, products]) => {
        // Filter by category and weight
        let matching = products.filter(p => {
          const catMatch = selectedCat === "All" ||
            (p.category || "").toLowerCase().includes(selectedCat.toLowerCase());
          const weightMatch = !weightTarget ||
            Math.abs((p.weight_grams || 0) - weightTarget) < 0.5;
          return catMatch && weightMatch;
        });
        if (matching.length === 0) return null;

        const cheapest = matching.sort((a, b) => a.price_usd - b.price_usd)[0];
        const basePrice = cheapest.price_usd;

        const dispInfo = DISPENSARIES.find(d => d.slug === slug) || {
          slug, name: slug,
          city: cheapest.city || "",
          county: cheapest.county || "",
        };

        if (countyFilter !== "All" && dispInfo.county !== countyFilter) return null;
        if (dispSearch && !dispInfo.name.toLowerCase().includes(dispSearch.toLowerCase())) return null;

        const { discountedPrice, bestDiscount, bestDealName } = getBestDeal(slug, basePrice, {
          dayOfWeek: selectedDay,
          customerType: isFirstTime ? "first-time" : customerType,
          category: selectedCat, isFirstTime, currentHour,
        });
        const taxRate = getTaxRate(dispInfo.city, isMedical);
        const taxAmount = Math.round(discountedPrice * taxRate * 100) / 100;
        const finalPrice = Math.round(discountedPrice * (1 + taxRate) * 100) / 100;
        const saleLikelihood = getSaleLikelihood(slug, selectedDay);

        return {
          ...dispInfo, basePrice, discountedPrice, bestDiscount, bestDealName,
          taxRate, taxAmount, finalPrice, saleLikelihood,
          productCount: products.length,
          strainName: cheapest.name,
          brand: cheapest.brand || "",
          thc: cheapest.thc_pct,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (sortMode === "final_asc")  return a.finalPrice - b.finalPrice;
        if (sortMode === "final_desc") return b.finalPrice - a.finalPrice;
        if (sortMode === "discount")   return b.bestDiscount - a.bestDiscount;
        if (sortMode === "tax")        return a.taxRate - b.taxRate;
        return a.name.localeCompare(b.name);
      });
  }, [liveProducts, countyFilter, dispSearch, selectedWeight, selectedCat,
      selectedDay, customerType, isFirstTime, currentHour, isMedical, sortMode]);

  const cheapest = allRows[0]?.finalPrice;
  const savings  = allRows.length > 1 ? (allRows[allRows.length-1].finalPrice - cheapest).toFixed(2) : 0;

  const todayDeals = useMemo(() => {
    return DEALS.filter(d => d.day === selectedDay && d.pct)
      .map(d => ({ ...d, dispensaryName: DISPENSARIES.find(disp => disp.slug === d.dispensary)?.name || d.dispensary }))
      .sort((a,b) => b.pct - a.pct);
  }, [selectedDay]);

  function doStrainSearch() {
    if (strainQuery.trim().length < 2) return;
    setStrainLoading(true);
    fetch(`${API_URL}/strains/search?q=${encodeURIComponent(strainQuery)}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Map API response to component format
          const mapped = data.map(p => ({
            dispensary: p.dispensary_slug,
            city: p.city || "",
            county: p.county || "",
            slug: p.dispensary_slug,
            strain: p.name,
            brand: p.brand || "",
            category: p.category || "Flower",
            weight: p.weight_grams ? `${p.weight_grams}g` : "",
            price: p.price_usd,
            thc: p.thc_pct,
            in_stock: p.in_stock,
          }));
          setStrainResults(mapped);
        } else {
          setStrainResults([]);
        }
        setStrainLoading(false);
      })
      .catch(() => {
        setStrainResults([]);
        setStrainLoading(false);
      });
  }

  return (
    <div style={{minHeight:"100vh",background:"#f7f5f0",fontFamily:"'Lato',sans-serif",color:"#2c2c2c"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Lato:wght@300;400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .inp{background:#fff;border:1.5px solid #ddd8cc;color:#2c2c2c;padding:9px 14px;font-family:'Lato',sans-serif;font-size:13px;border-radius:8px;outline:none;width:100%;transition:border .2s}
        .inp:focus{border-color:#6a9e6f;box-shadow:0 0 0 3px rgba(106,158,111,.12)}
        .card{background:#fff;border:1px solid #ddd8cc;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,.06)}
        .tab-btn{background:none;border:none;color:#9a9a8a;cursor:pointer;padding:10px 18px;font-family:'Lato',sans-serif;font-size:13px;border-bottom:2px solid transparent;transition:all .2s}
        .tab-btn.on{color:#3d6b42;border-bottom-color:#6a9e6f;font-weight:700}
        .prow{display:flex;align-items:center;gap:12px;padding:14px 18px;background:#fff;border:1.5px solid #ddd8cc;border-radius:10px;margin-bottom:6px;cursor:pointer;transition:all .15s}
        .prow:hover{border-color:#b8d4bb;box-shadow:0 4px 16px rgba(0,0,0,.08);transform:translateY(-1px)}
        .prow.best{background:linear-gradient(135deg,#eef8f0,#fff);border-color:#b8d4bb}
        .cbx{display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;border-radius:10px;border:1.5px solid #ddd8cc;background:#fff;transition:all .15s;margin-bottom:8px}
        .cbx:hover{border-color:#b8d4bb;background:#eef8f2}
        .cbx.on{border-color:#6a9e6f;background:#eef8f2}
        .live-dot{width:8px;height:8px;border-radius:50%;background:#6a9e6f;animation:pulse 2s infinite;display:inline-block}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .fade{animation:fi .3s ease}@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .sel-btn{background:#fff;border:1.5px solid #ddd8cc;color:#5a5a5a;cursor:pointer;padding:7px 14px;font-family:'Lato',sans-serif;font-size:12px;border-radius:20px;transition:all .15s;white-space:nowrap}
        .sel-btn:hover{border-color:#6a9e6f;color:#3d6b42}
        .sel-btn.on{background:#6a9e6f;border-color:#6a9e6f;color:#fff;font-weight:700}
        .upgrade-btn{border:none;border-radius:8px;padding:9px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Lato',sans-serif;transition:all .15s}
        .upgrade-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.15)}
        .prog-bar{height:8px;background:#e8f2e8;border-radius:4px;overflow:hidden}
        .prog-fill{height:100%;border-radius:4px;transition:width .6s}
      `}</style>

      {/* HEADER */}
      <header style={{background:"#fff",borderBottom:"1px solid #ddd8cc",padding:"0 28px",position:"sticky",top:0,zIndex:50,boxShadow:"0 1px 12px rgba(0,0,0,.05)"}}>
        <div style={{maxWidth:1300,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0 8px"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:28,lineHeight:1}}>🔍</div>
              <div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:21,fontWeight:700,color:"#3d6b42",lineHeight:1}}>FindWeedNJ</div>
                <div style={{fontSize:9,color:"#9a9a8a",letterSpacing:"2px",textTransform:"uppercase",marginTop:1}}>NJ Dispensary Price Intelligence</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div className="live-dot" style={{background:apiStatus==="live"?"#6a9e6f":apiStatus==="error"?"#e07b6a":"#c8a96e"}}/>
                <span style={{fontSize:11,color:apiStatus==="live"?"#3d6b42":apiStatus==="error"?"#e07b6a":"#c8a96e",fontWeight:700,letterSpacing:"1px"}}>
                  {apiStatus==="live"?"LIVE":apiStatus==="error"?"OFFLINE":"LOADING"}
                </span>
              </div>
              <div style={{fontSize:11,color:"#3d6b42",padding:"4px 12px",background:"#eef8f2",borderRadius:20,border:"1px solid #b8d4bb",fontWeight:700}}>✓ FindWeedNJ+ Active</div>
              <button className="upgrade-btn" onClick={()=>setShowPricing(true)} style={{background:"linear-gradient(135deg,#3d6b42,#6a9e6f)",color:"#fff"}}>
                🌿 4/20 Free Month →
              </button>
            </div>
          </div>
          <div style={{display:"flex",gap:0}}>
            {[["compare","💰 Price Compare"],["deals","🏷 Today's Deals"],["calculator","🧮 Deal Calculator"],["finder","🔍 Find a Strain"],["strains","🌱 Strain Library"]].map(([k,l])=>(
              <button key={k} className={"tab-btn"+(tab===k?" on":"")} onClick={()=>setTab(k)}>{l}</button>
            ))}
          </div>
        </div>
      </header>

      <div style={{maxWidth:1300,margin:"0 auto",padding:"24px 28px"}}>

        {/* COMPARE TAB */}
        {tab==="compare"&&(
          <div className="fade" style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:24,alignItems:"start"}}>
            <div style={{position:"sticky",top:100,display:"flex",flexDirection:"column",gap:10}}>
              <div className="card" style={{padding:18}}>
                <div style={{fontSize:10,color:"#9a9a8a",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Filters</div>
                <input className="inp" placeholder="Search dispensary..." value={dispSearch} onChange={e=>setDispSearch(e.target.value)} style={{marginBottom:8}}/>
                <select className="inp" value={countyFilter} onChange={e=>setCountyFilter(e.target.value)} style={{marginBottom:8}}>
                  {COUNTIES.map(c=><option key={c} value={c}>{c==="All"?"All Counties":c+" County"}</option>)}
                </select>
                <div style={{fontSize:10,color:"#9a9a8a",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:6}}>Category</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                  {CATEGORIES.map(c=><button key={c} className={"sel-btn"+(selectedCat===c?" on":"")} onClick={()=>setSelectedCat(c)} style={{fontSize:11,padding:"5px 10px"}}>{c}</button>)}
                </div>
                <div style={{fontSize:10,color:"#9a9a8a",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:6}}>Weight</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {WEIGHTS.map(w=><button key={w.label} className={"sel-btn"+(selectedWeight===w.label?" on":"")} onClick={()=>setSelectedWeight(w.label)} style={{fontSize:11,padding:"5px 10px"}}>{w.label}</button>)}
                </div>
              </div>
              <div className="card" style={{padding:18}}>
                <div style={{fontSize:10,color:"#9a9a8a",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Deal Calculator</div>
                <div style={{fontSize:11,color:"#5a5a5a",marginBottom:4}}>Shopping day</div>
                <select className="inp" value={selectedDay} onChange={e=>setSelectedDay(parseInt(e.target.value))} style={{marginBottom:8}}>
                  {DAYS.map((d,i)=><option key={i} value={i}>{d}{i===new Date().getDay()?" (Today)":""}</option>)}
                </select>
                <div style={{fontSize:11,color:"#5a5a5a",marginBottom:4}}>Customer type</div>
                <select className="inp" value={customerType} onChange={e=>setCustomerType(e.target.value)} style={{marginBottom:8}}>
                  {CUSTOMER_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <div className={"cbx"+(isFirstTime?" on":"")} onClick={()=>setIsFirstTime(v=>!v)}>
                  <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+(isFirstTime?"#6a9e6f":"#ddd8cc"),background:isFirstTime?"#6a9e6f":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {isFirstTime&&<span style={{color:"#fff",fontSize:11}}>✓</span>}
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:isFirstTime?"#3d6b42":"#2c2c2c"}}>First-time customer</div>
                    <div style={{fontSize:10,color:"#9a9a8a",marginTop:1}}>Apply first-time discounts</div>
                  </div>
                </div>
              </div>
              <div className="card" style={{padding:18}}>
                <div style={{fontSize:10,color:"#9a9a8a",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Tax Calculator</div>
                <div className={"cbx"+(includeTax?" on":"")} onClick={()=>setIncludeTax(v=>!v)}>
                  <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+(includeTax?"#6a9e6f":"#ddd8cc"),background:includeTax?"#6a9e6f":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {includeTax&&<span style={{color:"#fff",fontSize:11}}>✓</span>}
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700}}>Include NJ tax</div>
                    <div style={{fontSize:10,color:"#9a9a8a"}}>Shows real out-of-pocket cost</div>
                  </div>
                </div>
                <div className={"cbx"+(isMedical?" on":"")} onClick={()=>setIsMedical(v=>!v)}>
                  <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+(isMedical?"#6a9e6f":"#ddd8cc"),background:isMedical?"#6a9e6f":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {isMedical&&<span style={{color:"#fff",fontSize:11}}>✓</span>}
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700}}>Medical patient</div>
                    <div style={{fontSize:10,color:"#9a9a8a"}}>Tax-exempt since July 2022</div>
                  </div>
                </div>
              </div>
              <div className="card" style={{padding:18}}>
                <div style={{fontSize:10,color:"#9a9a8a",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:8,fontWeight:700}}>Sort By</div>
                <select className="inp" value={sortMode} onChange={e=>setSortMode(e.target.value)}>
                  <option value="final_asc">Final Price: Low to High</option>
                  <option value="final_desc">Final Price: High to Low</option>
                  <option value="discount">Biggest Discount</option>
                  <option value="tax">Lowest Tax Rate</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>
            </div>

            <div>
              <div className="card fade" style={{padding:"16px 22px",marginBottom:18,background:"linear-gradient(135deg,#eef8f2,#fff)",borderColor:"#b8d4bb"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
                  <div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:"#9a9a8a",marginBottom:2}}>
                      {selectedWeight} . {selectedCat} . {DAYS[selectedDay]}{isFirstTime?" . First-time":""}{includeTax?" . with tax":""}{isMedical?" . Medical":""} 
                    </div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#3d6b42"}}>
                      {allRows.length > 0 ? (
                        <>Best price: ${cheapest?.toFixed(2)??"--"}
                        <span style={{fontSize:13,color:"#9a9a8a",fontWeight:400,marginLeft:8}}>{allRows[0]?.name}</span></>
                      ) : (
                        <span style={{fontSize:16,color:"#9a9a8a"}}>
                          {apiStatus==="loading"?"Loading live prices...":"Scraper running -- check back soon"}
                        </span>
                      )}
                    </div>
                    {savings>0&&<div style={{fontSize:12,color:"#c8a96e",marginTop:2,fontWeight:700}}>Save up to ${savings} vs most expensive</div>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                    {[
                      {l:"In Stock",v:allRows.length,c:"#3d6b42"},
                      {l:"Deals Today",v:allRows.filter(r=>r.bestDiscount>0).length,c:"#c8a96e"},
                      {l:"Avg Discount",v:`${Math.round(allRows.filter(r=>r.bestDiscount>0).reduce((s,r)=>s+r.bestDiscount,0)/(allRows.filter(r=>r.bestDiscount>0).length||1))}%`,c:"#7b5ea7"},
                    ].map(({l,v,c})=>(
                      <div key={l} style={{padding:"10px 12px",background:"#fff",borderRadius:8,border:"1px solid #ddd8cc",textAlign:"center"}}>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:c}}>{v}</div>
                        <div style={{fontSize:9,color:"#9a9a8a",textTransform:"uppercase",letterSpacing:"1px",marginTop:2}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sale prediction legend - hidden until SHOW_PREDICTIONS=true */}
              {SHOW_PREDICTIONS&&(
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,padding:"8px 14px",background:"#fff",borderRadius:8,border:"1px solid #ddd8cc",fontSize:11,color:"#9a9a8a",flexWrap:"wrap"}}>
                <span style={{fontWeight:700,color:"#5a5a5a"}}>🔮 Sale predictions:</span>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:"#6a9e6f",display:"inline-block"}}/>Very likely (≥80%)</span>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:"#c8a96e",display:"inline-block"}}/>Possible (60-79%)</span>
                <span style={{color:"#bbb"}}>Based on historical scraper data . Not guaranteed</span>
              </div>
              )}

              {allRows.length === 0 && (
                <div style={{textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:16,border:"1.5px dashed #ddd8cc"}}>
                  <div style={{fontSize:40,marginBottom:16}}>
                    {apiStatus==="loading"?"⏳":"🌿"}
                  </div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,marginBottom:8,color:"#2c2c2c"}}>
                    {apiStatus==="loading"?"Loading live dispensary prices...":"Scraper warming up"}
                  </div>
                  <div style={{fontSize:13,color:"#9a9a8a",maxWidth:400,margin:"0 auto",lineHeight:1.6}}>
                    {apiStatus==="loading"
                      ? "Connecting to live NJ dispensary data. Should take just a moment."
                      : "The scraper is collecting real-time prices from 97 NJ dispensaries. First run takes about 30 minutes. Check back soon -- prices will appear here automatically."}
                  </div>
                </div>
              )}

              {allRows.map((d,i)=>{
                const best = i===0;
                const barPct = allRows.length>1 ? Math.max(10,100-((d.finalPrice-cheapest)/(allRows[allRows.length-1].finalPrice-cheapest+0.01))*90) : 100;
                return (
                  <div key={d.slug} className={"prow"+(best?" best":"")}>
                    <div style={{width:22,fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:best?"#3d6b42":"#9a9a8a",textAlign:"right",flexShrink:0}}>#{i+1}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
                      {d.liveProductName&&<div style={{fontSize:11,color:"#3d6b42",fontWeight:700,marginBottom:1}}>📦 {d.liveProductName}{d.liveProductBrand?` -- ${d.liveProductBrand}`:""}</div>}
                      <div style={{fontSize:11,color:"#9a9a8a"}}>{d.city} . {d.county} Co.{d.isLiveData?" . ✓ Live":"" }</div>
                      {d.bestDealName&&<div style={{fontSize:10,color:"#c8a96e",marginTop:3,fontWeight:700}}>🏷 Best deal: {d.bestDealName} -- {d.bestDiscount}% off (discounts don't stack)</div>}
                      {SHOW_PREDICTIONS&&!d.bestDealName&&d.saleLikelihood&&d.saleLikelihood.confidence>=60&&(
                        <div style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:3,padding:"2px 8px",
                          background:d.saleLikelihood.confidence>=80?"#eef8f2":"#fdf3e3",
                          border:"1px solid "+(d.saleLikelihood.confidence>=80?"#b8d4bb":"#e8c87a"),
                          borderRadius:20,fontSize:10,fontWeight:700,
                          color:d.saleLikelihood.confidence>=80?"#3d6b42":"#c8a96e"}}>
                          🔮 {d.saleLikelihood.confidence>=80?"Sale very likely":"Sale possible"} today
                          {d.saleLikelihood.typical_discount&&` (~${d.saleLikelihood.typical_discount}% off)`}
                        </div>
                      )}
                      {includeTax&&<div style={{fontSize:10,color:"#9a9a8a",marginTop:2}}>📍 {getTaxLabel(d.city,isMedical)}</div>}
                    </div>
                    <div style={{width:120,flexShrink:0}}>
                      <div style={{height:4,background:"#e8f2e8",borderRadius:4}}>
                        <div style={{height:4,width:`${barPct}%`,background:"linear-gradient(90deg,#6a9e6f,#b8d4bb)",borderRadius:4}}/>
                      </div>
                    </div>
                    <div style={{textAlign:"right",minWidth:80,flexShrink:0}}>
                      {d.bestDiscount>0&&<div style={{fontSize:10,color:"#9a9a8a",textDecoration:"line-through"}}>${d.basePrice.toFixed(2)}</div>}
                      {includeTax?(
                        <>
                          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:best?"#3d6b42":"#2c2c2c",lineHeight:1}}>${d.finalPrice.toFixed(2)}</div>
                          <div style={{fontSize:9,color:"#9a9a8a",marginTop:2}}>after tax</div>
                          <div style={{fontSize:10,color:"#9a9a8a"}}>(${d.discountedPrice} + ${d.taxAmount.toFixed(2)} tax)</div>
                        </>
                      ):(
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:best?"#3d6b42":"#2c2c2c",lineHeight:1}}>${d.discountedPrice}</div>
                      )}
                      <div style={{fontSize:9,color:"#9a9a8a"}}>{selectedWeight}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DEALS TAB */}
        {tab==="deals"&&(
          <div className="fade">
            <div style={{marginBottom:20}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,marginBottom:4}}>{DAYS[selectedDay]}'s Deals</div>
              <div style={{fontSize:13,color:"#9a9a8a",marginBottom:12}}>{todayDeals.length} active deals across NJ today</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {DAYS.map((d,i)=>(
                  <button key={i} className={"sel-btn"+(selectedDay===i?" on":"")} onClick={()=>setSelectedDay(i)} style={{fontSize:11,padding:"5px 12px"}}>
                    {d}{i===new Date().getDay()?" ★":""}
                  </button>
                ))}
              </div>
            </div>
            {todayDeals.length===0?(
              <div style={{textAlign:"center",padding:60,color:"#9a9a8a"}}>No specific deals logged for {DAYS[selectedDay]}.</div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
                {todayDeals.map((deal,i)=>(
                  <div key={i} className="card" style={{padding:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div style={{flex:1,paddingRight:10}}>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,marginBottom:3}}>{deal.dispensaryName}</div>
                        <div style={{fontSize:12,fontWeight:700,color:"#3d6b42"}}>{deal.name}</div>
                        {deal.applies_to==="category"&&<div style={{fontSize:11,color:"#9a9a8a",marginTop:2}}>📦 {deal.category} only</div>}
                        {deal.applies_to==="brand"&&<div style={{fontSize:11,color:"#9a9a8a",marginTop:2}}>🏷 {deal.brand} brand</div>}
                        {deal.notes&&<div style={{fontSize:11,color:"#9a9a8a",marginTop:2,fontStyle:"italic"}}>* {deal.notes}</div>}
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:700,color:"#3d6b42",lineHeight:1}}>{deal.pct}%</div>
                        <div style={{fontSize:10,color:"#3d6b42",letterSpacing:"1px",fontWeight:700}}>OFF</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DEAL CALCULATOR TAB */}
        {tab==="calculator"&&(
          <div className="fade">
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,marginBottom:6}}>Deal + Tax Calculator</div>
            <div style={{fontSize:13,color:"#9a9a8a",marginBottom:24}}>Real out-of-pocket price after every discount and tax.</div>
            <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:24,alignItems:"start"}}>
              <div className="card" style={{padding:18,position:"sticky",top:100}}>
                <div style={{fontSize:10,color:"#9a9a8a",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:12,fontWeight:700}}>Settings</div>
                <div style={{fontSize:11,color:"#5a5a5a",marginBottom:4}}>Day of week</div>
                <select className="inp" value={selectedDay} onChange={e=>setSelectedDay(parseInt(e.target.value))} style={{marginBottom:10}}>
                  {DAYS.map((d,i)=><option key={i} value={i}>{d}{i===new Date().getDay()?" (Today)":""}</option>)}
                </select>
                <div style={{fontSize:11,color:"#5a5a5a",marginBottom:4}}>Customer type</div>
                <select className="inp" value={customerType} onChange={e=>setCustomerType(e.target.value)} style={{marginBottom:10}}>
                  {CUSTOMER_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <div style={{fontSize:11,color:"#5a5a5a",marginBottom:4}}>Category</div>
                <select className="inp" value={selectedCat} onChange={e=>setSelectedCat(e.target.value)} style={{marginBottom:10}}>
                  {CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}
                </select>
                <div style={{fontSize:11,color:"#5a5a5a",marginBottom:4}}>Weight</div>
                <select className="inp" value={selectedWeight} onChange={e=>setSelectedWeight(e.target.value)} style={{marginBottom:10}}>
                  {WEIGHTS.map(w=><option key={w.label} value={w.label}>{w.label}</option>)}
                </select>
                <div className={"cbx"+(isFirstTime?" on":"")} onClick={()=>setIsFirstTime(v=>!v)} style={{marginBottom:6}}>
                  <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+(isFirstTime?"#6a9e6f":"#ddd8cc"),background:isFirstTime?"#6a9e6f":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {isFirstTime&&<span style={{color:"#fff",fontSize:11}}>✓</span>}
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:isFirstTime?"#3d6b42":"#2c2c2c"}}>First-time customer</div>
                </div>
                <div className={"cbx"+(isMedical?" on":"")} onClick={()=>setIsMedical(v=>!v)}>
                  <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+(isMedical?"#6a9e6f":"#ddd8cc"),background:isMedical?"#6a9e6f":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {isMedical&&<span style={{color:"#fff",fontSize:11}}>✓</span>}
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:isMedical?"#3d6b42":"#2c2c2c"}}>Medical patient (tax-free)</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
                {allRows.map((d,i)=>{
                  const taxRate = getTaxRate(d.city,isMedical);
                  return (
                    <div key={d.slug} className="card" style={{padding:20,border:"1.5px solid "+(i===0?"#b8d4bb":"#ddd8cc"),background:i===0?"linear-gradient(135deg,#eef8f2,#fff)":"#fff"}}>
                      {i===0&&<div style={{fontSize:10,color:"#3d6b42",fontWeight:700,letterSpacing:"1px",marginBottom:6}}>✦ BEST DEAL TODAY</div>}
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,marginBottom:2}}>{d.name}</div>
                      <div style={{fontSize:11,color:"#9a9a8a",marginBottom:10}}>{d.city} . {d.county} Co.</div>
                      <div style={{background:"#f7f5f0",borderRadius:8,padding:"12px 14px",marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#5a5a5a",marginBottom:4}}>
                          <span>Base price</span><span>${d.basePrice.toFixed(2)}</span>
                        </div>
                        {d.bestDiscount>0&&(
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#3d6b42",marginBottom:4}}>
                            <span>🏷 Best deal: {d.bestDealName}</span>
                            <span>-${(d.basePrice-d.discountedPrice).toFixed(2)}</span>
                          </div>
                        )}
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#9a9a8a",marginBottom:4}}>
                          <span>📍 {isMedical?"Medical (tax-free)":getTaxLabel(d.city,isMedical)}</span>
                          <span>{isMedical?"$0.00":"+$"+d.taxAmount.toFixed(2)}</span>
                        </div>
                        <div style={{borderTop:"1px solid #ddd8cc",paddingTop:8,marginTop:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:13,fontWeight:700}}>You pay</span>
                          <span style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:i===0?"#3d6b42":"#2c2c2c"}}>${d.finalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                      {d.bestDiscount>0?(
                        <div style={{fontSize:11,color:"#3d6b42",fontWeight:700}}>🎉 You save ${(d.basePrice-d.discountedPrice).toFixed(2)} ({d.bestDiscount}% off)</div>
                      ):(
                        <div style={{fontSize:11,color:"#9a9a8a"}}>No deals {DAYS[selectedDay]}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* FIND A STRAIN TAB */}
        {tab==="finder"&&(
          <div className="fade">
            <div style={{maxWidth:700,margin:"0 auto"}}>
              <div style={{textAlign:"center",marginBottom:32}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,marginBottom:8}}>Find a Strain</div>
                <div style={{fontSize:13,color:"#9a9a8a"}}>Search across every NJ dispensary. See who has it, at what price, after your discount and tax.</div>
              </div>
              <div style={{position:"relative",marginBottom:24}}>
                <div style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",fontSize:18,pointerEvents:"none"}}>🔍</div>
                <input className="inp" style={{paddingLeft:46,fontSize:15,padding:"14px 16px 14px 46px",borderRadius:12,border:"2px solid #ddd8cc"}}
                  placeholder="e.g. Duffle Full of Blues, Animal Face, Wedding Cake..."
                  value={strainQuery}
                  onChange={e=>setStrainQuery(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&doStrainSearch()}
                />
                <button onClick={doStrainSearch} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"linear-gradient(135deg,#6a9e6f,#3d6b42)",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Lato',sans-serif"}}>Search</button>
              </div>
              {!strainResults&&!strainLoading&&(
                <div>
                  <div style={{fontSize:11,color:"#9a9a8a",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:12,fontWeight:700}}>Popular in NJ right now</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:32}}>
                    {["Duffle Full of Blues","Animal Face","Wedding Cake","Lemon Cherry Gelato","Gary Payton","Runtz","MAC","Ice Cream Cake","GMO","Jealousy","Zkittlez","Blue Dream","Gelato 41"].map(s=>(
                      <button key={s} onClick={()=>setStrainQuery(s)} className="sel-btn" style={{fontSize:12,padding:"6px 14px"}}>{s}</button>
                    ))}
                  </div>
                  <div style={{textAlign:"center",padding:"40px 20px",background:"#fff",borderRadius:16,border:"1.5px dashed #ddd8cc"}}>
                    <div style={{fontSize:40,marginBottom:12}}>🔍</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,marginBottom:6}}>Search any strain</div>
                    <div style={{fontSize:13,color:"#9a9a8a",maxWidth:400,margin:"0 auto",lineHeight:1.6}}>See every NJ dispensary with it in stock, priced after your discount and tax. Updated every 30 minutes.</div>
                  </div>
                </div>
              )}
              {strainLoading&&(
                <div style={{textAlign:"center",padding:60}}>
                  <div style={{fontSize:32,marginBottom:12}}>🔍</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:"#9a9a8a"}}>Searching all NJ dispensaries...</div>
                </div>
              )}
              {strainResults&&!strainLoading&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700}}>"{strainQuery}"</div>
                      <div style={{fontSize:12,color:"#9a9a8a",marginTop:2}}>{strainResults.length>0?`Found at ${strainResults.length} dispensar${strainResults.length===1?"y":"ies"} in NJ`:"Not found anywhere right now"}</div>
                    </div>
                    <button onClick={()=>{setStrainResults(null);setStrainQuery("");}} style={{background:"none",border:"1.5px solid #ddd8cc",borderRadius:8,padding:"6px 14px",fontSize:12,color:"#9a9a8a",cursor:"pointer",fontFamily:"'Lato',sans-serif"}}>← New search</button>
                  </div>
                  {strainResults.length===0?(
                    <div style={{textAlign:"center",padding:"40px 20px",background:"#fff",borderRadius:16,border:"1.5px solid #ddd8cc"}}>
                      <div style={{fontSize:36,marginBottom:12}}>😔</div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,marginBottom:6}}>Not in stock anywhere right now</div>
                      <div style={{fontSize:13,color:"#9a9a8a"}}>Check back -- menus update every 30 minutes.</div>
                    </div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {strainResults.sort((a,b)=>(a.price*(1+getTaxRate(a.city)))-(b.price*(1+getTaxRate(b.city)))).map((r,i)=>{
                        const deal = getBestDeal(r.slug,r.price,{dayOfWeek:selectedDay,customerType:isFirstTime?"first-time":customerType,category:r.category,isFirstTime});
                        const taxRate = getTaxRate(r.city,isMedical);
                        const finalPrice = (deal.discountedPrice*(1+taxRate)).toFixed(2);
                        const best = i===0;
                        return (
                          <div key={i} className={"prow"+(best?" best":"")} style={{padding:"16px 20px",background:best?"linear-gradient(135deg,#eef8f2,#fff)":"#fff",border:"1.5px solid "+(best?"#b8d4bb":"#ddd8cc")}}>
                            <div style={{width:24,fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:best?"#3d6b42":"#9a9a8a",flexShrink:0}}>#{i+1}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2,flexWrap:"wrap"}}>
                                <span style={{fontSize:14,fontWeight:700}}>{r.dispensary}</span>
                                <span style={{fontSize:11,padding:"2px 8px",background:r.category==="Flower"?"#eef8f2":"#f5f0fc",color:r.category==="Flower"?"#3d6b42":"#7b5ea7",borderRadius:20,fontWeight:700}}>{r.category}</span>
                                {best&&<span style={{fontSize:10,padding:"2px 8px",background:"#3d6b42",color:"#fff",borderRadius:20,fontWeight:700}}>BEST PRICE</span>}
                              </div>
                              <div style={{fontSize:12,color:"#9a9a8a",marginBottom:4}}>{r.city} . {r.county} Co. . {r.weight}</div>
                              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                                {r.thc&&<span style={{fontSize:11,color:"#5a5a5a",fontWeight:700}}>THC {r.thc}%</span>}
                                {r.brand&&<span style={{fontSize:11,color:"#9a9a8a"}}>by {r.brand}</span>}
                                {deal.bestDealName&&<span style={{fontSize:11,color:"#c8a96e",fontWeight:700}}>🏷 {deal.bestDealName} -- {deal.bestDiscount}% off</span>}
                              </div>
                            </div>
                            <div style={{textAlign:"right",flexShrink:0,minWidth:100}}>
                              {deal.bestDiscount>0&&<div style={{fontSize:11,color:"#9a9a8a",textDecoration:"line-through"}}>${r.price.toFixed(2)}</div>}
                              <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:best?"#3d6b42":"#2c2c2c",lineHeight:1}}>${finalPrice}</div>
                              <div style={{fontSize:9,color:"#9a9a8a",marginTop:2}}>after tax</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STRAIN LIBRARY TAB */}
        {tab==="strains"&&(
          <div className="fade" style={{textAlign:"center",padding:"60px 20px"}}>
            <div style={{fontSize:40,marginBottom:16}}>🌱</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,marginBottom:8}}>Strain Library</div>
            <div style={{fontSize:13,color:"#9a9a8a",maxWidth:400,margin:"0 auto"}}>Full strain database with effects, terpenes, and where to find each strain in NJ. Coming soon -- use Find a Strain in the meantime.</div>
          </div>
        )}

      </div>

      {showPricing&&(
        <PricingModal onSelect={(t)=>{setTier(t);setShowPricing(false);}} onClose={()=>setShowPricing(false)} currentTier={tier}/>
      )}

      {showAdminLogin&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}}>
          <div style={{background:"#1a1a1a",border:"1px solid #333",borderRadius:16,padding:"32px 28px",width:"100%",maxWidth:360,boxShadow:"0 24px 64px rgba(0,0,0,.6)"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:28,marginBottom:8}}>🔐</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#fff",marginBottom:4}}>Admin Access</div>
              <div style={{fontSize:12,color:"#666"}}>FindWeedNJ Business Dashboard</div>
            </div>
            <input type="password" placeholder="Enter admin password" value={adminPass}
              onChange={e=>{setAdminPass(e.target.value);setAdminErr(false);}}
              onKeyDown={e=>e.key==="Enter"&&doAdminLogin()}
              style={{width:"100%",background:"#2a2a2a",border:"1.5px solid "+(adminErr?"#e07b6a":"#444"),color:"#fff",padding:"11px 14px",borderRadius:8,fontSize:14,fontFamily:"'Lato',sans-serif",outline:"none",marginBottom:8}}
              autoFocus
            />
            {adminErr&&<div style={{fontSize:12,color:"#e07b6a",marginBottom:8,textAlign:"center"}}>Incorrect password</div>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={doAdminLogin} style={{flex:1,padding:"11px",background:"linear-gradient(135deg,#6a9e6f,#3d6b42)",border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Lato',sans-serif"}}>Enter</button>
              <button onClick={()=>{setShowAdminLogin(false);setAdminPass("");setAdminErr(false);}} style={{padding:"11px 16px",background:"#2a2a2a",border:"1px solid #444",borderRadius:8,color:"#888",fontSize:14,cursor:"pointer",fontFamily:"'Lato',sans-serif"}}>Cancel</button>
            </div>
            <div style={{textAlign:"center",marginTop:12,fontSize:11,color:"#555"}}>Ctrl+Shift+A or type "admin" anywhere</div>
          </div>
        </div>
      )}

      {showAdmin&&(
        <div style={{position:"fixed",inset:0,background:"#f0ede6",zIndex:1000,overflowY:"auto"}}>
          <AdminPanel onClose={()=>setShowAdmin(false)}/>
        </div>
      )}

    </div>
  );
}
