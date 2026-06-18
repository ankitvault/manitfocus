import React, { useState, useEffect, useRef } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  // Study states
  const [topics, setTopics] = useState([]);
  const [goalMinutes, setGoalMinutes] = useState(660);
  const [dailyLog, setDailyLog] = useState({});
  const [todayPlan, setTodayPlan] = useState([]);

  // Time ticking state for stopwatch accuracy
  const [nowTime, setNowTime] = useState(Date.now());

  // Refs for tracking values during synchronization
  const syncTimeoutRef = useRef(null);
  const latestStateRef = useRef({ topics, goalMinutes, dailyLog, todayPlan });

  // Update latest state ref whenever tracking states change
  useEffect(() => {
    latestStateRef.current = { topics, goalMinutes, dailyLog, todayPlan };
  }, [topics, goalMinutes, dailyLog, todayPlan]);

  // Stopwatch ticking interval
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Validate session on startup
  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Session expired');
        }

        const userData = await res.json();
        setUser(userData);

        // Fetch tracker data
        await fetchTrackerData(token);
      } catch (err) {
        console.error('Session verification error:', err);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [token]);

  const fetchTrackerData = async (authToken) => {
    try {
      const res = await fetch('/api/tracker', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setGoalMinutes(data.goalMinutes || 660);
        
        // Reset running status of topics loaded from DB to prevent visual glitch on reload
        const loadedTopics = (data.topics || []).map(t => ({
          ...t,
          running: false,
          startedAt: null
        }));
        setTopics(loadedTopics);
        setDailyLog(data.dailyLog || {});
        setTodayPlan(data.todayPlan || []);
      }
    } catch (err) {
      console.error('Error fetching tracker data:', err);
    }
  };

  const handleLoginSuccess = (userData, userToken) => {
    localStorage.setItem('token', userToken);
    setToken(userToken);
    setUser(userData);
    fetchTrackerData(userToken);
  };

  const handleLogout = () => {
    // Stop any running timers before logging out
    if (topics.some(t => t.running)) {
      const stoppedTopics = topics.map(t => {
        if (t.running) {
          const currentElapsed = t.seconds + (t.startedAt ? (Date.now() - t.startedAt) / 1000 : 0);
          return {
            ...t,
            seconds: currentElapsed,
            running: false,
            startedAt: null,
            lastEnd: Date.now()
          };
        }
        return t;
      });
      // Try to save final state to server synchronously using beacon or simple fetch before cleaning up
      fetch('/api/tracker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          goalMinutes,
          topics: stoppedTopics,
          dailyLog,
          todayPlan
        })
      }).catch(err => console.error(err));
    }

    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setTopics([]);
    setDailyLog({});
    setTodayPlan([]);
  };

  // Perform database sync (debounced API call)
  const saveState = (patch = {}) => {
    // Update local state first
    if (patch.topics !== undefined) setTopics(patch.topics);
    if (patch.goalMinutes !== undefined) setGoalMinutes(patch.goalMinutes);
    if (patch.dailyLog !== undefined) setDailyLog(patch.dailyLog);
    if (patch.todayPlan !== undefined) setTodayPlan(patch.todayPlan);

    // Merge changes with current state for immediate sync reference
    const nextState = {
      topics: patch.topics !== undefined ? patch.topics : latestStateRef.current.topics,
      goalMinutes: patch.goalMinutes !== undefined ? patch.goalMinutes : latestStateRef.current.goalMinutes,
      dailyLog: patch.dailyLog !== undefined ? patch.dailyLog : latestStateRef.current.dailyLog,
      todayPlan: patch.todayPlan !== undefined ? patch.todayPlan : latestStateRef.current.todayPlan
    };

    // Debounce the actual server write
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncToServer(nextState);
    }, 1500); // Wait 1.5 seconds after user stops interacting to sync to server
  };

  const syncToServer = async (state) => {
    if (!token) return;

    try {
      const res = await fetch('/api/tracker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(state)
      });
      if (!res.ok) {
        console.warn('API sync failed:', res.statusText);
      }
    } catch (err) {
      console.error('Network error syncing tracker data:', err);
    }
  };

  // Periodic autosave (every 30 seconds)
  useEffect(() => {
    const autosave = setInterval(() => {
      if (token && user) {
        // If a timer is running, calculate its live timing snapshot to sync
        const runningTopic = latestStateRef.current.topics.find(t => t.running);
        let topicsToSave = latestStateRef.current.topics;

        if (runningTopic) {
          topicsToSave = latestStateRef.current.topics.map(t => {
            if (t.id === runningTopic.id) {
              const currentElapsed = t.seconds + (t.startedAt ? (Date.now() - t.startedAt) / 1000 : 0);
              return {
                ...t,
                seconds: currentElapsed,
                startedAt: Date.now() // resets timing anchor for next snapshot
              };
            }
            return t;
          });
          setTopics(topicsToSave);
        }

        syncToServer({
          goalMinutes: latestStateRef.current.goalMinutes,
          topics: topicsToSave,
          dailyLog: latestStateRef.current.dailyLog,
          todayPlan: latestStateRef.current.todayPlan
        });
      }
    }, 30000);

    return () => clearInterval(autosave);
  }, [token, user]);

  // Sync on tab closed/reloaded
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (token && user) {
        const runningTopic = latestStateRef.current.topics.find(t => t.running);
        let topicsToSave = latestStateRef.current.topics;

        if (runningTopic) {
          topicsToSave = latestStateRef.current.topics.map(t => {
            if (t.id === runningTopic.id) {
              const currentElapsed = t.seconds + (t.startedAt ? (Date.now() - t.startedAt) / 1000 : 0);
              return {
                ...t,
                seconds: currentElapsed,
                running: false,
                startedAt: null,
                lastEnd: Date.now()
              };
            }
            return t;
          });
        }

        // Use synchronous Beacon API if possible, otherwise normal fetch (beforeunload might abort async fetch)
        const payload = JSON.stringify({
          goalMinutes: latestStateRef.current.goalMinutes,
          topics: topicsToSave,
          dailyLog: latestStateRef.current.dailyLog,
          todayPlan: latestStateRef.current.todayPlan
        });

        // Try standard fetch as backup
        fetch('/api/tracker', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: payload,
          keepalive: true // Crucial to allow requests to complete after page unloads
        }).catch(err => console.error(err));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [token, user]);

  if (loading) {
    return (
      <div className="auth-container">
        <div style={{ color: 'var(--indigo)', fontWeight: '700', fontSize: '18px', fontFamily: 'Space Grotesk' }}>
          Loading MANIT Focus...
        </div>
      </div>
    );
  }

  return !user ? (
    <Login onLoginSuccess={handleLoginSuccess} />
  ) : (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      topics={topics}
      setTopics={setTopics}
      goalMinutes={goalMinutes}
      setGoalMinutes={setGoalMinutes}
      dailyLog={dailyLog}
      setDailyLog={setDailyLog}
      todayPlan={todayPlan}
      setTodayPlan={setTodayPlan}
      saveState={saveState}
      nowTime={nowTime}
    />
  );
}
