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



function slugToName(slug) {
  // Convert dispensary slug to readable name
  return slug
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .replace(" Nj", "")
    .replace(" Cannabis", " Cannabis")
    .trim();
}


function cleanCategory(raw) {
  if (!raw) return "Other";
  const s = raw.toString().toLowerCase();
  if (s.includes("flower") || s.includes("bud")) return "Flower";
  if (s.includes("indica")) return "Indica";
  if (s.includes("sativa")) return "Sativa";
  if (s.includes("hybrid")) return "Hybrid";
  if (s.includes("pre") || s.includes("joint") || s.includes("blunt")) return "Pre-Roll";
  if (s.includes("vape") || s.includes("cartridge") || s.includes("cart") || s.includes("pod")) return "Vape";
  if (s.includes("concentrate") || s.includes("wax") || s.includes("shatter") || s.includes("rosin") || s.includes("resin") || s.includes("hash") || s.includes("dab") || s.includes("extract")) return "Concentrate";
  if (s.includes("edible") || s.includes("gummy") || s.includes("gummies") || s.includes("chocolate") || s.includes("candy") || s.includes("cookie") || s.includes("brownie") || s.includes("beverage") || s.includes("drink")) return "Edible";
  if (s.includes("tincture") || s.includes("oil") || s.includes("rso")) return "Tincture";
  if (s.includes("topical") || s.includes("cream") || s.includes("lotion") || s.includes("patch")) return "Topical";
  if (s.includes("capsule") || s.includes("pill") || s.includes("tablet")) return "Capsule";
  if (s.includes("accessory") || s.includes("gear") || s.includes("pipe") || s.includes("grinder")) return "Accessory";
  return "Other";
}

function catColor(cat) {
  const colors = {
    "Indica": "#7b5ea7", "Sativa": "#c8a96e", "Hybrid": "#6a9e6f",
    "Flower": "#6a9e6f", "Pre-Roll": "#4a8fb5", "Vape": "#e07b6a",
    "Concentrate": "#9b72cf", "Edible": "#e8a87c", "Tincture": "#5a9ea0",
    "Topical": "#a0c878", "Capsule": "#78a0c8", "Accessory": "#9a9a8a",
    "Other": "#9a9a8a",
  };
  return colors[cat] || "#9a9a8a";
}


function strainToSlug(name) {
  if (!name) return "";
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function StrainImage({ name, imageUrl, size = 56, style = {} }) {
  const [src, setSrc] = useState(
    imageUrl && imageUrl.length > 5 ? imageUrl :
    `https://cdn.leafly.com/strains/${strainToSlug(name)}.jpg`
  );
  const [failed, setFailed] = useState(false);

  const fallbackColor = useMemo(() => {
    const colors = ["#1e3a1e","#2a3a1a","#1a2e2e","#2e1a2e","#3a2a1a"];
    let hash = 0;
    for (let c of (name||"")) hash = c.charCodeAt(0) + ((hash<<5)-hash);
    return colors[Math.abs(hash) % colors.length];
  }, [name]);

  if (failed) {
    return (
      <div style={{width:size,height:size,borderRadius:size>50?14:8,background:fallbackColor,
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:size>50?24:14,
        flexShrink:0,...style}}>
        🌿
      </div>
    );
  }

  return (
    <img src={src} alt={name}
      onError={()=>{
        if (src.includes("leafly")) {
          // Try alternate Leafly URL format
          setSrc(`https://leafly-cms-production.imgix.net/strains/${strainToSlug(name)}.jpg`);
        } else {
          setFailed(true);
        }
      }}
      style={{width:size,height:size,borderRadius:size>50?14:8,objectFit:"cover",
        background:fallbackColor,flexShrink:0,...style}}
    />
  );
}

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
  const [liveProducts,   setLiveProducts] = useState([]);
  const [apiStatus,      setApiStatus]    = useState("loading");
  const [tab,            setTab]          = useState("explore");
  const [showPricing,    setShowPricing]  = useState(false);
  const [showAdmin,      setShowAdmin]    = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass,      setAdminPass]    = useState("");
  const [adminErr,       setAdminErr]     = useState(false);
  const [keyBuf,         setKeyBuf]       = useState("");
  const [tier,           setTier]         = useState("plus");

  // Optimizer state
  const [optQuery,       setOptQuery]     = useState("");
  const [optResults,     setOptResults]   = useState(null);
  const [optLoading,     setOptLoading]   = useState(false);
  const [optCategory,    setOptCategory]  = useState("All");

  // Shared settings
  const [customerType,   setCustomerType] = useState("regular");
  const [isFirstTime,    setIsFirstTime]  = useState(false);
  const [isMedical,      setIsMedical]    = useState(false);
  const [selectedDay,    setSelectedDay]  = useState(new Date().getDay());

  // Explore state
  const [exploreCategory, setExploreCategory] = useState("Flower");

  // Selected dispensary modal
  const [selectedDisp,   setSelectedDisp] = useState(null);
  const [dispProducts,   setDispProducts] = useState([]);
  const [dispLoading,    setDispLoading]  = useState(false);

  // Fetch live data
  useEffect(() => {
    fetch(API_URL + "/prices")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setLiveProducts(data.filter(p => p.in_stock !== false));
          setApiStatus("live");
        } else setApiStatus("empty");
      })
      .catch(() => setApiStatus("error"));
  }, []);

  // Admin shortcut
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
      setShowAdmin(true); setShowAdminLogin(false); setAdminPass(""); setAdminErr(false);
    } else { setAdminErr(true); setAdminPass(""); }
  }

  // PPG calculation
  function calcPPG(price, weight_grams) {
    if (!weight_grams || weight_grams <= 0 || !price || price <= 1) return null;
    return price / weight_grams;
  }

  // Apply best deal to a price
  function applyDeal(slug, price, cat) {
    const { discountedPrice, bestDiscount, bestDealName } = getBestDeal(slug, price, {
      dayOfWeek: selectedDay,
      customerType: isFirstTime ? "first-time" : customerType,
      category: cat,
      isFirstTime,
    });
    const taxRate = getTaxRate(
      liveProducts.find(p => p.dispensary_slug === slug)?.city || "",
      isMedical
    );
    const finalPrice = Math.round(discountedPrice * (1 + taxRate) * 100) / 100;
    return { finalPrice, discountedPrice, bestDiscount, bestDealName, taxRate };
  }

  // Open dispensary modal
  function openDispensary(slug, name) {
    const dispInfo = DISPENSARIES.find(d => d.slug === slug) || {
      slug, name: name || slugToName(slug),
      city: liveProducts.find(p => p.dispensary_slug === slug)?.city || "",
      county: liveProducts.find(p => p.dispensary_slug === slug)?.county || "",
    };
    setSelectedDisp(dispInfo);
    setDispLoading(true);
    fetch(API_URL + "/prices?dispensary=" + slug)
      .then(r => r.json())
      .then(data => { setDispProducts(Array.isArray(data) ? data : []); setDispLoading(false); })
      .catch(() => { setDispProducts([]); setDispLoading(false); });
  }

  // ── OPTIMIZER: search by strain/product name ──
  function runOptimizer() {
    if (optQuery.trim().length < 2) return;
    setOptLoading(true);
    fetch(`${API_URL}/strains/search?q=${encodeURIComponent(optQuery)}`)
      .then(r => r.json())
      .then(rawData => {
        if (!Array.isArray(rawData) || rawData.length === 0) {
          setOptResults([]);
          setOptLoading(false);
          return;
        }

        // Filter by category if selected
        let filtered = rawData;
        if (optCategory !== "All") {
          filtered = rawData.filter(p => {
            const c = cleanCategory(p.category);
            if (optCategory === "Flower") return ["Flower","Indica","Sativa","Hybrid"].includes(c);
            return c === optCategory;
          });
          if (filtered.length === 0) filtered = rawData;
        }

        // Build result rows with PPG and final price
        const rows = filtered.map(p => {
          const price = p.price_usd > 1 ? p.price_usd : null;
          const weight = p.weight_grams;
          const { discountedPrice, bestDiscount, bestDealName, taxRate } = price
            ? (() => {
                const d = getBestDeal(p.dispensary_slug, price, {
                  dayOfWeek: selectedDay,
                  customerType: isFirstTime ? "first-time" : customerType,
                  category: cleanCategory(p.category),
                  isFirstTime,
                });
                const tx = getTaxRate(p.city || "", isMedical);
                return { ...d, taxRate: tx };
              })()
            : { discountedPrice: null, bestDiscount: 0, bestDealName: null, taxRate: 0 };

          const finalPrice = discountedPrice ? Math.round(discountedPrice * (1 + taxRate) * 100) / 100 : null;
          const ppg = calcPPG(discountedPrice, weight);
          const dispInfo = DISPENSARIES.find(d => d.slug === p.dispensary_slug) || {
            name: slugToName(p.dispensary_slug),
            city: p.city || "",
            county: p.county || "",
          };

          return {
            ...p,
            dispName: dispInfo.name,
            dispCity: dispInfo.city,
            dispCounty: dispInfo.county,
            finalPrice,
            discountedPrice,
            bestDiscount,
            bestDealName,
            taxRate,
            ppg,
            cleanCat: cleanCategory(p.category),
          };
        });

        // Sort: products with PPG first (sorted by PPG), then by final price
        rows.sort((a, b) => {
          if (a.ppg && b.ppg) return a.ppg - b.ppg;
          if (a.ppg) return -1;
          if (b.ppg) return 1;
          if (a.finalPrice && b.finalPrice) return a.finalPrice - b.finalPrice;
          return 0;
        });

        setOptResults(rows);
        setOptLoading(false);
      })
      .catch(() => { setOptResults([]); setOptLoading(false); });
  }

  // ── EXPLORE: best PPG deals by category ──
  const exploreDeals = useMemo(() => {
    if (liveProducts.length === 0) return [];

    const EXPLORE_CATS = ["Flower","Pre-Rolls","Concentrates","Vapes","Edibles"];
    const cat = exploreCategory;

    // Filter to this category
    const catProducts = liveProducts.filter(p => {
      const c = cleanCategory(p.category);
      if (cat === "Flower") return ["Flower","Indica","Sativa","Hybrid"].includes(c);
      if (cat === "Pre-Rolls") return c === "Pre-Roll";
      if (cat === "Concentrates") return c === "Concentrate";
      if (cat === "Vapes") return c === "Vape";
      if (cat === "Edibles") return c === "Edible";
      return c === cat;
    });

    // Group by dispensary, find best PPG product per dispensary
    const byDisp = {};
    catProducts.forEach(p => {
      const slug = p.dispensary_slug;
      if (!byDisp[slug]) byDisp[slug] = [];
      byDisp[slug].push(p);
    });

    return Object.entries(byDisp).map(([slug, products]) => {
      const dispInfo = DISPENSARIES.find(d => d.slug === slug) || {
        slug, name: slugToName(slug),
        city: products[0]?.city || "",
        county: products[0]?.county || "",
      };

      // Find best PPG product (after discount)
      let bestPPGProduct = null;
      let bestPPG = Infinity;

      products.forEach(p => {
        if (!p.price_usd || p.price_usd <= 1 || !p.weight_grams) return;
        const { discountedPrice } = getBestDeal(slug, p.price_usd, {
          dayOfWeek: selectedDay,
          customerType: isFirstTime ? "first-time" : customerType,
          category: cleanCategory(p.category),
          isFirstTime,
        });
        const taxRate = getTaxRate(dispInfo.city, isMedical);
        const finalPrice = discountedPrice * (1 + taxRate);
        const ppg = finalPrice / p.weight_grams;
        if (ppg < bestPPG) {
          bestPPG = ppg;
          bestPPGProduct = { ...p, finalPrice: Math.round(finalPrice * 100) / 100, ppg: Math.round(ppg * 100) / 100 };
        }
      });

      // Get deal info for display
      const samplePrice = products.find(p => p.price_usd > 1)?.price_usd;
      const dealInfo = samplePrice ? getBestDeal(slug, samplePrice, {
        dayOfWeek: selectedDay,
        customerType: isFirstTime ? "first-time" : customerType,
        category: cat,
        isFirstTime,
      }) : { bestDiscount: 0, bestDealName: null };

      const firstTimePct = DEALS.find(d => d.dispensary === slug && d.firstTimeOnly)?.pct || 0;

      return {
        ...dispInfo,
        bestPPGProduct,
        bestPPG: bestPPGProduct ? bestPPG : null,
        productCount: products.length,
        hasRealPrices: products.some(p => p.price_usd > 1),
        bestDiscount: dealInfo.bestDiscount,
        bestDealName: dealInfo.bestDealName,
        firstTimePct,
      };
    })
    .sort((a, b) => {
      // Sort by PPG if available, then by discount
      if (a.bestPPG && b.bestPPG) return a.bestPPG - b.bestPPG;
      if (a.bestPPG) return -1;
      if (b.bestPPG) return 1;
      return b.bestDiscount - a.bestDiscount;
    });
  }, [liveProducts, exploreCategory, selectedDay, customerType, isFirstTime, isMedical]);

  const EXPLORE_CATS = ["Flower","Pre-Rolls","Concentrates","Vapes","Edibles"];
  const OPT_CATS = ["All","Flower","Pre-Rolls","Concentrates","Vapes","Edibles"];

  return (
    <div style={{minHeight:"100vh",background:"#0d1a0d",fontFamily:"'DM Sans',sans-serif",color:"#f0ede6",maxWidth:600,margin:"0 auto"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display:ital@0;1&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:0;height:0}
        body{background:#0d1a0d}
        .pill{display:inline-flex;align-items:center;padding:7px 16px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .18s;white-space:nowrap;font-family:'DM Sans',sans-serif}
        .pill.on{background:#c8f53c;color:#0d1a0d}
        .pill.off{background:rgba(255,255,255,.07);color:rgba(240,237,230,.55)}
        .pill.off:hover{background:rgba(255,255,255,.13);color:rgba(240,237,230,.9)}
        .card{background:#162016;border:1px solid rgba(200,245,60,.1);border-radius:18px;cursor:pointer;transition:all .22s}
        .card:hover{border-color:rgba(200,245,60,.3);box-shadow:0 8px 32px rgba(0,0,0,.35)}
        .card:active{transform:scale(.98)}
        .inp{background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);color:#f0ede6;padding:14px 18px;font-family:'DM Sans',sans-serif;font-size:15px;border-radius:14px;outline:none;width:100%;transition:all .2s}
        .inp:focus{border-color:#c8f53c;background:rgba(200,245,60,.05)}
        .inp::placeholder{color:rgba(240,237,230,.3)}
        .shimmer{background:linear-gradient(90deg,#162016 25%,#1e2e1e 50%,#162016 75%);background-size:200% 100%;animation:shimmer 1.4s infinite}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .fade{animation:fi .25s ease}@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .slide{animation:su .3s cubic-bezier(.32,.72,0,1)}@keyframes su{from{transform:translateY(100%)}to{transform:none}}
        select option{background:#162016;color:#f0ede6}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
      `}</style>

      {/* HEADER */}
      <header style={{padding:"18px 20px 0",position:"sticky",top:0,background:"#0d1a0d",zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#c8f53c,#7ab52a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🌿</div>
            <div>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#c8f53c",lineHeight:1}}>FindWeedNJ</div>
              <div style={{fontSize:10,color:"rgba(200,245,60,.4)",letterSpacing:"2px",textTransform:"uppercase",marginTop:1}}>Price Intelligence</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",background:"rgba(200,245,60,.07)",borderRadius:20,border:"1px solid rgba(200,245,60,.15)"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:apiStatus==="live"?"#c8f53c":"#c8a96e",animation:apiStatus==="live"?"pulse 2s infinite":"none"}}/>
              <span style={{fontSize:11,fontWeight:600,color:apiStatus==="live"?"#c8f53c":"rgba(240,237,230,.4)"}}>{apiStatus==="live"?"LIVE":"..."}</span>
            </div>
            <button onClick={()=>setShowPricing(true)} style={{background:"#c8f53c",border:"none",borderRadius:20,padding:"7px 16px",fontSize:12,fontWeight:700,color:"#0d1a0d",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
              Free Month
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{display:"flex",background:"rgba(255,255,255,.05)",borderRadius:14,padding:4,marginBottom:0}}>
          {[["explore","🏷 Explore Deals"],["optimizer","🎯 Price Optimizer"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:tab===t?"#c8f53c":"transparent",color:tab===t?"#0d1a0d":"rgba(240,237,230,.45)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all .2s"}}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <div style={{padding:"16px 16px 100px"}}>

        {/* ═══════════════════════════════════════════
            EXPLORE TAB
        ═══════════════════════════════════════════ */}
        {tab==="explore"&&(
          <div className="fade">

            {/* Settings row */}
            <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center"}}>
              <select className="inp" value={customerType} onChange={e=>setCustomerType(e.target.value)}
                style={{padding:"9px 12px",fontSize:12,flex:1}}>
                {CUSTOMER_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <button onClick={()=>setIsFirstTime(v=>!v)} style={{padding:"9px 14px",borderRadius:10,border:"1.5px solid "+(isFirstTime?"#c8f53c":"rgba(255,255,255,.12)"),background:isFirstTime?"rgba(200,245,60,.1)":"transparent",color:isFirstTime?"#c8f53c":"rgba(240,237,230,.4)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
                {isFirstTime?"✓ 1st":"1st?"}
              </button>
              <button onClick={()=>setIsMedical(v=>!v)} style={{padding:"9px 14px",borderRadius:10,border:"1.5px solid "+(isMedical?"#c8f53c":"rgba(255,255,255,.12)"),background:isMedical?"rgba(200,245,60,.1)":"transparent",color:isMedical?"#c8f53c":"rgba(240,237,230,.4)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
                {isMedical?"✓ Med":"Med?"}
              </button>
            </div>

            {/* Day selector */}
            <div style={{display:"flex",gap:5,overflowX:"auto",marginBottom:16,paddingBottom:2}}>
              {DAYS.map((d,i)=>(
                <button key={i} className={"pill"+(selectedDay===i?" on":" off")} onClick={()=>setSelectedDay(i)} style={{fontSize:11,padding:"5px 11px"}}>
                  {d.slice(0,3)}{i===new Date().getDay()?" •":""}
                </button>
              ))}
            </div>

            {/* Category selector */}
            <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:20,paddingBottom:2}}>
              {EXPLORE_CATS.map(c=>(
                <button key={c} className={"pill"+(exploreCategory===c?" on":" off")} onClick={()=>setExploreCategory(c)}>{c}</button>
              ))}
            </div>

            {/* Section header */}
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:24,color:"#f0ede6",lineHeight:1.1}}>
                Best <span style={{color:"#c8f53c"}}>{exploreCategory}</span><br/>deals in NJ
              </div>
              <div style={{fontSize:12,color:"rgba(240,237,230,.35)",marginTop:6}}>
                Ranked by price per gram · {exploreDeals.filter(d=>d.bestPPG).length} with live pricing
              </div>
            </div>

            {/* Loading */}
            {apiStatus==="loading"&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[1,2,3,4].map(i=><div key={i} className="shimmer" style={{height:110,borderRadius:18}}/>)}
              </div>
            )}

            {/* Deal cards */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {exploreDeals.map((d,i)=>{
                const isTop = i < 3;
                const hasPPG = d.bestPPG !== null;
                return (
                  <div key={d.slug} className="card" onClick={()=>openDispensary(d.slug, d.name)}
                    style={{padding:"16px 18px",borderColor:i===0?"rgba(200,245,60,.35)":isTop?"rgba(200,245,60,.15)":"rgba(200,245,60,.07)",
                      background:i===0?"linear-gradient(135deg,#1c3010,#162016)":isTop?"linear-gradient(135deg,#192b12,#162016)":"#162016"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        {/* Top product image */}
                        {d.bestPPGProduct&&(
                          <div style={{float:"right",marginLeft:10,marginBottom:6}}>
                            <StrainImage
                              name={d.bestPPGProduct.name}
                              imageUrl={d.bestPPGProduct.image_url}
                              size={64}
                            />
                          </div>
                        )}
                        {/* Rank + badges */}
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                          <span style={{fontFamily:"'DM Serif Display',serif",fontSize:13,color:i===0?"#c8f53c":"rgba(240,237,230,.3)",fontWeight:400}}>#{i+1}</span>
                          {i===0&&<span style={{fontSize:10,padding:"2px 8px",background:"#c8f53c",color:"#0d1a0d",borderRadius:20,fontWeight:700}}>BEST VALUE</span>}
                          {d.bestDiscount>0&&<span style={{fontSize:10,padding:"2px 8px",background:"rgba(200,245,60,.12)",color:"#c8f53c",borderRadius:20,fontWeight:700,border:"1px solid rgba(200,245,60,.2)"}}>-{d.bestDiscount}% today</span>}
                          {d.firstTimePct>0&&!isFirstTime&&<span style={{fontSize:10,padding:"2px 8px",background:"rgba(255,255,255,.06)",color:"rgba(240,237,230,.5)",borderRadius:20,fontWeight:600}}>🆕 {d.firstTimePct}% 1st visit</span>}
                        </div>
                        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color:"#f0ede6",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
                        <div style={{fontSize:12,color:"rgba(240,237,230,.4)"}}>{d.city} · {d.county} Co.</div>
                        {d.bestPPGProduct&&(
                          <div style={{fontSize:11,color:"rgba(240,237,230,.35)",marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            e.g. {d.bestPPGProduct.name?.slice(0,40)}{d.bestPPGProduct.name?.length>40?"...":""}
                          </div>
                        )}
                        {d.bestDealName&&(
                          <div style={{fontSize:11,color:"rgba(200,245,60,.55)",marginTop:5,fontWeight:600}}>🏷 {d.bestDealName}</div>
                        )}
                      </div>

                      {/* PPG / price display */}
                      <div style={{textAlign:"right",flexShrink:0,minWidth:80}}>
                        {hasPPG?(
                          <div>
                            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:i===0?"#c8f53c":"#f0ede6",lineHeight:1}}>${d.bestPPG.toFixed(2)}</div>
                            <div style={{fontSize:10,color:"rgba(240,237,230,.4)",marginTop:2,fontWeight:600}}>/gram</div>
                            {d.bestPPGProduct?.weight_grams&&(
                              <div style={{fontSize:10,color:"rgba(240,237,230,.3)",marginTop:1}}>{d.bestPPGProduct.weight_grams}g · ${d.bestPPGProduct.finalPrice}</div>
                            )}
                          </div>
                        ):(
                          <div>
                            {d.bestDiscount>0?(
                              <div>
                                <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:"#c8f53c",lineHeight:1}}>{d.bestDiscount}%</div>
                                <div style={{fontSize:10,color:"rgba(200,245,60,.5)",fontWeight:600}}>OFF</div>
                              </div>
                            ):(
                              <div style={{fontSize:12,color:"rgba(240,237,230,.25)",marginTop:4}}>{d.productCount} products</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom strip */}
                    <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid rgba(255,255,255,.05)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:11,color:"rgba(240,237,230,.25)"}}>📍 {getTaxLabel(d.city, isMedical)}</span>
                      <span style={{fontSize:11,color:"rgba(200,245,60,.4)",fontWeight:600}}>View menu →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            PRICE OPTIMIZER TAB
        ═══════════════════════════════════════════ */}
        {tab==="optimizer"&&(
          <div className="fade">

            <div style={{padding:"8px 0 20px"}}>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:"#f0ede6",marginBottom:4,lineHeight:1.2}}>
                Find the <span style={{color:"#c8f53c"}}>best price</span><br/>on any product
              </div>
              <div style={{fontSize:13,color:"rgba(240,237,230,.35)"}}>
                Search by strain or product name · ranked by price per gram
              </div>
            </div>

            {/* Search input */}
            <div style={{position:"relative",marginBottom:12}}>
              <input className="inp" style={{paddingLeft:46,fontSize:15,paddingRight:90}}
                placeholder="e.g. Wedding Cake, Animal Face..."
                value={optQuery}
                onChange={e=>setOptQuery(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&runOptimizer()}
              />
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:20,pointerEvents:"none"}}>🎯</span>
              <button onClick={runOptimizer} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"#c8f53c",border:"none",borderRadius:10,padding:"8px 16px",fontSize:13,fontWeight:700,color:"#0d1a0d",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                Go
              </button>
            </div>

            {/* Category + settings */}
            <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,paddingBottom:2}}>
              {OPT_CATS.map(c=>(
                <button key={c} className={"pill"+(optCategory===c?" on":" off")} onClick={()=>setOptCategory(c)} style={{fontSize:11,padding:"5px 11px"}}>{c}</button>
              ))}
            </div>

            <div style={{display:"flex",gap:8,marginBottom:20}}>
              <select className="inp" value={customerType} onChange={e=>setCustomerType(e.target.value)}
                style={{padding:"9px 12px",fontSize:12,flex:1}}>
                {CUSTOMER_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <select className="inp" value={selectedDay} onChange={e=>setSelectedDay(parseInt(e.target.value))}
                style={{padding:"9px 12px",fontSize:12,flex:1}}>
                {DAYS.map((d,i)=><option key={i} value={i}>{d.slice(0,3)}{i===new Date().getDay()?" ✦":""}</option>)}
              </select>
              <button onClick={()=>setIsFirstTime(v=>!v)} style={{padding:"9px 12px",borderRadius:10,border:"1.5px solid "+(isFirstTime?"#c8f53c":"rgba(255,255,255,.12)"),background:isFirstTime?"rgba(200,245,60,.1)":"transparent",color:isFirstTime?"#c8f53c":"rgba(240,237,230,.4)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
                {isFirstTime?"✓ 1st":"1st?"}
              </button>
              <button onClick={()=>setIsMedical(v=>!v)} style={{padding:"9px 12px",borderRadius:10,border:"1.5px solid "+(isMedical?"#c8f53c":"rgba(255,255,255,.12)"),background:isMedical?"rgba(200,245,60,.1)":"transparent",color:isMedical?"#c8f53c":"rgba(240,237,230,.4)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
                {isMedical?"✓ Med":"Med?"}
              </button>
            </div>

            {/* Popular quick searches */}
            {!optResults&&!optLoading&&(
              <div>
                <div style={{fontSize:11,color:"rgba(240,237,230,.25)",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:10}}>Try searching</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {["Wedding Cake","Animal Face","Lemon Cherry Gelato","Gary Payton","Runtz","MAC","Ice Cream Cake","GMO","Jealousy","Blue Dream","Gelato 41","Duffle Full of Blues"].map(s=>(
                    <button key={s} onClick={()=>{setOptQuery(s);}} className="pill off" style={{fontSize:11,padding:"5px 11px"}}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {optLoading&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[1,2,3].map(i=><div key={i} className="shimmer" style={{height:100,borderRadius:18}}/>)}
              </div>
            )}

            {/* Results */}
            {optResults&&!optLoading&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div>
                    <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,color:"#f0ede6"}}>"{optQuery}"</div>
                    <div style={{fontSize:12,color:"rgba(240,237,230,.35)",marginTop:2}}>
                      {optResults.length>0
                        ? `${optResults.length} result${optResults.length===1?"":"s"} · sorted by ${optResults.some(r=>r.ppg)?"price per gram":"final price"}`
                        : "Not found in any NJ dispensary right now"}
                    </div>
                  </div>
                  <button onClick={()=>{setOptResults(null);setOptQuery("");}} className="pill off" style={{fontSize:11}}>Clear</button>
                </div>

                {optResults.length===0?(
                  <div style={{textAlign:"center",padding:"40px 0"}}>
                    <div style={{fontSize:40,marginBottom:12}}>😔</div>
                    <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,marginBottom:6}}>Not in stock</div>
                    <div style={{fontSize:13,color:"rgba(240,237,230,.35)"}}>Try a different spelling or check the Explore tab for today's best deals</div>
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {optResults.map((r,i)=>{
                      const isWinner = i===0;
                      const cat = r.cleanCat;
                      const clr = catColor(cat);
                      return (
                        <div key={i} className="card" onClick={()=>openDispensary(r.dispensary_slug, r.dispName)}
                          style={{padding:"16px 18px",borderColor:isWinner?"rgba(200,245,60,.4)":"rgba(200,245,60,.08)",
                            background:isWinner?"linear-gradient(135deg,#1c3010,#162016)":"#162016"}}>
                          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                            {/* Strain image */}
                            <StrainImage
                              name={r.name}
                              imageUrl={r.image_url}
                              size={52}
                            />
                            {/* Rank */}
                            <div style={{width:28,flexShrink:0,paddingTop:2}}>
                              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:isWinner?"#c8f53c":"rgba(240,237,230,.2)",lineHeight:1,textAlign:"center"}}>
                                {isWinner?"🏆":`#${i+1}`}
                              </div>
                            </div>

                            {/* Info */}
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:14,fontWeight:700,color:"#f0ede6",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                              <div style={{fontSize:13,color:"rgba(240,237,230,.55)",marginBottom:4,fontWeight:500}}>{r.dispName}</div>
                              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                                <span style={{fontSize:10,padding:"2px 8px",background:clr+"25",color:clr,borderRadius:20,fontWeight:700,border:"1px solid "+clr+"40"}}>{cat}</span>
                                {r.weight_grams&&<span style={{fontSize:11,color:"rgba(240,237,230,.4)",fontWeight:600}}>{r.weight_grams}g</span>}
                                {r.thc_pct&&<span style={{fontSize:11,color:"#c8f53c",fontWeight:700}}>THC {r.thc_pct}%</span>}
                                {r.brand&&<span style={{fontSize:10,color:"rgba(240,237,230,.3)"}}>by {r.brand}</span>}
                              </div>
                              {r.bestDealName&&(
                                <div style={{fontSize:11,color:"rgba(200,245,60,.6)",marginTop:5,fontWeight:600}}>🏷 {r.bestDealName} (-{r.bestDiscount}%)</div>
                              )}
                              <div style={{fontSize:10,color:"rgba(240,237,230,.25)",marginTop:3}}>{r.dispCity} · {r.dispCounty} Co.</div>
                            </div>

                            {/* Price block */}
                            <div style={{textAlign:"right",flexShrink:0,minWidth:80}}>
                              {r.ppg?(
                                <div>
                                  <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:isWinner?"#c8f53c":"#f0ede6",lineHeight:1}}>${r.ppg.toFixed(2)}</div>
                                  <div style={{fontSize:10,color:"rgba(240,237,230,.35)",fontWeight:600,marginTop:1}}>/gram</div>
                                  {r.bestDiscount>0&&<div style={{fontSize:10,color:"rgba(240,237,230,.3)",textDecoration:"line-through",marginTop:2}}>${r.price_usd?.toFixed(2)}</div>}
                                  {r.finalPrice&&<div style={{fontSize:12,color:"rgba(240,237,230,.5)",marginTop:1}}>${r.finalPrice} total</div>}
                                </div>
                              ):r.finalPrice?(
                                <div>
                                  <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:isWinner?"#c8f53c":"#f0ede6",lineHeight:1}}>${r.finalPrice}</div>
                                  <div style={{fontSize:10,color:"rgba(240,237,230,.35)",marginTop:1}}>after tax</div>
                                </div>
                              ):(
                                <div style={{fontSize:11,color:"rgba(240,237,230,.2)",marginTop:4}}>Price TBD</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* DISPENSARY PRODUCT MODAL */}
      {selectedDisp&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:200,display:"flex",alignItems:"flex-end"}}
          onClick={e=>e.target===e.currentTarget&&setSelectedDisp(null)}>
          <div className="slide" style={{background:"#0d1a0d",borderRadius:"22px 22px 0 0",width:"100%",maxHeight:"88vh",overflowY:"auto",border:"1px solid rgba(200,245,60,.12)",borderBottom:"none"}}>
            <div style={{width:36,height:4,background:"rgba(255,255,255,.1)",borderRadius:2,margin:"14px auto 0"}}/>
            <div style={{padding:"16px 20px",position:"sticky",top:0,background:"#0d1a0d",borderBottom:"1px solid rgba(200,245,60,.07)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,color:"#f0ede6",marginBottom:2}}>{selectedDisp.name}</div>
                  <div style={{fontSize:12,color:"rgba(240,237,230,.35)"}}>{selectedDisp.city} · {selectedDisp.county} Co. · {dispProducts.length} products</div>
                </div>
                <button onClick={()=>setSelectedDisp(null)} style={{background:"rgba(255,255,255,.07)",border:"none",borderRadius:"50%",width:32,height:32,color:"rgba(240,237,230,.5)",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
              </div>
            </div>
            <div style={{padding:"14px 16px 40px"}}>
              {dispLoading?(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {[1,2,3,4,5].map(i=><div key={i} className="shimmer" style={{height:56,borderRadius:12}}/>)}
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {dispProducts.map((p,i)=>{
                    const cat = cleanCategory(p.category);
                    const clr = catColor(cat);
                    const ppg = calcPPG(p.price_usd, p.weight_grams);
                    return (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:i%2===0?"#162016":"rgba(255,255,255,.02)",borderRadius:12}}>
                        <StrainImage
                          name={p.name}
                          imageUrl={p.image_url}
                          size={44}
                        />
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:"#f0ede6",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>{p.name}</div>
                          <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                            <span style={{fontSize:9,padding:"1px 7px",background:clr+"20",color:clr,borderRadius:20,fontWeight:700}}>{cat}</span>
                            {p.weight_grams&&<span style={{fontSize:10,color:"rgba(240,237,230,.35)"}}>{p.weight_grams}g</span>}
                            {p.thc_pct&&<span style={{fontSize:10,color:"#c8f53c",fontWeight:700}}>{p.thc_pct}% THC</span>}
                            {p.brand&&<span style={{fontSize:9,color:"rgba(240,237,230,.25)"}}>by {p.brand}</span>}
                          </div>
                          {p.description&&p.description.length>5&&(
                            <div style={{fontSize:11,color:"rgba(240,237,230,.25)",marginTop:3,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:1,WebkitBoxOrient:"vertical"}}>{p.description}</div>
                          )}
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          {p.price_usd>1?(
                            <div>
                              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color:"#f0ede6"}}>${p.price_usd.toFixed(2)}</div>
                              {ppg&&<div style={{fontSize:10,color:"rgba(200,245,60,.5)",fontWeight:600}}>${ppg.toFixed(2)}/g</div>}
                            </div>
                          ):(
                            <div style={{fontSize:11,color:"rgba(240,237,230,.15)"}}>—</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRICING MODAL */}
      {showPricing&&(
        <PricingModal onSelect={(t)=>{setTier(t);setShowPricing(false);}} onClose={()=>setShowPricing(false)} currentTier={tier}/>
      )}

      {/* ADMIN LOGIN */}
      {showAdminLogin&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,padding:20}}>
          <div style={{background:"#162016",border:"1px solid rgba(200,245,60,.2)",borderRadius:20,padding:"32px 24px",width:"100%",maxWidth:340}}>
            <div style={{textAlign:"center",marginBottom:18}}>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,color:"#f0ede6",marginBottom:4}}>🔐 Admin</div>
            </div>
            <input type="password" placeholder="Password" value={adminPass}
              onChange={e=>{setAdminPass(e.target.value);setAdminErr(false);}}
              onKeyDown={e=>e.key==="Enter"&&doAdminLogin()}
              className="inp" style={{marginBottom:8}} autoFocus
            />
            {adminErr&&<div style={{fontSize:12,color:"#ff6b6b",marginBottom:8,textAlign:"center"}}>Wrong password</div>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={doAdminLogin} style={{flex:1,padding:"12px",background:"#c8f53c",border:"none",borderRadius:10,color:"#0d1a0d",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Enter</button>
              <button onClick={()=>{setShowAdminLogin(false);setAdminPass("");setAdminErr(false);}} style={{padding:"12px 16px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,color:"rgba(240,237,230,.4)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PANEL */}
      {showAdmin&&(
        <div style={{position:"fixed",inset:0,background:"#f0ede6",zIndex:1000,overflowY:"auto"}}>
          <AdminPanel onClose={()=>setShowAdmin(false)}/>
        </div>
      )}

    </div>
  );
}
