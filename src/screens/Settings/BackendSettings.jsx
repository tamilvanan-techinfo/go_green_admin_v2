import React, { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Box,
  Button,
  Chip,
  Divider,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  RefreshRounded,
  TerminalRounded,
  SearchRounded,
  AccessTimeRounded,
  TimerOutlined,
  SyncAltRounded,
  SwapHorizRounded,
} from "@mui/icons-material";

import { useToast } from "../Allocations/Ui";
import { tokens, studioSx } from "../../core/theme";

// ─── Config ───────────────────────────────────────────────────────────────────
const BTN_H = 32;

const BACKENDS = [
  {
    name: "django",
    title: "DC Meter Backend",
    short: "DC",
    port: 8000,
    configKey: "dc",
    module: "electricity_monitoring_be.application:application",
    iconLetter: "DC",
  },
  {
    name: "fastapi",
    title: "AC Meter Backend",
    short: "AC",
    port: 8001,
    configKey: "ac",
    module: "local_folder.main:app",
    iconLetter: "AC",
  },
];

const BAUD_RATES = [
  { value: 1200, label: "1200 bps" },
  { value: 2400, label: "2400 bps" },
  { value: 4800, label: "4800 bps" },
  { value: 9600, label: "9600 bps (Default)" },
  { value: 19200, label: "19200 bps (Standard)" },
  { value: 38400, label: "38400 bps" },
  { value: 57600, label: "57600 bps" },
  { value: 115200, label: "115200 bps (High Speed)" },
];

const POLL_PRESETS_S = [1, 2, 5, 10];
const emptyConfig = { port: "", baudRate: 9600, pollInterval: 1 };

// ─── localStorage ─────────────────────────────────────────────────────────────
const LS_STATUS_KEY = "gg_backend_running_cache";
const LS_UPTIME_KEY = "gg_backend_uptime"; // { [name]: startedAtMs }
const LS_LAST_RUN_KEY = "gg_backend_last_run"; // { [name]: durationMs }
const LS_TODAY_KEY = "gg_backend_today"; // { date, ms: { [name]: runtimeMs } }

const lsRead = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
};
const lsWrite = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
};

function readCache() {
  return lsRead(LS_STATUS_KEY);
}
function writeCache(s) {
  const slim = {};
  for (const [k, v] of Object.entries(s)) {
    slim[k] = { running: v.running, healthy: v.healthy, pid: v.pid };
  }
  lsWrite(LS_STATUS_KEY, slim);
}

// ─── Time formatters ──────────────────────────────────────────────────────────
function hmsFromMs(ms) {
  if (!ms || ms <= 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0)
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function hmsLive(startedAtMs) {
  return hmsFromMs(startedAtMs ? Date.now() - startedAtMs : 0);
}

// Short form for the status bar: "2h 05m", "5m", "0m"
function hmShort(ms) {
  const totalMin = Math.floor((ms || 0) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m`;
}

// 1 / seconds → "0.5 Hz"
function formatRate(seconds) {
  const n = Number(seconds);
  if (!n || n <= 0) return "—";
  return `${parseFloat((1 / n).toFixed(2))} Hz`;
}

// ─── useRunningTimer ──────────────────────────────────────────────────────────
// Per-backend start timestamps (live) and last-run durations (stopped).
function useRunningTimer(statuses) {
  const [uptimes, setUptimes] = useState(() => lsRead(LS_UPTIME_KEY));
  const [lastRuns, setLastRuns] = useState(() => lsRead(LS_LAST_RUN_KEY));

  useEffect(() => {
    const nextUp = { ...lsRead(LS_UPTIME_KEY) };
    const nextLR = { ...lsRead(LS_LAST_RUN_KEY) };
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

    if (changedUp) {
      lsWrite(LS_UPTIME_KEY, nextUp);
      setUptimes(nextUp);
    }
    if (changedLR) {
      lsWrite(LS_LAST_RUN_KEY, nextLR);
      setLastRuns(nextLR);
    }
  }, [statuses]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const anyRunning = Object.values(statuses).some((s) => s?.running);
    if (!anyRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [statuses]);

  return { uptimes, lastRuns };
}

// ─── useTodayRuntime ──────────────────────────────────────────────────────────
// Accumulates how long each backend has run TODAY, per backend.
// Stored under the date, so it resets by itself when the date changes.
const dayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

function loadToday() {
  const saved = lsRead(LS_TODAY_KEY);
  return saved.date === dayKey() ? saved : { date: dayKey(), ms: {} };
}

function useTodayRuntime(statuses) {
  const [today, setToday] = useState(loadToday);
  const statusesRef = useRef(statuses);
  statusesRef.current = statuses;

  useEffect(() => {
    let last = Date.now();

    const id = setInterval(() => {
      const now = Date.now();
      // Cap the step so a sleeping laptop doesn't add hours in one tick
      const delta = Math.min(now - last, 5000);
      last = now;

      setToday((prev) => {
        const key = dayKey();
        const base = prev.date === key ? prev : { date: key, ms: {} };
        let changed = base !== prev;
        const ms = { ...base.ms };

        for (const b of BACKENDS) {
          if (statusesRef.current[b.name]?.running) {
            ms[b.name] = (ms[b.name] || 0) + delta;
            changed = true;
          }
        }

        if (!changed) return prev;
        const next = { date: base.date, ms };
        lsWrite(LS_TODAY_KEY, next);
        return next;
      });
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return today.ms;
}

// ─── Shared style blocks ──────────────────────────────────────────────────────
const buttonSx = {
  height: BTN_H,
  minHeight: BTN_H,
  boxSizing: "border-box",
  alignSelf: "center",
  whiteSpace: "nowrap",
  flexShrink: 0,
  px: 1.75,
  py: 0,
  "& .MuiButton-startIcon": { mr: 0.75 },
};

const fieldLabelSx = {
  fontFamily: tokens.mono,
  fontWeight: 700,
  fontSize: "0.65rem",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: tokens.textLightSecondary,
};

const TONES = {
  success: { color: "#047857", bg: "#ECFDF5", border: "#6EE7B7" },
  warning: { color: "#92400E", bg: "#FEF3C7", border: "#FCD34D" },
  error: { color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5" },
};

function StatusChip({ label, tone = "success" }) {
  const t = TONES[tone];
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 26,
        boxSizing: "border-box",
        alignSelf: "center",
        m: 0,
        borderRadius: "6px",
        fontSize: "10px",
        fontWeight: 700,
        lineHeight: 1,
        color: t.color,
        backgroundColor: t.bg,
        border: `1px solid ${t.border}`,
        "& .MuiChip-label": { px: 1, py: 0, lineHeight: 1 },
      }}
    />
  );
}

// Reference-style stat:  [icon]  Label: value
function StatPill({ icon, label, children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
      <Box sx={{ display: "flex", color: tokens.textLightSecondary }}>
        {icon}
      </Box>
      <Typography
        sx={{
          fontFamily: tokens.mono,
          fontSize: "0.7rem",
          color: tokens.textLightSecondary,
          whiteSpace: "nowrap",
        }}
      >
        {label}:
      </Typography>
      {children}
    </Box>
  );
}

const statValueSx = {
  fontFamily: tokens.mono,
  fontSize: "0.7rem",
  fontWeight: 700,
  color: tokens.ink,
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
};

function VDivider() {
  return (
    <Box
      sx={{
        width: "1px",
        height: 22,
        bgcolor: tokens.lineLight,
        display: { xs: "none", md: "block" },
      }}
    />
  );
}

// ─── UptimeRow ────────────────────────────────────────────────────────────────
function UptimeRow({ running, startedAtMs, lastRunMs, todayMs }) {
  const live = running;
  const muted = !running && !lastRunMs;

  const label = live ? "Uptime" : "Last run";
  const value = live
    ? hmsLive(startedAtMs)
    : lastRunMs
      ? hmsFromMs(lastRunMs)
      : "—";

  const iconColor = live ? tokens.brandAccent : muted ? "#CBD5E1" : "#94A3B8";

  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.1,
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        columnGap: 2,
        rowGap: 0.5,
        bgcolor: live ? "#F0FDF4" : tokens.surface,
        borderBottom: `1px solid ${tokens.lineLight}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AccessTimeRounded sx={{ fontSize: 15, color: iconColor }} />
        <Typography
          sx={{
            fontFamily: tokens.mono,
            fontSize: "0.68rem",
            fontWeight: 600,
            color: live
              ? tokens.brand
              : muted
                ? "#CBD5E1"
                : tokens.textLightSecondary,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontFamily: tokens.mono,
            fontSize: "0.72rem",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: live ? tokens.brandAccent : muted ? "#CBD5E1" : "#94A3B8",
          }}
        >
          {value}
        </Typography>
      </Box>

      <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
        <Typography
          sx={{
            fontFamily: tokens.mono,
            fontSize: "0.68rem",
            fontWeight: 600,
            color: tokens.textLightSecondary,
          }}
        >
          Today
        </Typography>
        <Typography
          sx={{
            fontFamily: tokens.mono,
            fontSize: "0.72rem",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: tokens.ink,
          }}
        >
          {hmShort(todayMs)}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BackendSettings() {
  const toast = useToast();

  const [statuses, setStatuses] = useState(() => readCache());
  const [configs, setConfigs] = useState({
    ac: { ...emptyConfig },
    dc: { ...emptyConfig },
  });
  const [ports, setPorts] = useState([]);
  const [pythonMode] = useState("venv");
  const [pendingToggle, setPendingToggle] = useState({});
  const [busy, setBusy] = useState({});

  const { uptimes, lastRuns } = useRunningTimer(statuses);
  const todayMs = useTodayRuntime(statuses);

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
    result.forEach((item) => {
      next[item.name] = item;
    });
    setStatuses(next);
    writeCache(next);
  }, []);

  const refreshStatuses = useCallback(async () => {
    try {
      applyStatuses(await invoke("backend_statuses"));
    } catch {}
  }, [applyStatuses]);

  const loadConfigs = useCallback(async () => {
    try {
      const result = await invoke("get_backend_configs");
      setConfigs({
        ac: { ...emptyConfig, ...(result.ac || {}) },
        dc: { ...emptyConfig, ...(result.dc || {}) },
      });
    } catch {}
  }, []);

  const scanPorts = useCallback(async () => {
    try {
      const result = await invoke("scan_serial_ports");
      setPorts(result);
      toast(
        result.length > 0
          ? `Found ${result.length} serial port${
              result.length !== 1 ? "s" : ""
            }: ${result.join(", ")}`
          : "No serial ports found."
      );
    } catch {}
  }, [toast]);

  useEffect(() => {
    refreshStatuses();
    loadConfigs();
    scanPorts();
    const t = setInterval(refreshStatuses, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshStatuses, loadConfigs]);

  const updateConfig = (key, field, value) =>
    setConfigs((p) => ({ ...p, [key]: { ...p[key], [field]: value } }));

  const toggleDaemon = async (backend) => {
    const currentlyRunning = Boolean(statuses[backend.name]?.running);
    setPendingToggle((p) => ({ ...p, [backend.name]: true }));
    setStatuses((prev) => {
      const next = {
        ...prev,
        [backend.name]: {
          ...(prev[backend.name] || {}),
          running: !currentlyRunning,
          healthy: false,
        },
      };
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
        invoke("start_backend", { name: backend.name, pythonMode }).catch(
          (e) => {
            toast(`Failed to start ${backend.title}: ${String(e)}`, "error");
            setStatuses((prev) => {
              const next = {
                ...prev,
                [backend.name]: {
                  ...(prev[backend.name] || {}),
                  running: false,
                  healthy: false,
                },
              };
              writeCache(next);
              return next;
            });
          }
        );
      }
    } catch (e) {
      toast(`Backend action failed: ${String(e)}`, "error");
      setStatuses((prev) => {
        const next = {
          ...prev,
          [backend.name]: {
            ...(prev[backend.name] || {}),
            running: currentlyRunning,
          },
        };
        writeCache(next);
        return next;
      });
    } finally {
      setPendingToggle((p) => ({ ...p, [backend.name]: false }));
      setTimeout(refreshStatuses, 800);
    }
  };

  const restartBackend = (backend) =>
    runAction(
      backend.name,
      async () => {
        await invoke("save_backend_configs", { configs });
        await invoke("stop_backend", { name: backend.name });
        return invoke("start_backend", { name: backend.name, pythonMode });
      },
      `${backend.title} restarting…`
    ).then(refreshStatuses);

  const restartAll = () =>
    runAction(
      "all",
      async () => {
        await invoke("save_backend_configs", { configs });
        for (const b of BACKENDS) await invoke("stop_backend", { name: b.name });
        await Promise.all(
          BACKENDS.map((b) =>
            invoke("start_backend", { name: b.name, pythonMode })
          )
        );
      },
      "All backends restarting…"
    ).then(refreshStatuses);

  const pingAll = () => runAction("ping", refreshStatuses, "Status refreshed.");
  const openTerminal = (name) =>
    runAction(
      `term_${name}`,
      () => invoke("show_backend_terminal", { name }),
      "Terminal opened."
    );

  const totalHealthy = Object.values(statuses).filter((s) => s.healthy).length;
  const combinedTodayMs = BACKENDS.reduce(
    (sum, b) => sum + (todayMs[b.name] || 0),
    0
  );

  return (
    <Box sx={{ width: "100%", minWidth: 0, pb: 1 }}>
      {/* Page header */}
      <Box sx={{ mb: 2 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: "1.05rem",
            color: tokens.ink,
            mb: 0.5,
            textAlign: "left",
          }}
        >
          Backend &amp; Infrastructure Settings
        </Typography>

        <Typography sx={{ ...studioSx.secondaryText, maxWidth: 560 }}>
          Configure serial meters and manage independent backend processes for
          AC and DC meter acquisition.
        </Typography>
      </Box>

      {/* Status bar (taller, reference-style stats) */}
      <Box
        sx={{
          ...studioSx.card,
          px: 2.5,
          py: 2.25,
          minHeight: 76,
          mb: 2.5,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          columnGap: 2,
          rowGap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              bgcolor: tokens.brandAccent,
              flexShrink: 0,
            }}
          />
          <Typography sx={{ ...studioSx.cardTitle, fontSize: "0.88rem" }}>
            Modbus RTU Master Engine
          </Typography>
          <StatusChip
            label={`${totalHealthy} Active Pipeline${
              totalHealthy !== 1 ? "s" : ""
            }`}
          />
        </Box>

        <VDivider />

        <StatPill icon={<SyncAltRounded sx={{ fontSize: 16 }} />} label="Runtime Today">
          <Typography sx={statValueSx}>{hmShort(combinedTodayMs)}</Typography>
        </StatPill>

        <VDivider />

        <StatPill icon={<SwapHorizRounded sx={{ fontSize: 16 }} />} label="By Server">
          {BACKENDS.map((b, i) => (
            <Box key={b.name} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {i > 0 && (
                <Typography sx={{ ...statValueSx, color: tokens.textLightSecondary }}>
                  ·
                </Typography>
              )}
              <Typography
                sx={{
                  fontFamily: tokens.mono,
                  fontSize: "0.7rem",
                  color: tokens.textLightSecondary,
                }}
              >
                {b.short}
              </Typography>
              <Typography sx={statValueSx}>{hmShort(todayMs[b.name])}</Typography>
            </Box>
          ))}
        </StatPill>

        <Box
          sx={{
            ml: { xs: 0, md: "auto" },
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Button
            variant="outlined"
            onClick={pingAll}
            disabled={isBusy}
            sx={buttonSx}
          >
            Ping All Busses
          </Button>

          <Button
            variant="contained"
            startIcon={<RefreshRounded sx={{ fontSize: 16 }} />}
            onClick={restartAll}
            disabled={isBusy}
            sx={buttonSx}
          >
            Restart All Meter Backends
          </Button>
        </Box>
      </Box>

      {/* Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "repeat(2, minmax(0, 1fr))",
          },
          gap: 2,
          alignItems: "start",
        }}
      >
        {BACKENDS.map((backend) => {
          const status = statuses[backend.name];
          const config = configs[backend.configKey];
          const running = Boolean(status?.running);
          const healthy = Boolean(status?.healthy);
          const pending = Boolean(pendingToggle[backend.name]);
          const loading = Boolean(busy[backend.name] || busy.all);
          const pid = status?.pid;

          return (
            <Box
              key={backend.name}
              sx={{ ...studioSx.card, overflow: "hidden", minWidth: 0 }}
            >
              {/* Header */}
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      ...studioSx.iconTile,
                      width: 40,
                      height: 40,
                      fontFamily: tokens.mono,
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    {backend.iconLetter}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 1,
                      }}
                    >
                      <Typography fontWeight={700} fontSize={15}>
                        {backend.title}
                      </Typography>

                      {running && healthy && (
                        <StatusChip label="Active / Connected" tone="success" />
                      )}
                      {running && !healthy && (
                        <StatusChip label="Active / Starting" tone="warning" />
                      )}
                    </Box>

                    <Typography
                      sx={{
                        ...studioSx.secondaryText,
                        fontFamily: tokens.mono,
                        fontSize: "0.65rem",
                        mt: 0.5,
                      }}
                    >
                      {pid ? `Daemon PID: ${pid} · ` : ""}Port {backend.port}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    flexShrink: 0,
                  }}
                >
                  <Typography sx={studioSx.secondaryText}>Daemon</Typography>
                  <Switch
                    checked={running}
                    disabled={pending}
                    onChange={() => toggleDaemon(backend)}
                    inputProps={{ "aria-label": `${backend.title} daemon` }}
                  />
                </Box>
              </Box>

              <Divider />

              {/* Uptime / Last run + Today */}
              <UptimeRow
                running={running}
                startedAtMs={uptimes[backend.name]}
                lastRunMs={lastRuns[backend.name]}
                todayMs={todayMs[backend.name]}
              />

              {/* Body */}
              <Box
                sx={{
                  px: 2.5,
                  pt: 2.25,
                  pb: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {/* Serial / COM Port */}
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 0.75,
                    }}
                  >
                    <Typography sx={fieldLabelSx}>Serial / COM Port</Typography>

                    <Button
                      onClick={scanPorts}
                      sx={{
                        minHeight: 0,
                        height: 22,
                        p: 0,
                        minWidth: 0,
                        fontFamily: tokens.mono,
                        fontSize: "0.65rem",
                        color: tokens.brandAccent,
                        "&:hover": { bgcolor: "transparent", opacity: 0.8 },
                      }}
                    >
                      ↺ Scan Ports
                    </Button>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={config.port}
                      onChange={(e) =>
                        updateConfig(backend.configKey, "port", e.target.value)
                      }
                      slotProps={{ select: { displayEmpty: true } }}
                    >
                      <MenuItem value="">— Select COM port —</MenuItem>

                      {config.port && !ports.includes(config.port) && (
                        <MenuItem value={config.port}>
                          {config.port} (saved)
                        </MenuItem>
                      )}

                      {ports.map((p) => (
                        <MenuItem key={p} value={p}>
                          {p}
                        </MenuItem>
                      ))}
                    </TextField>

                    <Button
                      variant="outlined"
                      startIcon={<SearchRounded sx={{ fontSize: 16 }} />}
                      onClick={scanPorts}
                      sx={{ ...buttonSx, height: 38, minHeight: 38 }}
                    >
                      Detect
                    </Button>
                  </Box>
                </Box>

                {/* Baud Rate */}
                <Box>
                  <Typography sx={{ ...fieldLabelSx, mb: 0.75 }}>
                    Baud Rate
                  </Typography>

                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={Number(config.baudRate)}
                    onChange={(e) =>
                      updateConfig(
                        backend.configKey,
                        "baudRate",
                        Number(e.target.value)
                      )
                    }
                  >
                    {BAUD_RATES.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                {/* Polling Interval */}
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      mb: 0.75,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <TimerOutlined
                        sx={{ fontSize: 15, color: tokens.textLightSecondary }}
                      />
                      <Typography sx={fieldLabelSx}>Polling Interval</Typography>
                    </Box>

                    <Typography
                      sx={{
                        fontFamily: tokens.mono,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: tokens.brand,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {config.pollInterval === ""
                        ? "—"
                        : `${config.pollInterval} s`}{" "}
                      ({formatRate(config.pollInterval)} Rate)
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 1,
                    }}
                  >
                    <TextField
                      type="number"
                      size="small"
                      value={config.pollInterval}
                      onChange={(e) =>
                        updateConfig(
                          backend.configKey,
                          "pollInterval",
                          e.target.value === ""
                            ? ""
                            : Math.max(1, parseInt(e.target.value, 10) || 1)
                        )
                      }
                      slotProps={{
                        htmlInput: { min: 1, max: 3600, step: 1 },
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <Typography
                                sx={{
                                  fontFamily: tokens.mono,
                                  fontSize: "0.7rem",
                                  color: tokens.textLightSecondary,
                                }}
                              >
                                s
                              </Typography>
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{
                        flex: "1 1 140px",
                        minWidth: 0,
                        "& input": {
                          fontFamily: tokens.mono,
                          fontSize: "0.8rem",
                        },
                      }}
                    />

                    <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
                      {POLL_PRESETS_S.map((p) => {
                        const active = Number(config.pollInterval) === p;
                        return (
                          <Button
                            key={p}
                            onClick={() =>
                              updateConfig(backend.configKey, "pollInterval", p)
                            }
                            sx={{
                              height: 38,
                              minHeight: 38,
                              minWidth: 52,
                              px: 1.5,
                              py: 0,
                              borderRadius: "8px",
                              fontFamily: tokens.mono,
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              border: `1px solid ${
                                active ? tokens.brand : tokens.border
                              }`,
                              color: active ? "#fff" : tokens.ink,
                              bgcolor: active ? tokens.brand : "#F1F5F9",
                              "&:hover": {
                                bgcolor: active ? tokens.brandHover : "#E2E8F0",
                              },
                            }}
                          >
                            {p}s
                          </Button>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Footer */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.75,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Button
                  variant="outlined"
                  startIcon={<TerminalRounded sx={{ fontSize: 16 }} />}
                  disabled={Boolean(busy[`term_${backend.name}`])}
                  onClick={() => openTerminal(backend.name)}
                  sx={buttonSx}
                >
                  Open Terminal
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<RefreshRounded sx={{ fontSize: 16 }} />}
                  disabled={loading}
                  onClick={() => restartBackend(backend)}
                  sx={buttonSx}
                >
                  Restart {backend.configKey.toUpperCase()} Daemon
                </Button>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}