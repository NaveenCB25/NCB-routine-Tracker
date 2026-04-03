import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  CSSProperties,
} from "react";
import Analytics from "./Analytics";
import Auth from "./Auth";

// ─────────────────────────────────────────────────────────────────────────────
// Cloud API Abstraction
// ─────────────────────────────────────────────────────────────────────────────
const API_URL = "http://localhost:5000/api/routine";

const api = {
  async get<T>(path: string, token: string): Promise<T | null> {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return await res.json() as T;
    } catch {
      return null;
    }
  },
  async post<T>(path: string, data: any, token: string): Promise<T | null> {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) return null;
      return await res.json() as T;
    } catch {
      return null;
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Task {
  id: string;
  time: string;
  label: string;
  emoji: string;
  section: "morning" | "evening";
}

interface DayData {
  date: string;
  completed: string[];
  notes: string;
}

interface HistoryEntry {
  date: string;
  dayNum: number;
  completed: number;
  total: number;
  perfect: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Task definitions
// ─────────────────────────────────────────────────────────────────────────────
const TASKS: Task[] = [
  // ── Morning: Light Study + Focus Building ─────────────────────────────────
  { id: "m1", time: "5:15 AM",  label: "Wake up",                                        emoji: "⏰", section: "morning" },
  { id: "m2", time: "5:30 AM",  label: "College subject revision (5:30–6:15 AM)",         emoji: "📖", section: "morning" },
  { id: "m3", time: "6:15 AM",  label: "Breakfast + Get ready (6:15–7:00 AM)",            emoji: "🥗", section: "morning" },
  { id: "m4", time: "7:00 AM",  label: "Travel — revise notes / edu audio (7–8 AM)",      emoji: "🎧", section: "morning" },
  // ── Evening: Main Skill Development Time ─────────────────────────────────
  { id: "e1", time: "5:00 PM",  label: "Rest (5:00–5:30 PM)",                             emoji: "😌", section: "evening" },
  { id: "e2", time: "5:30 PM",  label: "College subject practice (5:30–6:30 PM)",         emoji: "📚", section: "evening" },
  { id: "e3", time: "6:30 PM",  label: "Break (6:30–7:00 PM)",                            emoji: "☕", section: "evening" },
  { id: "e4", time: "7:00 PM",  label: "🔥 Skill Development — Main Focus (7:00–9:00 PM)",emoji: "💻", section: "evening" },
  { id: "e5", time: "9:00 PM",  label: "Dinner (9:00–9:30 PM)",                           emoji: "🍲", section: "evening" },
  { id: "e6", time: "9:30 PM",  label: "Light revision / Plan next day (9:30–10:00 PM)",  emoji: "📝", section: "evening" },
  { id: "e7", time: "10:00 PM", label: "Sleep",                                           emoji: "😴", section: "evening" },
];

const MORNING = TASKS.filter((t) => t.section === "morning");
const EVENING = TASKS.filter((t) => t.section === "evening");
const TOTAL = TASKS.length;

// ─────────────────────────────────────────────────────────────────────────────
// Daily motivational quotes
// ─────────────────────────────────────────────────────────────────────────────
const QUOTES = [
  "I Won't Give Up — Every Day Counts.",
  "Consistency Beats Motivation.",
  "No Excuses. Just Results.",
  "Small Steps Lead to Big Wins.",
  "Discipline is My Superpower.",
  "Today's Actions = Tomorrow's Results.",
  "Champions Train. Losers Complain.",
  "Build the Life You Dream Of — One Day at a Time.",
  "Push Through. The Pain is Temporary.",
  "Your Future Self is Watching.",
];

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────────────────────────────
const START_DATE = new Date("2026-03-01T00:00:00");

const ACCENT_PALETTE = [
  "#6C63FF", "#00BFA5", "#FF6B6B", "#FFD166",
  "#06D6A0", "#EF476F", "#118AB2", "#F4A261",
];

function todayDate(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromKey(key: string): Date {
  const [y, mo, d] = key.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

function dayNum(date: Date): number {
  const ms = date.getTime() - START_DATE.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

function accent(date: Date): string {
  const index = Math.abs(dayNum(date) - 1) % ACCENT_PALETTE.length;
  return ACCENT_PALETTE[index];
}

function clampDate(date: Date): Date {
  const today = todayDate();
  if (date > today) return today;
  if (date < START_DATE) return new Date(START_DATE);
  return date;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const DAY_KEY_PREFIX = "routine:day:";

// ─────────────────────────────────────────────────────────────────────────────
// NavBtn
// ─────────────────────────────────────────────────────────────────────────────
interface NavBtnProps {
  onClick: () => void;
  disabled?: boolean;
  accentColor: string;
  title?: string;
  children: React.ReactNode;
  small?: boolean;
}

const NavBtn: React.FC<NavBtnProps> = ({
  onClick, disabled, accentColor, title, children, small,
}) => {
  const [hov, setHov] = useState(false);

  const s: CSSProperties = {
    background: hov && !disabled ? `${accentColor}20` : "transparent",
    border: `1.5px solid ${disabled ? "#2e2e4e" : accentColor}`,
    color: disabled ? "#3a3a5a" : hov ? "#fff" : accentColor,
    borderRadius: 8,
    padding: small ? "5px 12px" : "7px 16px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: small ? 12 : 13,
    fontWeight: 700,
    letterSpacing: "0.04em",
    outline: "none",
    transition: "all 0.18s ease",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  };

  return (
    <button
      style={s}
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TaskRow
// ─────────────────────────────────────────────────────────────────────────────
interface TaskRowProps {
  task: Task;
  done: boolean;
  onToggle: (id: string) => void;
  accentColor: string;
}

const TaskRow: React.FC<TaskRowProps> = React.memo(({ task, done, onToggle, accentColor }) => {
  const [hov, setHov] = useState(false);

  return (
    <div
      onClick={() => onToggle(task.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "11px 12px",
        borderRadius: 10,
        cursor: "pointer",
        background: hov ? "rgba(255,255,255,0.04)" : "transparent",
        transition: "background 0.15s ease",
        marginBottom: 2,
        userSelect: "none",
      }}
    >
      {/* Checkbox */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: `2px solid ${done ? accentColor : "#3a3a5e"}`,
          background: done ? accentColor : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.2s ease",
          boxShadow: done ? `0 0 10px ${accentColor}55` : "none",
        }}
      >
        {done && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1.5 5L4.5 8L10.5 2" stroke="#fff" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Emoji */}
      <span style={{ fontSize: 18, lineHeight: 1 }}>{task.emoji}</span>

      {/* Label */}
      <span style={{
        flex: 1,
        fontSize: 14,
        color: done ? "#55557a" : "#d0d0e8",
        textDecoration: done ? "line-through" : "none",
        transition: "all 0.2s ease",
        fontWeight: 500,
      }}>
        {task.label}
      </span>

      {/* Time */}
      <span style={{ fontSize: 11, color: "#3e3e60", fontVariantNumeric: "tabular-nums" }}>
        {task.time}
      </span>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// TaskSection
// ─────────────────────────────────────────────────────────────────────────────
interface TaskSectionProps {
  heading: string;
  headerEmoji: string;
  tasks: Task[];
  completed: Set<string>;
  onToggle: (id: string) => void;
  accentColor: string;
}

const TaskSection: React.FC<TaskSectionProps> = ({
  heading, headerEmoji, tasks, completed, onToggle, accentColor,
}) => {
  const done = tasks.filter((t) => completed.has(t.id)).length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div style={{
      background: "#13132b",
      borderRadius: 16,
      border: "1px solid #1e1e3e",
      padding: "20px 22px",
      marginBottom: 18,
    }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#c8c8e8", letterSpacing: "0.03em" }}>
          {headerEmoji} {heading}
        </span>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: accentColor,
          background: `${accentColor}15`,
          borderRadius: 20,
          padding: "3px 11px",
        }}>
          {done}/{tasks.length} · {pct}%
        </span>
      </div>

      {/* Section mini progress */}
      <div style={{ height: 3, background: "#1e1e3e", borderRadius: 4, marginBottom: 14, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          background: accentColor,
          borderRadius: 4,
          transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>

      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          done={completed.has(t.id)}
          onToggle={onToggle}
          accentColor={accentColor}
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HistoryRow — MUST be declared before RoutineTracker (used inside it)
// ─────────────────────────────────────────────────────────────────────────────
interface HistoryRowProps {
  entry: HistoryEntry;
  entryAc: string;
  entryPct: number;
  onClick: (date: string) => void;
}

const HistoryRow: React.FC<HistoryRowProps> = React.memo(({ entry, entryAc, entryPct, onClick }) => {
  const [hov, setHov] = useState(false);

  return (
    <div
      onClick={() => onClick(entry.date)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "11px 14px",
        borderRadius: 10,
        marginBottom: 6,
        cursor: "pointer",
        border: `1px solid ${entry.perfect ? "#FFD16630" : hov ? "#252545" : "#1a1a38"}`,
        background: hov
          ? "rgba(255,255,255,0.04)"
          : entry.perfect
          ? "#FFD16607"
          : "#0e0e22",
        transition: "all 0.15s ease",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#cccce8" }}>
          Day {entry.dayNum}
          {entry.perfect && <span style={{ marginLeft: 6 }}>🏆</span>}
        </div>
        <div style={{ fontSize: 11, color: "#44445a", marginTop: 3 }}>
          {formatDate(fromKey(entry.date))}
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: entryAc }}>
          {entryPct}%
        </div>
        <div style={{ fontSize: 11, color: "#33335a" }}>
          {entry.completed}/{entry.total}
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// RoutineTracker — Main Component
// ─────────────────────────────────────────────────────────────────────────────
const RoutineTracker: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState<any>(null);

  const [currentDate, setCurrentDate] = useState<Date>(() => todayDate());
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);
  const [tab, setTab] = useState<"routine" | "history">("routine");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [streak, setStreak] = useState(0);

  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = todayDate();
  const ac = accent(currentDate);
  const dn = dayNum(currentDate);
  const isToday = toKey(currentDate) === toKey(today);
  const isStart = toKey(currentDate) === toKey(START_DATE);
  const doneCount = completed.size;
  const progress  = TOTAL > 0 ? Math.round((doneCount / TOTAL) * 100) : 0;
  const isPerfect  = doneCount === TOTAL && !loading;
  const dailyQuote = QUOTES[Math.abs(dn - 1) % QUOTES.length];

  // ── Load day ──────────────────────────────────────────────────────────────
  const loadDay = useCallback(async (date: Date) => {
    if (!token) return;
    setLoading(true);
    const data = await api.get<DayData>(`/${toKey(date)}`, token);
    setCompleted(new Set(data?.completed ?? []));
    setNotes(data?.notes ?? "");
    setLoading(false);
  }, [token]);

  // ── Persist day ───────────────────────────────────────────────────────────
  const persistDay = useCallback(async (date: Date, comp: Set<string>, note: string) => {
    if (!token) return;
    await api.post(`/${toKey(date)}`, { completed: Array.from(comp), notes: note }, token);
  }, [token]);

  // ── Load history + streak ─────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!token) return;
    const records = await api.get<{date: string; completed: string[]; notes: string}[]>('/list', token);
    if (!records) return;

    const entries: HistoryEntry[] = records.map(d => ({
        date: d.date,
        dayNum: dayNum(fromKey(d.date)),
        completed: d.completed.length,
        total: TOTAL,
        perfect: d.completed.length === TOTAL,
    }));

    entries.sort((a, b) => b.dayNum - a.dayNum);
    setHistory(entries);

    // Calculate streak
    let s = 0;
    const cursor = todayDate();
    while (true) {
      const rec = records.find(r => r.date === toKey(cursor));
      if (rec && rec.completed.length === TOTAL) {
        s++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    setStreak(s);
  }, [token]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { loadDay(currentDate); }, [currentDate, loadDay]);

  useEffect(() => {
    if (!loading) persistDay(currentDate, completed, notes);
  }, [completed, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggle = useCallback((id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleNotes = useCallback((val: string) => {
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      await persistDay(currentDate, completed, val);
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 2000);
    }, 750);
  }, [currentDate, completed, persistDay]);

  const navigate = useCallback((delta: number) => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return clampDate(next);
    });
  }, []);

  const goToday = useCallback(() => setCurrentDate(todayDate()), []);

  const handleDatePicker = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    setCurrentDate(clampDate(new Date(e.target.value + "T00:00:00")));
  }, []);

  const openHistoryDay = useCallback((dateStr: string) => {
    setCurrentDate(fromKey(dateStr));
    setTab("routine");
  }, []);

  // ── History stats ─────────────────────────────────────────────────────────
  const totalDays = history.length;
  const perfectDays = history.filter((h) => h.perfect).length;
  const bestStreak = (() => {
    const sorted = [...history].sort((a, b) => a.dayNum - b.dayNum);
    let best = 0;
    let cur = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].perfect && (i === 0 || sorted[i].dayNum - sorted[i - 1].dayNum === 1)) {
        best = Math.max(best, ++cur);
      } else {
        cur = sorted[i].perfect ? 1 : 0;
      }
    }
    return best;
  })();

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return <Auth onLogin={(tok, usr) => { setToken(tok); setUser(usr); }} />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body {
          background: #080818;
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 10px; }
        input[type='date']::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.82; }
        }
        .rt-fade    { animation: fadeSlide 0.28s ease forwards; }
        .rt-perfect { animation: glowPulse 2.4s ease-in-out infinite; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#08081a 0%,#0e0e22 60%,#0a0a1e 100%)", color: "#d8d8f0" }}>

        {/* ══ STICKY HEADER ══ */}
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 200,
          background: "rgba(8,8,24,0.90)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid #151530",
          padding: "14px 20px 16px",
        } as CSSProperties}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>

            {/* Day badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                color: ac,
                background: `${ac}18`,
                border: `1px solid ${ac}33`,
                borderRadius: 20,
                padding: "3px 12px",
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,  // ← fixes TS "string not assignable to TextTransform"
              }}>
                Day {dn}
              </span>
              {streak > 0 && isToday && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#FFD166",
                  background: "#FFD16618",
                  border: "1px solid #FFD16633",
                  borderRadius: 20,
                  padding: "3px 12px",
                }}>
                  🔥 {streak}-day streak
                </span>
              )}
            </div>

            {/* Date title & Profile */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#eeeef8", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                  {formatDate(currentDate)}
                </h1>
                <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid #ffffff22", color: "#888", padding: "4px 10px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                  Logout
                </button>
            </div>

            {/* Daily motivational quote */}
            <p style={{
              fontSize: 12,
              fontStyle: "italic",
              color: `${ac}cc`,
              marginBottom: 12,
              letterSpacing: "0.02em",
              lineHeight: 1.5,
            }}>
              ✦ {dailyQuote}
            </p>

            {/* Navigation row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <NavBtn accentColor={ac} onClick={() => navigate(-1)} disabled={isStart} title="Previous day">
                ← Prev
              </NavBtn>
              <NavBtn accentColor={ac} onClick={() => navigate(1)} disabled={isToday} title="Next day">
                Next →
              </NavBtn>
              {!isToday && (
                <NavBtn accentColor={ac} onClick={goToday} title="Jump to today">
                  ↺ Today
                </NavBtn>
              )}
              <input
                type="date"
                value={toKey(currentDate)}
                min={toKey(START_DATE)}
                max={toKey(today)}
                onChange={handleDatePicker}
                style={{
                  background: "#13132a",
                  border: `1.5px solid ${ac}33`,
                  borderRadius: 8,
                  color: "#aaaacc",
                  padding: "6px 10px",
                  fontSize: 12,
                  fontFamily: "inherit",
                  colorScheme: "dark",  // valid CSS property; TS may warn on older @types/react
                  cursor: "pointer",
                  outline: "none",
                } as CSSProperties}  // ← cast silences "colorScheme" unknown-prop TS error
              />
            </div>
          </div>
        </div>

        {/* ══ MAIN CONTENT ══ */}
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "22px 20px 70px" }}>

          {/* Tab bar */}
          <div style={{
            display: "flex",
            gap: 4,
            background: "#0f0f26",
            borderRadius: 12,
            padding: 4,
            marginBottom: 22,
            border: "1px solid #181838",
          }}>
            {(["routine", "history"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 9,
                  border: "none",
                  background: tab === t ? ac : "transparent",
                  color: tab === t ? "#fff" : "#555577",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                  boxShadow: tab === t ? `0 4px 16px ${ac}40` : "none",
                }}
              >
                {t === "routine" ? "📅 Routine" : "📊 History"}
              </button>
            ))}
          </div>

          {/* ══ ROUTINE TAB ══ */}
          {tab === "routine" && (
            <div className="rt-fade">

              {/* Perfect Day banner */}
              {isPerfect && (
                <div className="rt-perfect" style={{
                  background: `linear-gradient(135deg, ${ac}18, ${ac}08)`,
                  border: `1px solid ${ac}44`,
                  borderRadius: 14,
                  padding: "14px 20px",
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}>
                  <span style={{ fontSize: 32 }}>🏆</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: ac }}>Perfect Day!</div>
                    <div style={{ fontSize: 12, color: "#8888aa", marginTop: 3 }}>
                      Every single task completed. You crushed it!
                    </div>
                  </div>
                </div>
              )}

              {/* Progress card */}
              <div style={{
                background: "#13132b",
                borderRadius: 16,
                border: "1px solid #1e1e3e",
                padding: "20px 22px",
                marginBottom: 18,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#9090b8" }}>Daily Progress</span>
                  <span style={{ fontSize: 26, fontWeight: 900, color: ac, letterSpacing: "-0.04em" }}>
                    {progress}%
                  </span>
                </div>
                <div style={{
                  height: 10,
                  background: "#1a1a3a",
                  borderRadius: 10,
                  margin: "12px 0 8px",
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: isPerfect
                      ? `linear-gradient(90deg, ${ac}, #FFD166, ${ac})`
                      : `linear-gradient(90deg, ${ac}88 0%, ${ac} 100%)`,
                    borderRadius: 10,
                    boxShadow: `0 0 14px ${ac}55`,
                    transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
                    backgroundSize: isPerfect ? "200% 100%" : undefined,
                    animation: isPerfect ? "shimmer 2s linear infinite" : undefined,
                  }} />
                </div>
                <div style={{ fontSize: 12, color: "#44445a" }}>
                  {doneCount} of {TOTAL} tasks completed
                </div>
              </div>

              {/* Task sections */}
              {loading ? (
                <div style={{ textAlign: "center", padding: "50px 0", color: "#33335a" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
                  <div style={{ fontSize: 14 }}>Loading…</div>
                </div>
              ) : (
                <>
                  <TaskSection
                    heading="Morning — Light Study + Focus Building"
                    headerEmoji="🌅"
                    tasks={MORNING}
                    completed={completed}
                    onToggle={handleToggle}
                    accentColor={ac}
                  />
                  <TaskSection
                    heading="Evening — Main Skill Development"
                    headerEmoji="🔥"
                    tasks={EVENING}
                    completed={completed}
                    onToggle={handleToggle}
                    accentColor={ac}
                  />
                </>
              )}

              {/* Notes card */}
              <div style={{
                background: "#13132b",
                borderRadius: 16,
                border: "1px solid #1e1e3e",
                padding: "20px 22px",
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#c0c0e0" }}>
                    📝 Daily Notes
                  </span>
                  {savedBadge && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#06D6A0",
                      background: "#06D6A015",
                      borderRadius: 20,
                      padding: "2px 10px",
                      border: "1px solid #06D6A033",
                      animation: "fadeSlide 0.2s ease",
                    }}>
                      ✓ Saved
                    </span>
                  )}
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => handleNotes(e.target.value)}
                  placeholder="Thoughts, reflections, or intentions for today…"
                  onFocus={(e) => { e.currentTarget.style.borderColor = ac; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#1e1e3e"; }}
                  style={{
                    width: "100%",
                    minHeight: 110,
                    background: "#0a0a1e",
                    border: "1.5px solid #1e1e3e",
                    borderRadius: 10,
                    color: "#c8c8e8",
                    fontSize: 14,
                    lineHeight: 1.65,
                    padding: "12px 14px",
                    resize: "vertical",
                    outline: "none",
                    fontFamily: "inherit",
                    transition: "border-color 0.2s ease",
                    display: "block",
                  }}
                />
              </div>
            </div>
          )}

          {/* ══ HISTORY / ANALYTICS TAB ══ */}
          {tab === "history" && (
            <Analytics
              totalTasks={TOTAL}
              tasks={TASKS}
              accentColor={ac}
              dailyQuote={dailyQuote}
              token={token}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default RoutineTracker;
