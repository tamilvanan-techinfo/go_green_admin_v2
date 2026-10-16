import React, { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../Allocations/Ui";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  pageBg: "#edf0f7",
  cardBg: "#ffffff",
  border: "#e2e6ef",
  brandDark: "#1b3d2f",
  brandGreenText: "#22543d",
  activeChipBg: "#dcfce7",
  activeChipText: "#166534",
  accentText: "#16a34a",
  labelColor: "#6b7280",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
  inputBorder: "#d1d5db",
  inputBg: "#ffffff",
  presetActive: "#1b3d2f",
  presetActiveTxt: "#ffffff",
  presetIdle: "#f3f4f6",
  presetIdleTxt: "#374151",
  toggleOn: "#1b3d2f",
  alertSuccess: "#f0fdf4",
  alertError: "#fef2f2",
  alertWarning: "#fffbeb",
  alertSuccessText: "#166534",
  alertErrorText: "#991b1b",
  alertWarningText: "#92400e",
};

const BACKENDS = [
  {
    name: "django",
    title: "DC Meter Backend",
    port: 8000,
    configKey: "dc",
    module: "electricity_monitoring_be.application:application",
    iconLetter: "DC",
  },
  {
    name: "fastapi",
    title: "AC Meter Backend",
    port: 8001,
    configKey: "ac",
    module: "local_folder.main:app",
    iconLetter: "AC",
  },
];

const BAUD_RATES = [
  { value: 1200,   label: "1200 bps" },
  { value: 2400,   label: "2400 bps" },
  { value: 4800,   label: "4800 bps" },
  { value: 9600,   label: "9600 bps (Default)" },
  { value: 19200,  label: "19200 bps (Standard)" },
  { value: 38400,  label: "38400 bps" },
  { value: 57600,  label: "57600 bps" },
  { value: 115200, label: "115200 bps (High Speed)" },
];

const POLL_PRESETS_S = [1, 2, 5, 10];
const emptyConfig    = { port: "", baudRate: 9600, pollInterval: 1 };

// ─── localStorage keys ────────────────────────────────────────────────────────
const LS_STATUS_KEY   = "gg_backend_running_cache";
const LS_UPTIME_KEY   = "gg_backend_uptime";     // { [name]: startedAtMs }
const LS_LAST_RUN_KEY = "gg_backend_last_run";   // { [name]: durationMs }

const lsRead  = (key) => { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } };
const lsWrite = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

function readCache()   { return lsRead(LS_STATUS_KEY); }
function writeCache(s) {
  const slim = {};
  for (const [k, v] of Object.entries(s)) slim[k] = { running: v.running, healthy: v.healthy, pid: v.pid };
  lsWrite(LS_STATUS_KEY, slim);
}

// ─── Time formatters ──────────────────────────────────────────────────────────
function hmsFromMs(ms) {
  if (!ms || ms <= 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function hmsLive(startedAtMs) {
  return hmsFromMs(startedAtMs ? Date.now() - startedAtMs : 0);
}

// ─── useRunningTimer ──────────────────────────────────────────────────────────
// Tracks per-backend start timestamps (live) and last-run durations (stopped).
// Both survive screen switches via localStorage.
function useRunningTimer(statuses) {
  const [uptimes,  setUptimes]  = useState(() => lsRead(LS_UPTIME_KEY));
  const [lastRuns, setLastRuns] = useState(() => lsRead(LS_LAST_RUN_KEY));

  // Sync on every statuses change
  useEffect(() => {
    setUptimes((prevUp) => {
      setLastRuns((prevLR) => {
        const nextUp = { ...prevUp };
        const nextLR = { ...prevLR };
        let changedUp = false;
        let changedLR = false;

        for (const backend of BACKENDS) {
          const running = Boolean(statuses[backend.name]?.running);

          if (running && !nextUp[backend.name]) {
            // Just started — record start time
            nextUp[backend.name] = Date.now();
            changedUp = true;
          } else if (!running && nextUp[backend.name]) {
            // Just stopped — save duration, clear start time
            const durationMs = Date.now() - nextUp[backend.name];
            nextLR[backend.name] = durationMs;
            delete nextUp[backend.name];
            changedUp = true;
            changedLR = true;
          }
        }

        if (changedUp) lsWrite(LS_UPTIME_KEY,   nextUp);
        if (changedLR) lsWrite(LS_LAST_RUN_KEY, nextLR);

        return changedLR ? nextLR : prevLR;
      });

      // Return value set inside nested setLastRuns, so return placeholder;
      // the real nextUp is captured in the closure above.
      return prevUp; // will be overwritten below
    });

    // Cleaner pattern: do both updates outside the nested setState
    const prevUp = lsRead(LS_UPTIME_KEY);
    const prevLR = lsRead(LS_LAST_RUN_KEY);
    const nextUp = { ...prevUp };
    const nextLR = { ...prevLR };
    let changedUp = false;
    let changedLR = false;

    for (const backend of BACKENDS) {
      const running = Boolean(statuses[backend.name]?.running);
      if (running && !nextUp[backend.name]) {
        nextUp[backend.name] = Date.now();
        changedUp = true;
      } else if (!running && nextUp[backend.name]) {
        nextLR[backend.name] = Date.now() - nextUp[backend.name];
        delete nextUp[backend.name];
        changedUp = true;
        changedLR = true;
      }
    }

    if (changedUp) { lsWrite(LS_UPTIME_KEY,   nextUp); setUptimes(nextUp);  }
    if (changedLR) { lsWrite(LS_LAST_RUN_KEY, nextLR); setLastRuns(nextLR); }
  }, [statuses]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick every second while any backend is running
  const [, setTick] = useState(0);
  useEffect(() => {
    const anyRunning = Object.values(statuses).some((s) => s?.running);
    if (!anyRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [statuses]);

  return { uptimes, lastRuns };
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sx = {
  page: {
    height: "auto",
    background: C.pageBg,
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    padding: "28px 32px 80px",
    boxSizing: "border-box",
    textAlign: "left",
  },
  breadcrumb: {
    fontSize: 12, color: C.textSecondary,
    marginBottom: 6, display: "flex", alignItems: "center", gap: 4,
  },
  pageTitle:    { fontSize: 26, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px", textAlign: "left" },
  pageSubtitle: { fontSize: 13, color: C.textSecondary, margin: "0 0 20px", maxWidth: 560, textAlign: "left" },

  statusBar: {
    background: "#fff", border: `1px solid ${C.border}`,
    borderRadius: 10, padding: "10px 18px",
    display: "flex", alignItems: "center", gap: 10,
    marginBottom: 24, flexWrap: "wrap",
  },
  statusDot:    { width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 },
  statusLabel:  { fontSize: 13, fontWeight: 600, color: C.textPrimary },
  statusChip:   { fontSize: 11, fontWeight: 600, background: C.activeChipBg, color: C.activeChipText, borderRadius: 20, padding: "2px 10px" },
  statusActions:{ marginLeft: "auto", display: "flex", gap: 8 },

  btnGhost: {
    background: "none", border: `1px solid ${C.inputBorder}`, borderRadius: 8,
    padding: "6px 14px", fontSize: 12, fontWeight: 600, color: C.textPrimary,
    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
  },
  btnPrimary: {
    background: C.brandDark, border: "none", borderRadius: 8,
    padding: "6px 16px", fontSize: 12, fontWeight: 600, color: "#fff",
    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
  },

  cardsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },

  card:       { background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" },
  cardHeader: { padding: "18px 20px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  cardIconWrap: {
    width: 40, height: 40, borderRadius: 10, background: C.brandDark,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, color: "#fff", fontSize: 16, fontWeight: 800,
  },
  cardTitleRow: { flex: 1, minWidth: 0 },
  cardTitle:    { fontSize: 15, fontWeight: 700, color: C.textPrimary, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  activeBadge:  { fontSize: 11, fontWeight: 700, background: C.activeChipBg, color: C.activeChipText, borderRadius: 20, padding: "2px 10px", whiteSpace: "nowrap" },
  startingBadge:{ fontSize: 11, fontWeight: 700, background: "#fef9c3", color: "#854d0e", borderRadius: 20, padding: "2px 10px", whiteSpace: "nowrap" },
  cardSubtitle: { fontSize: 12, color: C.textSecondary, marginTop: 3 },
  daemonRow:    { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  daemonLabel:  { fontSize: 12, fontWeight: 500, color: C.textSecondary },

  toggle: (on, pending) => ({
    width: 44, height: 24, borderRadius: 12,
    background: on ? C.toggleOn : pending ? "#86efac" : "#d1d5db",
    border: "none", cursor: pending ? "wait" : "pointer", padding: 0,
    position: "relative", transition: "background 0.2s", flexShrink: 0,
    display: "inline-block", opacity: pending ? 0.75 : 1,
  }),
  toggleKnob: (on) => ({
    position: "absolute", top: 2, left: on ? 22 : 2,
    width: 20, height: 20, borderRadius: "50%",
    background: "#fff", transition: "left 0.2s", pointerEvents: "none",
  }),

  divider: { height: 1, background: C.border },

  // Uptime row — two variants: live (green tint) and last-run (neutral)
  uptimeRow: (live) => ({
    padding: "9px 20px",
    display: "flex", alignItems: "center", gap: 8,
    background: live ? "#f0fdf4" : "#f9fafb",
    borderBottom: `1px solid ${C.border}`,
  }),
  uptimeLabel: (live) => ({
    fontSize: 12, fontWeight: 500,
    color: live ? C.brandGreenText : C.textSecondary,
  }),
  uptimeValue: (live) => ({
    fontSize: 12, fontWeight: 700,
    color: live ? C.accentText : "#9ca3af",
    marginLeft: "auto",
    fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em",
  }),

  cardBody: { padding: "18px 20px 0" },

  fieldLabel: {
    fontSize: 12, fontWeight: 600, color: C.labelColor,
    marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  scanLink: {
    fontSize: 11, fontWeight: 600, color: C.accentText,
    background: "none", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", gap: 4, padding: 0,
  },
  portRow: { display: "flex", gap: 8, alignItems: "stretch" },
  select: {
    flex: 1, height: 38, border: `1px solid ${C.inputBorder}`,
    borderRadius: 8, padding: "0 12px", fontSize: 13, color: C.textPrimary,
    background: C.inputBg, appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
    cursor: "pointer", outline: "none",
  },
  detectBtn: {
    height: 38, padding: "0 14px", border: `1px solid ${C.inputBorder}`,
    borderRadius: 8, fontSize: 12, fontWeight: 600, color: C.brandGreenText,
    background: "#f0fdf4", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
    whiteSpace: "nowrap",
  },

  pollRow:  { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  pollInput:{
    width: 90, height: 38, border: `1px solid ${C.inputBorder}`,
    borderRadius: 8, padding: "0 12px", fontSize: 13, color: C.textPrimary,
    background: C.inputBg, outline: "none", MozAppearance: "textfield",
  },
  pollUnit: { fontSize: 12, color: C.textSecondary, fontWeight: 500 },

  presetsRow: { display: "flex", gap: 6, marginBottom: 18 },
  presetChip: (active) => ({
    height: 28, padding: "0 12px", borderRadius: 6, border: "none",
    background: active ? C.presetActive : C.presetIdle,
    color:      active ? C.presetActiveTxt : C.presetIdleTxt,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
  }),

  cardFooter: {
    padding: "14px 20px 18px",
    display: "flex", justifyContent: "flex-end", gap: 8,
    borderTop: `1px solid ${C.border}`, marginTop: 4,
  },
  footerBtn: {
    background: "none", border: `1px solid ${C.inputBorder}`, borderRadius: 8,
    padding: "7px 16px", fontSize: 12, fontWeight: 600, color: C.textPrimary,
    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
  },
  terminalBtn: {
    background: "#f8fafc", border: `1px solid ${C.inputBorder}`, borderRadius: 8,
    padding: "7px 16px", fontSize: 12, fontWeight: 600, color: "#475569",
    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
  },

  fieldGroup: { marginBottom: 16 },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function Toggle({ on, pending, onChange }) {
  return (
    <button style={sx.toggle(on, pending)} onClick={pending ? undefined : onChange} aria-pressed={on}>
      <span style={sx.toggleKnob(on || pending)} />
    </button>
  );
}

const IconRefresh = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconTerminal = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <polyline points="4 17 10 11 4 5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="19" x2="20" y2="19" strokeLinecap="round" />
  </svg>
);
const IconSearch = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" strokeLinecap="round" />
  </svg>
);
const IconClock = ({ color }) => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={color || "currentColor"} strokeWidth="2" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── UptimeRow ────────────────────────────────────────────────────────────────
function UptimeRow({ running, startedAtMs, lastRunMs }) {
  if (running) {
    return (
      <div style={sx.uptimeRow(true)}>
        <IconClock color={C.accentText} />
        <span style={sx.uptimeLabel(true)}>Uptime</span>
        <span style={sx.uptimeValue(true)}>{hmsLive(startedAtMs)}</span>
      </div>
    );
  }

  if (lastRunMs) {
    return (
      <div style={sx.uptimeRow(false)}>
        <IconClock color="#9ca3af" />
        <span style={sx.uptimeLabel(false)}>Last run</span>
        <span style={sx.uptimeValue(false)}>{hmsFromMs(lastRunMs)}</span>
      </div>
    );
  }

  // Never been run this session — show a faint "no data" hint
  return (
    <div style={sx.uptimeRow(false)}>
      <IconClock color="#d1d5db" />
      <span style={{ ...sx.uptimeLabel(false), color: "#d1d5db" }}>Last run</span>
      <span style={{ ...sx.uptimeValue(false), color: "#d1d5db" }}>—</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BackendSettings() {
  const toast = useToast();
  const [statuses, setStatuses] = useState(() => readCache());
  const [configs,  setConfigs]  = useState({ ac: { ...emptyConfig }, dc: { ...emptyConfig } });
  const [ports,    setPorts]    = useState([]);
  const [pythonMode]            = useState("venv");
  const [pendingToggle, setPendingToggle] = useState({});
  const [busy,     setBusy]     = useState({});

  const { uptimes, lastRuns } = useRunningTimer(statuses);

  const isBusy = Object.values(busy).some(Boolean);

  const runAction = async (key, action, successMsg) => {
    setBusy((p) => ({ ...p, [key]: true }));
    try {
      const result = await action();
      if (successMsg) toast(successMsg);
      return result;
    } catch (e) {
      toast(String(e), "error");
      return null;
    } finally {
      setBusy((p) => ({ ...p, [key]: false }));
    }
  };

  const applyStatuses = useCallback((result) => {
    const next = {};
    result.forEach((item) => { next[item.name] = item; });
    setStatuses(next);
    writeCache(next);
  }, []);

  const refreshStatuses = useCallback(async () => {
    try { applyStatuses(await invoke("backend_statuses")); } catch {}
  }, [applyStatuses]);

  const loadConfigs = useCallback(async () => {
    try {
      const result = await invoke("get_backend_configs");
      setConfigs({ ac: { ...emptyConfig, ...(result.ac || {}) }, dc: { ...emptyConfig, ...(result.dc || {}) } });
    } catch {}
  }, []);

  const scanPorts = useCallback(async () => {
    try {
      const result = await invoke("scan_serial_ports");
      setPorts(result);
      toast(result.length > 0
        ? `Found ${result.length} serial port${result.length !== 1 ? "s" : ""}: ${result.join(", ")}`
        : "No serial ports found.");
    } catch {}
  }, []);

  useEffect(() => {
    refreshStatuses();
    loadConfigs();
    const t = setInterval(refreshStatuses, 3000);
    return () => clearInterval(t);
  }, [refreshStatuses, loadConfigs]);

  const updateConfig = (key, field, value) =>
    setConfigs((p) => ({ ...p, [key]: { ...p[key], [field]: value } }));

  const toggleDaemon = async (backend) => {
    const currentlyRunning = Boolean(statuses[backend.name]?.running);
    setPendingToggle((p) => ({ ...p, [backend.name]: true }));
    setStatuses((prev) => {
      const next = { ...prev, [backend.name]: { ...(prev[backend.name] || {}), running: !currentlyRunning, healthy: false } };
      writeCache(next);
      return next;
    });
    try {
      if (currentlyRunning) {
        await invoke("stop_backend", { name: backend.name });
        toast(`${backend.title} stopped.`);
      } else {
        await invoke("save_backend_configs", { configs });
        toast(`${backend.title} starting… health check will update shortly.`);
        invoke("start_backend", { name: backend.name, pythonMode }).catch((e) => {
          toast(`Failed to start ${backend.title}: ${String(e)}`, "error");
          setStatuses((prev) => {
            const next = { ...prev, [backend.name]: { ...(prev[backend.name] || {}), running: false, healthy: false } };
            writeCache(next);
            return next;
          });
        });
      }
    } catch (e) {
      toast(`Backend action failed: ${String(e)}`, "error");
      setStatuses((prev) => {
        const next = { ...prev, [backend.name]: { ...(prev[backend.name] || {}), running: currentlyRunning } };
        writeCache(next);
        return next;
      });
    } finally {
      setPendingToggle((p) => ({ ...p, [backend.name]: false }));
      setTimeout(refreshStatuses, 800);
    }
  };

  const restartBackend = (backend) =>
    runAction(backend.name, async () => {
      await invoke("save_backend_configs", { configs });
      await invoke("stop_backend", { name: backend.name });
      return invoke("start_backend", { name: backend.name, pythonMode });
    }, `${backend.title} restarting…`).then(refreshStatuses);

  const restartAll = () =>
    runAction("all", async () => {
      await invoke("save_backend_configs", { configs });
      for (const b of BACKENDS) await invoke("stop_backend", { name: b.name });
      await Promise.all(BACKENDS.map((b) => invoke("start_backend", { name: b.name, pythonMode })));
    }, "All backends restarting…").then(refreshStatuses);

  const pingAll      = () => runAction("ping", refreshStatuses, "Status refreshed.");
  const openTerminal = (name) =>
    runAction(`term_${name}`, () => invoke("show_backend_terminal", { name }), "Terminal opened.");

  const totalHealthy = Object.values(statuses).filter((s) => s.healthy).length;

  return (
    <div style={sx.page}>
      <div style={sx.breadcrumb}><span>Backend Settings</span></div>
      <h1 style={sx.pageTitle}>Backend &amp; Infrastructure Settings</h1>
      <p style={sx.pageSubtitle}>
        Configure serial meters and manage independent backend processes for AC and DC meter acquisition.
      </p>

      {/* Status bar */}
      <div style={sx.statusBar}>
        <div style={sx.statusDot} />
        <span style={sx.statusLabel}>Modbus RTU Master Engine</span>
        <span style={sx.statusChip}>{totalHealthy} Active Pipeline{totalHealthy !== 1 ? "s" : ""}</span>
        <div style={sx.statusActions}>
          <button style={sx.btnGhost} onClick={pingAll} disabled={isBusy}>Ping All Busses</button>
          <button style={sx.btnPrimary} onClick={restartAll} disabled={isBusy}>
            <IconRefresh /> Restart All Meter Backends
          </button>
        </div>
      </div>

      {/* Cards */}
      <div style={sx.cardsGrid}>
        {BACKENDS.map((backend) => {
          const status  = statuses[backend.name];
          const config  = configs[backend.configKey];
          const running = Boolean(status?.running);
          const healthy = Boolean(status?.healthy);
          const pending = Boolean(pendingToggle[backend.name]);
          const loading = Boolean(busy[backend.name] || busy.all);
          const pid     = status?.pid;

          return (
            <div style={sx.card} key={backend.name}>
              {/* Header */}
              <div style={sx.cardHeader}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={sx.cardIconWrap}>{backend.iconLetter}</div>
                  <div style={sx.cardTitleRow}>
                    <div style={sx.cardTitle}>
                      {backend.title}
                      {running && healthy  && <span style={sx.activeBadge}>Active / Connected</span>}
                      {running && !healthy && <span style={sx.startingBadge}>Active / Starting</span>}
                    </div>
                    <div style={sx.cardSubtitle}>
                      {pid ? `Daemon PID: ${pid} · ` : ""}{backend.subtitle}
                    </div>
                  </div>
                </div>
                <div style={sx.daemonRow}>
                  <span style={sx.daemonLabel}>Daemon</span>
                  <Toggle on={running} pending={pending} onChange={() => toggleDaemon(backend)} />
                </div>
              </div>

              <div style={sx.divider} />

              {/* Uptime / Last-run row — always visible */}
              <UptimeRow
                running={running}
                startedAtMs={uptimes[backend.name]}
                lastRunMs={lastRuns[backend.name]}
              />

              {/* Body */}
              <div style={sx.cardBody}>
                {/* Serial / COM Port */}
                <div style={sx.fieldGroup}>
                  <div style={sx.fieldLabel}>
                    <span>Serial / COM Port</span>
                    <button style={sx.scanLink} onClick={scanPorts}>↺ Scan Ports</button>
                  </div>
                  <div style={sx.portRow}>
                    <select
                      style={sx.select}
                      value={config.port}
                      onChange={(e) => updateConfig(backend.configKey, "port", e.target.value)}
                    >
                      <option value="">— Select COM port —</option>
                      {config.port && !ports.includes(config.port) && (
                        <option value={config.port}>{config.port} (saved)</option>
                      )}
                      {ports.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button style={sx.detectBtn} onClick={scanPorts}>
                      <IconSearch /> Detect
                    </button>
                  </div>
                </div>

                {/* Baud Rate */}
                <div style={sx.fieldGroup}>
                  <div style={sx.fieldLabel}>Baud Rate</div>
                  <select
                    style={sx.select}
                    value={Number(config.baudRate)}
                    onChange={(e) => updateConfig(backend.configKey, "baudRate", Number(e.target.value))}
                  >
                    {BAUD_RATES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                {/* Polling Interval */}
                <div style={sx.fieldGroup}>
                  <div style={sx.fieldLabel}><span>Polling Interval</span></div>
                  <div style={sx.pollRow}>
                    <input
                      type="number"
                      style={sx.pollInput}
                      value={config.pollInterval}
                      min={1} max={3600} step={1}
                      onChange={(e) =>
                        updateConfig(backend.configKey, "pollInterval",
                          e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 1))
                      }
                    />
                    <span style={sx.pollUnit}>seconds</span>
                  </div>
                  <div style={sx.presetsRow}>
                    {POLL_PRESETS_S.map((p) => (
                      <button
                        key={p}
                        style={sx.presetChip(Number(config.pollInterval) === p)}
                        onClick={() => updateConfig(backend.configKey, "pollInterval", p)}
                      >
                        {p}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={sx.cardFooter}>
                <button
                  style={{ ...sx.terminalBtn, opacity: busy[`term_${backend.name}`] ? 0.6 : 1 }}
                  disabled={busy[`term_${backend.name}`]}
                  onClick={() => openTerminal(backend.name)}
                >
                  <IconTerminal /> Open Terminal
                </button>
                <button
                  style={{ ...sx.footerBtn, opacity: loading ? 0.6 : 1 }}
                  disabled={loading}
                  onClick={() => restartBackend(backend)}
                >
                  <IconRefresh /> Restart {backend.name === "django" ? "AC" : "DC"} Daemon
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

