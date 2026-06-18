import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Trash2, Plus, X, ChevronRight } from 'lucide-react';

export default function Dashboard({
  user,
  onLogout,
  topics,
  setTopics,
  goalMinutes,
  setGoalMinutes,
  dailyLog,
  setDailyLog,
  todayPlan,
  setTodayPlan,
  saveState,
  nowTime
}) {
  // Navigation details
  const [navDateString, setNavDateString] = useState('');
  // Plan toggle state
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  // Topic input state
  const [newTopicName, setNewTopicName] = useState('');
  // Calendar Navigation State
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [selectedKey, setSelectedKey] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Constants
  const CIRC = 2 * Math.PI * 65; // 408.41

  // Set Nav Date once
  useEffect(() => {
    const d = new Date();
    setNavDateString(
      d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    );
  }, []);

  /* ═══ HELPERS ═══ */
  const elapsed = (t) => {
    return t.seconds + (t.running && t.startedAt ? (nowTime - t.startedAt) / 1000 : 0);
  };

  const totalSec = () => {
    return topics.reduce((acc, t) => acc + elapsed(t), 0);
  };

  const fmt = (s) => {
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${h}:${p(m)}:${p(ss)}`;
  };

  const fmtS = (s) => {
    s = Math.max(0, Math.round(s));
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const p = (n) => String(n).padStart(2, '0');

  const fmtGoal = (mins) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const fmtClock = (ms) => {
    if (!ms) return null;
    return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const toTV = (ms) => {
    if (!ms) return '';
    const d = new Date(ms);
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const dk = (d) => {
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  const todayK = () => dk(new Date());

  const ydayK = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return dk(d);
  };

  const meta = (t) => {
    if (t.running && t.lastStart) return `Started ${fmtClock(t.lastStart)} · running`;
    if (t.lastStart && t.lastEnd) {
      let dur = (t.lastEnd - t.lastStart) / 1000;
      if (dur < 0) dur += 24 * 3600;
      return `${fmtClock(t.lastStart)} – ${fmtClock(t.lastEnd)} (${fmtS(dur)})`;
    }
    if (t.lastStart) return `Started ${fmtClock(t.lastStart)}`;
    return 'Not started yet';
  };

  const esc = (s) => s; // In React, JSX handles escaping automatically

  /* ═══ ACTIONS ═══ */
  const togTimer = (id) => {
    const updated = topics.map((t) => {
      if (t.id === id) {
        if (t.running) {
          // Pause it
          const elapsedSecs = elapsed(t);
          return {
            ...t,
            seconds: elapsedSecs,
            running: false,
            startedAt: null,
            lastEnd: Date.now()
          };
        } else {
          // Play it (and pause all other running ones)
          return {
            ...t,
            running: true,
            startedAt: Date.now(),
            lastStart: Date.now()
          };
        }
      } else if (t.running) {
        // Pause other active timers
        return {
          ...t,
          seconds: elapsed(t),
          running: false,
          startedAt: null,
          lastEnd: Date.now()
        };
      }
      return t;
    });

    setTopics(updated);
    saveState({ topics: updated });
  };

  const resetT = (id) => {
    const t = topics.find((x) => x.id === id);
    if (!t) return;
    if (t.seconds < 1 && !t.running) return;
    if (!confirm(`Reset "${t.name}"? This clears its time and log.`)) return;

    const updated = topics.map((x) => {
      if (x.id === id) {
        return {
          ...x,
          seconds: 0,
          running: false,
          startedAt: null,
          lastStart: null,
          lastEnd: null
        };
      }
      return x;
    });

    setTopics(updated);
    saveState({ topics: updated });
  };

  const removeT = (id) => {
    const t = topics.find((x) => x.id === id);
    if (!t) return;
    if (!confirm(`Remove "${t.name}"?`)) return;

    const updated = topics.filter((x) => x.id !== id);
    setTopics(updated);
    saveState({ topics: updated });
  };

  const setManual = (id, v) => {
    const updated = topics.map((t) => {
      if (t.id === id && !t.running) {
        return {
          ...t,
          seconds: Math.max(0, parseFloat(v) || 0) * 60
        };
      }
      return t;
    });
    setTopics(updated);
    saveState({ topics: updated });
  };

  const setTarget = (id, v) => {
    const updated = topics.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          targetMinutes: Math.max(0, parseFloat(v) || 0)
        };
      }
      return t;
    });
    setTopics(updated);
    saveState({ topics: updated });
  };

  const setTime = (id, f, v) => {
    const updated = topics.map((t) => {
      if (t.id === id && !t.running) {
        let lastStart = t.lastStart;
        let lastEnd = t.lastEnd;
        let seconds = t.seconds;

        if (!v) {
          if (f === 's') lastStart = null;
          else lastEnd = null;
        } else {
          const [hh, mm] = v.split(':').map(Number);
          const b = new Date();
          b.setHours(hh, mm, 0, 0);

          if (f === 's') lastStart = b.getTime();
          else lastEnd = b.getTime();

          if (lastStart && lastEnd) {
            const diff = (lastEnd - lastStart) / 1000;
            if (diff > 0) seconds = diff;
          }
        }

        return { ...t, lastStart, lastEnd, seconds };
      }
      return t;
    });
    setTopics(updated);
    saveState({ topics: updated });
  };

  const toggleComplete = (id) => {
    const updated = topics.map((t) => {
      if (t.id === id) {
        const completed = !t.completed;
        const running = completed ? false : t.running;
        const startedAt = completed ? null : t.startedAt;
        const seconds = t.running && completed ? elapsed(t) : t.seconds;
        return {
          ...t,
          completed,
          running,
          startedAt,
          seconds,
          ...(t.running && completed ? { lastEnd: Date.now() } : {})
        };
      }
      return t;
    });
    setTopics(updated);
    saveState({ topics: updated });
  };

  const updateTopicName = (id, name) => {
    const updated = topics.map((t) => {
      if (t.id === id) {
        return { ...t, name: name.trim() || t.name };
      }
      return t;
    });
    setTopics(updated);
    saveState({ topics: updated });
  };

  const addTopic = () => {
    const name = newTopicName.trim();
    if (!name) return;

    const newTopic = {
      id: 't' + Math.random().toString(36).slice(2, 9),
      name,
      completed: false,
      seconds: 0,
      running: false,
      startedAt: null,
      targetMinutes: 0,
      lastStart: null,
      lastEnd: null
    };

    const updated = [...topics, newTopic];
    setTopics(updated);
    setNewTopicName('');
    saveState({ topics: updated });
  };

  const handleGoalChange = (val) => {
    const g = parseFloat(val);
    if (g > 0) {
      setGoalMinutes(g);
      saveState({ goalMinutes: g });
    }
  };

  /* ═══ CALENDAR LOGIC ═══ */
  const tierFor = (s) => {
    if (s <= 0) return 0;
    const p = goalMinutes > 0 ? s / (goalMinutes * 60) : 0;
    if (p < 0.34) return 1;
    if (p < 0.7) return 2;
    return 3;
  };

  const buildGrid = (y, m) => {
    const first = new Date(y, m, 1);
    const off = first.getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < off; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(new Date(y, m, d));
    return cells;
  };

  const handlePrevMonth = () => {
    let m = viewMonth - 1;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y--;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const handleNextMonth = () => {
    const now = new Date();
    if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return;

    let m = viewMonth + 1;
    let y = viewYear;
    if (m > 11) {
      m = 0;
      y++;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const openDetail = (k) => {
    setSelectedKey(k);
    setIsDetailOpen(true);
  };

  const closeDetail = () => {
    setSelectedKey(null);
    setIsDetailOpen(false);
  };

  // Sync today's log entries dynamically
  useEffect(() => {
    const tot = totalSec();
    const key = todayK();
    
    // Update dailyLog object in state
    const currentTodayLog = dailyLog[key];
    const newTodayLog = {
      total: tot,
      topics: topics.map((t) => ({
        name: t.name,
        seconds: Math.round(elapsed(t))
      }))
    };

    // Only update and save if the total has changed significantly (avoid infinite rendering loop)
    if (!currentTodayLog || Math.abs(currentTodayLog.total - tot) > 0.5) {
      const updatedLog = {
        ...dailyLog,
        [key]: newTodayLog
      };
      setDailyLog(updatedLog);
      
      // Update DB
      saveState({ dailyLog: updatedLog });
    }
  }, [nowTime, topics]);

  // Derived Values
  const totSecVal = totalSec();
  const gSec = goalMinutes * 60;
  const progressRatio = gSec > 0 ? Math.min(totSecVal / gSec, 1) : 0;
  const strokeOffset = (CIRC * (1 - progressRatio)).toFixed(2);
  const isGoalReached = totSecVal >= gSec && gSec > 0;
  const minutesOver = Math.round((totSecVal - gSec) / 60);

  const activeCount = topics.filter((t) => t.seconds > 30 || t.running).length;
  const liveTimerRunning = topics.some((t) => t.running);

  // Yesterday Log display
  const ydayEntry = dailyLog[ydayK()];
  const ydayText = ydayEntry && ydayEntry.total > 0 ? fmtS(ydayEntry.total) : 'No data';

  // Render Calendar Grid Cells
  const calendarCells = buildGrid(viewYear, viewMonth);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Detail panel date representation
  const getDetailLabel = () => {
    if (!selectedKey) return '';
    const isToday = selectedKey === todayK();
    const dateObj = new Date(selectedKey + 'T00:00:00');
    const label = dateObj.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    return `${label} ${isToday ? '(live)' : ''}`;
  };

  const getDetailTotal = () => {
    if (!selectedKey) return '0:00:00';
    const entry = dailyLog[selectedKey];
    return entry ? fmt(entry.total) : '0:00:00';
  };

  const getDetailTopics = () => {
    if (!selectedKey) return [];
    const entry = dailyLog[selectedKey];
    return entry && entry.topics ? entry.topics.filter((t) => t.seconds > 0) : [];
  };

  const detailTopics = getDetailTopics();
  const detailMaxSecs = detailTopics.length > 0 ? Math.max(...detailTopics.map((t) => t.seconds)) : 0;

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <div className="nav-left">
          <div className="nav-logo">MANIT Focus</div>
          <div className="nav-badge">NIT Bhopal</div>
          <span className={`live-dot ${liveTimerRunning ? 'on' : ''}`}></span>
        </div>
        <div className="nav-right">
          <div className="nav-date">{navDateString || '—'}</div>
          <div className="nav-date" style={{ background: 'var(--indigo-light)', borderColor: 'var(--border-strong)', color: 'var(--indigo)', fontWeight: '700' }}>
            Hi, {user.username}
          </div>
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div className="app">
        {/* SIDEBAR */}
        <aside className="sidebar">
          {/* Ring Tracker */}
          <div className="ring-card">
            <div className="ring-wrap">
              <svg viewBox="0 0 155 155" xmlns="http://www.w3.org/2000/svg">
                <circle className="ring-track" cx="77.5" cy="77.5" r="65" />
                <circle
                  className={`ring-progress ${isGoalReached ? 'over' : ''}`}
                  cx="77.5"
                  cy="77.5"
                  r="65"
                  strokeDasharray="408.41"
                  strokeDashoffset={strokeOffset}
                />
              </svg>
              <div className="ring-center">
                <div className="ring-time">{fmt(totSecVal)}</div>
                <div className="ring-sub">
                  {isGoalReached
                    ? minutesOver > 0
                      ? `+${minutesOver} min over`
                      : 'goal reached ✓'
                    : `of ${fmtGoal(goalMinutes)} goal`}
                </div>
              </div>
            </div>
            <div className="goal-row" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>Daily goal</span>
              <input
                type="number"
                min="0"
                max="23"
                value={Math.floor(goalMinutes / 60)}
                onChange={(e) => {
                  const h = Math.max(0, parseInt(e.target.value) || 0);
                  const m = goalMinutes % 60;
                  handleGoalChange(h * 60 + m);
                }}
                style={{ width: '42px', padding: '5px 4px', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '9px', color: '#fff', fontWeight: '800', textAlign: 'center' }}
              />
              <span>h</span>
              <input
                type="number"
                min="0"
                max="59"
                value={Math.round(goalMinutes % 60)}
                onChange={(e) => {
                  const h = Math.floor(goalMinutes / 60);
                  const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                  handleGoalChange(h * 60 + m);
                }}
                style={{ width: '42px', padding: '5px 4px', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '9px', color: '#fff', fontWeight: '800', textAlign: 'center' }}
              />
              <span>m</span>
            </div>
          </div>

          {/* Stats Box */}
          <div className="stats-row">
            <div className="stat-box s-green">
              <div className="stat-label">Yesterday</div>
              <div className="stat-val green" style={{ color: 'var(--emerald)' }}>
                {ydayText}
              </div>
            </div>
            <div className="stat-box s-indigo">
              <div className="stat-label">Active topics</div>
              <div className="stat-val" style={{ color: '#3730A3' }}>
                {activeCount}/{topics.length}
              </div>
            </div>
          </div>

          {/* Daily Schedule Plan */}
          <div className="plan-section">
            <button
              className={`plan-toggle ${isPlanOpen ? 'open' : ''}`}
              onClick={() => setIsPlanOpen(!isPlanOpen)}
            >
              Today's plan <span className="arr">›</span>
            </button>
            <div className={`plan-body ${isPlanOpen ? 'open' : ''}`}>
              {topics.map((t) => {
                const startStr = t.lastStart ? new Date(t.lastStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                const endStr = t.lastEnd ? new Date(t.lastEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                let timeDisplay = '--:--';
                if (startStr && endStr) {
                  timeDisplay = `${startStr} – ${endStr}`;
                } else if (startStr) {
                  timeDisplay = `${startStr} →`;
                } else if (endStr) {
                  timeDisplay = `→ ${endStr}`;
                }

                let dur = 0;
                if (t.lastStart && t.lastEnd) {
                  dur = (t.lastEnd - t.lastStart) / 1000;
                  if (dur < 0) dur += 24 * 3600;
                }

                return (
                  <div
                    className="plan-row"
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 16px',
                      borderBottom: '1px solid var(--border)',
                      background: t.running ? 'var(--indigo-light)' : 'transparent'
                    }}
                  >
                    <div
                      className="plan-time"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: '700',
                        color: t.running ? 'var(--indigo-mid)' : 'var(--indigo)',
                        minWidth: '100px',
                        fontSize: '12px'
                      }}
                    >
                      {timeDisplay}
                    </div>
                    <div
                      className="plan-desc"
                      style={{
                        textDecoration: t.completed ? 'line-through' : 'none',
                        fontWeight: t.running ? '600' : '500',
                        color: t.completed ? 'var(--text-soft)' : 'var(--text-muted)',
                        flex: 1
                      }}
                    >
                      {t.name}
                    </div>
                    {dur > 0 && (
                      <div
                        className="plan-duration"
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: 'var(--emerald)',
                          background: 'var(--emerald-bg)',
                          border: '1.5px solid var(--emerald-border)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {fmtS(dur)}
                      </div>
                    )}
                    {t.running && (
                      <span
                        className="live-dot on"
                        style={{
                          width: '7px',
                          height: '7px',
                          marginLeft: dur > 0 ? '0' : 'auto',
                          display: 'inline-block'
                        }}
                      ></span>
                    )}
                  </div>
                );
              })}
              {topics.length === 0 && (
                <div style={{ padding: '16px', color: 'var(--text-soft)', textAlign: 'center', fontSize: '12px' }}>
                  No topics added yet.
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* MAIN DISPLAY */}
        <main className="main">
          {/* Topics management */}
          <section>
            <div className="sec-label">Topics</div>
            <div className="topics-grid">
              {topics.map((t) => {
                const isTopicRunning = t.running;
                const hasTarget = t.targetMinutes > 0;
                const progFillWidth = hasTarget
                  ? Math.min((elapsed(t) / (t.targetMinutes * 60)) * 100, 100)
                  : 0;

                return (
                  <div
                    key={t.id}
                    className={`tcard ${t.completed ? 'done' : ''} ${isTopicRunning ? 'running' : ''}`}
                  >
                    <div className="tcard-top">
                      <input
                        type="checkbox"
                        className="chk"
                        checked={t.completed}
                        onChange={() => toggleComplete(t.id)}
                      />
                      <input
                        className="name-inp"
                        type="text"
                        value={t.name}
                        onChange={(e) => updateTopicName(t.id, e.target.value)}
                        maxLength={40}
                      />
                      <button
                        className="del-btn"
                        title="Remove"
                        onClick={() => removeT(t.id)}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="timer-row">
                      <div className="ttime">
                        {fmt(elapsed(t))}
                      </div>
                      <button
                        className={`tbtn ${isTopicRunning ? 'pause' : 'play'}`}
                        onClick={() => togTimer(t.id)}
                      >
                        {isTopicRunning ? <Pause size={12} /> : <Play size={12} />}
                        {isTopicRunning ? 'Pause' : 'Start'}
                      </button>
                      <button
                        className="tbtn rst"
                        title="Reset"
                        onClick={() => resetT(t.id)}
                      >
                        <RotateCcw size={12} /> Reset
                      </button>
                    </div>

                    <div className="fields">
                      <div className="field">
                        <label>Logged (min)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          disabled={isTopicRunning}
                          value={t.seconds >= 30 ? Math.round(t.seconds / 60) : ''}
                          onChange={(e) => setManual(t.id, e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label>Target (min)</label>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          placeholder="—"
                          value={t.targetMinutes > 0 ? t.targetMinutes : ''}
                          onChange={(e) => setTarget(t.id, e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <label style={{ fontSize: '9px', fontWeight: '600' }}>Start time</label>
                          <button
                            type="button"
                            onClick={(e) => {
                              const input = e.currentTarget.closest('.field').querySelector('input[type="time"]');
                              if (input) {
                                try {
                                  input.showPicker();
                                } catch (err) {
                                  input.focus();
                                }
                              }
                            }}
                            disabled={isTopicRunning}
                            style={{
                              border: '1px solid var(--border)',
                              background: 'var(--indigo-light)',
                              color: 'var(--indigo)',
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            Set
                          </button>
                        </div>
                        <input
                          type="time"
                          disabled={isTopicRunning}
                          value={toTV(t.lastStart)}
                          onChange={(e) => setTime(t.id, 's', e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <label style={{ fontSize: '9px', fontWeight: '600' }}>End time</label>
                          <button
                            type="button"
                            onClick={(e) => {
                              const input = e.currentTarget.closest('.field').querySelector('input[type="time"]');
                              if (input) {
                                try {
                                  input.showPicker();
                                } catch (err) {
                                  input.focus();
                                }
                              }
                            }}
                            disabled={isTopicRunning}
                            style={{
                              border: '1px solid var(--border)',
                              background: 'var(--indigo-light)',
                              color: 'var(--indigo)',
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            Set
                          </button>
                        </div>
                        <input
                          type="time"
                          disabled={isTopicRunning}
                          value={toTV(t.lastEnd)}
                          onChange={(e) => setTime(t.id, 'e', e.target.value)}
                        />
                      </div>
                    </div>

                    {hasTarget && (
                      <div className="prog-track">
                        <div
                          className={`prog-fill ${progFillWidth >= 100 ? 'complete' : ''}`}
                          style={{ width: `${progFillWidth.toFixed(1)}%` }}
                        ></div>
                      </div>
                    )}

                    <div className="meta">{meta(t)}</div>
                  </div>
                );
              })}
            </div>

            <div className="add-row">
              <input
                className="add-inp"
                type="text"
                placeholder="Add a topic…"
                maxLength={40}
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTopic();
                }}
              />
              <button className="add-btn" onClick={addTopic}>
                <Plus size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Add
              </button>
            </div>
          </section>

          {/* History heatmap calendar */}
          <section>
            <div className="hist-card">
              <div className="hist-head">
                <div className="hist-title">Study History</div>
                <div className="yday-chip">
                  <span className="yday-dot"></span>
                  <span>Yesterday: {ydayText}</span>
                </div>
              </div>

              <div className="cal-nav">
                <button className="cal-nav-btn" onClick={handlePrevMonth}>
                  ‹
                </button>
                <div className="cal-month">
                  {new Date(viewYear, viewMonth, 1).toLocaleDateString([], {
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
                <button
                  className="cal-nav-btn"
                  onClick={handleNextMonth}
                  disabled={viewYear === now.getFullYear() && viewMonth === now.getMonth()}
                >
                  ›
                </button>
              </div>

              <div className="cal-days-hdr">
                <span>S</span>
                <span>M</span>
                <span>T</span>
                <span>W</span>
                <span>T</span>
                <span>F</span>
                <span>S</span>
              </div>

              <div className="cal-grid">
                {calendarCells.map((d, idx) => {
                  if (!d) {
                    return <div className="cal-cell empty" key={`empty-${idx}`}></div>;
                  }

                  const k = dk(d);
                  const entry = dailyLog[k];
                  const tot = entry ? entry.total : 0;
                  const isToday = k === todayK();
                  const isFut = d > now;
                  const tier = tierFor(tot);

                  return (
                    <div
                      key={k}
                      className={`cal-cell ${tier > 0 ? `t${tier}` : ''} ${isToday ? 'today' : ''} ${
                        isFut ? 'future' : ''
                      } ${k === selectedKey ? 'sel' : ''}`}
                      style={{ '--dl': `${idx * 11}ms` }}
                      title={tot > 0 ? fmtS(tot) : undefined}
                      onClick={() => !isFut && openDetail(k)}
                    >
                      <span className="cal-num">{d.getDate()}</span>
                    </div>
                  );
                })}
              </div>

              {/* Day panel detail overlay */}
              <div className={`day-panel ${isDetailOpen ? 'open' : ''}`}>
                <div className="dp-inner">
                  <button className="dp-close" onClick={closeDetail}>
                    ✕
                  </button>
                  <div className="dp-date">{getDetailLabel()}</div>
                  <div className="dp-total">{getDetailTotal()}</div>
                  <div id="dpTopics">
                    {detailTopics.length > 0 ? (
                      detailTopics
                        .sort((a, b) => b.seconds - a.seconds)
                        .map((t, i) => {
                          const pp = detailMaxSecs > 0 ? (t.seconds / detailMaxSecs) * 100 : 0;
                          return (
                            <div className="dp-row" key={i}>
                              <div className="dp-row-top">
                                <span>{t.name}</span>
                                <span>{fmtS(t.seconds)}</span>
                              </div>
                              <div className="dp-bar-track">
                                <div
                                  className="dp-bar-fill"
                                  style={{ width: `${pp.toFixed(1)}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="dp-empty">No data logged for this day.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="persist-note">
                ✓ History is synchronized securely to your MongoDB cloud database.
              </div>
            </div>
          </section>

          {/* Footer / credits */}
          <footer className="footer">
            <div className="credit-main">
              <span className="credit-tag">Founder &amp; Developer</span>
              <span className="credit-name">Ankit Kumar</span>
            </div>
            <div className="credit-sub">
              <span className="nit-pill">NIT Bhopal</span>
              <a href="https://www.linkedin.com/in/ankitkumarazm" target="_blank" rel="noopener">
                <span className="linkedin-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.35-1.85 3.58 0 4.25 2.36 4.25 5.43v6.31zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
                  </svg>
                </span>
                LinkedIn — ankitkumarazm
              </a>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
