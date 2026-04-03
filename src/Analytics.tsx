import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Cell,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChartPoint { label: string; pct: number; completed: number; total: number; dateKey: string; }
interface TaskInsight { id: string; label: string; emoji: string; missCount: number; totalDays: number; }
interface TooltipInput { active?: boolean; payload?: Array<{ payload: ChartPoint }>; }

export interface TaskDef { id: string; label: string; emoji: string; section: string; }

interface Props {
  totalTasks: number;
  tasks: TaskDef[];
  accentColor: string;
  dailyQuote: string;
  token: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const GREEN     = "#06D6A0";
const YELLOW    = "#FFD166";
const RED       = "#EF476F";
const BLUE      = "#6C63FF";
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MON_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const API_URL = "http://localhost:5000/api/routine";

interface FetchedRecord {
  dateKey: string;
  record: { date: string; completed: string[]; notes: string; };
}

async function fetchAllRecords(token: string): Promise<FetchedRecord[]> {
  try {
    const res = await fetch(`${API_URL}/list`, { headers: { "Authorization": `Bearer ${token}` } });
    if (!res.ok) return [];
    
    const data = await res.json();
    return data.map((r: any) => ({
      dateKey: r.date,
      record: { date: r.date, completed: r.completed, notes: r.notes }
    })).sort((a: FetchedRecord, b: FetchedRecord) => a.dateKey.localeCompare(b.dateKey));
  } catch {
    return [];
  }
}

function colorFor(pct: number) { return pct >= 100 ? GREEN : pct >= 50 ? YELLOW : pct > 0 ? RED : "#1e1e3a"; }
function toKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

// ── Custom Chart Tooltip ──────────────────────────────────────────────────────
const ChartTooltip: React.FC<TooltipInput> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background:"#12122a", border:`1px solid ${colorFor(d.pct)}44`, borderRadius:10, padding:"10px 14px" }}>
      <div style={{ fontSize:11, color:"#666", marginBottom:4 }}>{d.dateKey}</div>
      <div style={{ fontSize:18, fontWeight:900, color:colorFor(d.pct) }}>{d.pct}%</div>
      <div style={{ fontSize:11, color:"#555" }}>{d.completed}/{d.total} tasks done</div>
    </div>
  );
};

// ── Analytics ─────────────────────────────────────────────────────────────────
const Analytics: React.FC<Props> = ({ totalTasks, tasks, accentColor: ac, dailyQuote, token }) => {
  const [filter, setFilter]       = useState<"week"|"month">("week");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [recent, setRecent]       = useState<ChartPoint[]>([]);
  const [missed, setMissed]       = useState<TaskInsight[]>([]);
  const [stats, setStats] = useState({
    totalCompleted:0, avgPct:0, perfectDays:0, mostProductiveDay:"—",
    currentStreak:0, bestStreak:0, totalDaysTracked:0,
  });

  const compute = useCallback(async () => {
    const all = await fetchAllRecords(token);
    const numDays = filter === "week" ? 7 : 30;
    const today = new Date();

    const getRecord = (key: string) => all.find(a => a.dateKey === key)?.record || null;

    // Chart points
    const points: ChartPoint[] = [];
    for (let i = numDays-1; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate()-i);
      const key = toKey(d);
      const rec = getRecord(key);
      const comp = rec?.completed.length ?? 0;
      const pct  = totalTasks > 0 ? Math.round((comp/totalTasks)*100) : 0;
      const label = filter === "week"
        ? (i===0 ? "Today" : DAY_NAMES[d.getDay()])
        : ((numDays-1-i) % 6 === 0 ? `${d.getDate()} ${MON_NAMES[d.getMonth()]}` : "");
      points.push({ label, pct, completed:comp, total:totalTasks, dateKey:key });
    }
    setChartData(points);

    // Recent 7
    const r7: ChartPoint[] = [];
    for (let i=6; i>=0; i--) {
      const d = new Date(today); d.setDate(today.getDate()-i);
      const key = toKey(d);
      const rec = getRecord(key);
      const comp = rec?.completed.length ?? 0;
      const pct = totalTasks > 0 ? Math.round((comp/totalTasks)*100) : 0;
      r7.push({ label: i===0?"Today":DAY_NAMES[d.getDay()], pct, completed:comp, total:totalTasks, dateKey:key });
    }
    setRecent(r7);

    // Global aggregates
    let totalCompleted=0, pctSum=0, perfectDays=0;
    const dowPct=[0,0,0,0,0,0,0], dowCnt=[0,0,0,0,0,0,0];
    const taskMiss: Record<string,number> = {};
    tasks.forEach(t => { taskMiss[t.id]=0; });

    for (const { dateKey, record: rec } of all) {
      const comp = rec.completed.length;
      const pct  = totalTasks>0 ? (comp/totalTasks)*100 : 0;
      totalCompleted += comp; pctSum += pct;
      if (comp === totalTasks) perfectDays++;
      const [y,m,dd] = dateKey.split("-").map(Number);
      const dow = new Date(y,m-1,dd).getDay();
      dowPct[dow] += pct; dowCnt[dow]++;
      tasks.forEach(t => { if (!rec.completed.includes(t.id)) taskMiss[t.id]++; });
    }

    const n = all.length;
    const avgPct = n>0 ? Math.round(pctSum/n) : 0;
    let bestDow=-1, bestAvg=-1;
    for (let i=0;i<7;i++) { if (dowCnt[i]>0 && dowPct[i]/dowCnt[i]>bestAvg) { bestAvg=dowPct[i]/dowCnt[i]; bestDow=i; } }
    const mostProductiveDay = bestDow>=0 ? DAY_NAMES[bestDow] : "—";

    // Current streak
    let currentStreak=0; const cur=new Date();
    while(true) { const rec=getRecord(toKey(cur)); if(rec&&rec.completed.length===totalTasks){currentStreak++;cur.setDate(cur.getDate()-1);}else break; }

    // Best streak
    let bestStreak=0, curStr=0;
    for (let i=0;i<all.length;i++) {
      if (all[i].record.completed.length===totalTasks) {
        if (i>0) {
          const [py,pm,pd]=all[i-1].dateKey.split("-").map(Number);
          const [cy,cm,cd]=all[i].dateKey.split("-").map(Number);
          const diff=new Date(cy,cm-1,cd).getTime()-new Date(py,pm-1,pd).getTime();
          curStr = diff===86400000 ? curStr+1 : 1;
        } else curStr=1;
        bestStreak=Math.max(bestStreak,curStr);
      } else curStr=0;
    }

    setStats({ totalCompleted, avgPct, perfectDays, mostProductiveDay, currentStreak, bestStreak, totalDaysTracked:n });

    // Missed tasks
    setMissed(
      tasks.map(t=>({ id:t.id, label:t.label, emoji:t.emoji, missCount:taskMiss[t.id]??0, totalDays:n }))
        .filter(t=>t.missCount>0).sort((a,b)=>b.missCount-a.missCount).slice(0,5)
    );
  }, [filter, totalTasks, tasks, token]);

  useEffect(()=>{ compute(); },[compute]);

  // ── Render helpers ──────────────────────────────────────────────────────────
  const StatCard = ({ label, value, sub, color }: { label:string; value:string|number; sub:string; color:string }) => (
    <div style={{ flex:1, background:"#13132b", borderRadius:14, border:"1px solid #1e1e3e", padding:"16px 10px", textAlign:"center", minWidth:0 }}>
      <div style={{ fontSize:22, fontWeight:900, color, letterSpacing:"-0.04em", lineHeight:1.1 }}>{value}</div>
      <div style={{ fontSize:10, color:"#aaa", marginTop:5, fontWeight:600, letterSpacing:"0.03em" }}>{label}</div>
      <div style={{ fontSize:9, color:"#555", marginTop:2 }}>{sub}</div>
    </div>
  );

  const FilterBtn = ({ v, label }: { v:"week"|"month"; label:string }) => (
    <button onClick={()=>setFilter(v)} style={{
      padding:"6px 16px", borderRadius:8, border:"none",
      background: filter===v ? ac : "#0f0f26",
      color: filter===v ? "#fff" : "#555577",
      cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit",
      boxShadow: filter===v ? `0 2px 10px ${ac}40` : "none", transition:"all 0.2s ease",
    }}>{label}</button>
  );

  return (
    <div className="rt-fade">
      {/* Dynamic Motivation Headline */}
      <div style={{
        background: `linear-gradient(135deg, ${ac}18, #13132b)`,
        border: `1px solid ${ac}33`,
        borderRadius: 16,
        padding: "24px 22px",
        marginBottom: 20,
        textAlign: "center",
        boxShadow: `0 8px 30px ${ac}11`
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: ac, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          Quote of the Day
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", lineHeight: 1.3, fontStyle: "italic" }}>
          "{dailyQuote}"
        </h2>
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <StatCard label="TOTAL DONE"      value={stats.totalCompleted} sub={`${stats.totalDaysTracked} days`} color={ac}     />
        <StatCard label="AVG COMPLETION"  value={`${stats.avgPct}%`}   sub="per day"                         color={YELLOW} />
        <StatCard label="PERFECT DAYS"    value={stats.perfectDays}    sub="100% complete"                   color={GREEN}  />
        <StatCard label="BEST DAY"        value={stats.mostProductiveDay} sub="of week"                      color={BLUE}   />
      </div>

      {/* Streak row */}
      <div style={{ display:"flex", gap:10, marginBottom:18 }}>
        {[
          { icon:"🔥", value:stats.currentStreak, label:"Current streak", color:ac },
          { icon:"🏆", value:stats.bestStreak,    label:"Best streak ever", color:YELLOW },
        ].map(({ icon, value, label, color }) => (
          <div key={label} style={{ flex:1, background:`linear-gradient(135deg,${color}18,#13132b)`, borderRadius:14, border:`1px solid ${color}33`, padding:"14px 18px", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:28 }}>{icon}</span>
            <div>
              <div style={{ fontSize:24, fontWeight:900, color, lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:10, color:"#888", marginTop:3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart card */}
      <div style={{ background:"#13132b", borderRadius:16, border:"1px solid #1e1e3e", padding:"20px 22px", marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <span style={{ fontSize:14, fontWeight:700, color:"#c0c0e0" }}>
            {filter==="week" ? "📊 Weekly View" : "📈 Monthly Trend"}
          </span>
          <div style={{ display:"flex", gap:6 }}>
            <FilterBtn v="week" label="Week" />
            <FilterBtn v="month" label="Month" />
          </div>
        </div>

        {/* Legend */}
        <div style={{ display:"flex", gap:12, marginBottom:14 }}>
          {[{ c:GREEN, label:"Perfect (100%)" },{ c:YELLOW, label:"Partial (50–99%)" },{ c:RED, label:"Low (< 50%)" }].map(({ c, label }) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:9, height:9, borderRadius:3, background:c }} />
              <span style={{ fontSize:10, color:"#555" }}>{label}</span>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={210}>
          {filter==="week" ? (
            <BarChart data={chartData} margin={{ top:4, right:4, bottom:0, left:-20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3e" vertical={false} />
              <XAxis dataKey="label" tick={{ fill:"#555", fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{ fill:"#555", fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill:"#ffffff06" }} />
              <Bar dataKey="pct" radius={[6,6,0,0]} maxBarSize={48}>
                {chartData.map((e,i) => <Cell key={i} fill={e.pct===0?"#252545":colorFor(e.pct)} />)}
              </Bar>
            </BarChart>
          ) : (
            <AreaChart data={chartData} margin={{ top:4, right:4, bottom:0, left:-20 }}>
              <defs>
                <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={ac} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={ac} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3e" vertical={false} />
              <XAxis dataKey="label" tick={{ fill:"#555", fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{ fill:"#555", fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="pct" stroke={ac} strokeWidth={2}
                fill="url(#aGrad)" dot={{ fill:ac, r:3, strokeWidth:0 }} activeDot={{ r:6, fill:ac }} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Last 7 days color tape */}
      <div style={{ background:"#13132b", borderRadius:16, border:"1px solid #1e1e3e", padding:"18px 22px", marginBottom:18 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#c0c0e0", marginBottom:12 }}>🗓 Last 7 Days</div>
        <div style={{ display:"flex", gap:8 }}>
          {recent.map((d,i) => (
            <div key={i} style={{ flex:1, textAlign:"center" }}>
              <div style={{
                height:44, borderRadius:8, marginBottom:5,
                background: d.pct===0 ? "#1a1a3a" : colorFor(d.pct),
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontWeight:800, color: d.pct===0?"#2a2a4a":"#fff",
                transition:"all 0.3s ease",
              }}>{d.pct>0 ? `${d.pct}%` : "—"}</div>
              <div style={{ fontSize:9, color:"#555" }}>{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Missed tasks */}
      {missed.length > 0 && (
        <div style={{ background:"#13132b", borderRadius:16, border:"1px solid #1e1e3e", padding:"18px 22px", marginBottom:18 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#c0c0e0", marginBottom:14 }}>⚠️ Most Missed Tasks</div>
          {missed.map(t => {
            const rate = t.totalDays>0 ? Math.round((t.missCount/t.totalDays)*100) : 0;
            return (
              <div key={t.id} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:13, color:"#c0c0e0" }}>
                    {t.emoji} {t.label.length>38 ? t.label.slice(0,38)+"…" : t.label}
                  </span>
                  <span style={{ fontSize:11, fontWeight:700, color:rate>70?RED:YELLOW }}>{rate}% missed</span>
                </div>
                <div style={{ height:4, background:"#1e1e3e", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ width:`${rate}%`, height:"100%", background:rate>70?RED:YELLOW, borderRadius:4, transition:"width 0.5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {stats.totalDaysTracked === 0 && (
        <div style={{ textAlign:"center", color:"#33335a", padding:"30px 0", fontSize:14 }}>
          <div style={{ fontSize:32, marginBottom:10 }}>📭</div>
          Complete some tasks to see your analytics!
        </div>
      )}
    </div>
  );
};

export default Analytics;
