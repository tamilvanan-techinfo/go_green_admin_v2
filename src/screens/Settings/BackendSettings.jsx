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
import api from "../../config.json";

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
    readControlUrl: `${api.apiBase}/api/update-mode/`,
  },
  {
    name: "fastapi",
    title: "AC Meter Backend",
    short: "AC",
    port: 8001,
    configKey: "ac",
    module: "local_folder.main:app",
    iconLetter: "AC",
    readControlUrl: `${api.file_manager_api}/api/update-mode/`,
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

const emptyConfig = {
  port: "",
  baudRate: 9600,
  pollInterval: 1,
  enabled: false,
};

// ─── localStorage ─────────────────────────────────────────────────────────────
const LS_STATUS_KEY = "gg_backend_running_cache";
const LS_UPTIME_KEY = "gg_backend_uptime";
const LS_LAST_RUN_KEY = "gg_backend_last_run";
const LS_TODAY_KEY = "gg_backend_today";
const LS_READCONTROL_KEY = "gg_backend_readcontrol_cache";

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

function writeCache(statuses) {
  const slim = {};

  for (const [key, value] of Object.entries(statuses)) {
    slim[key] = {
      running: value.running,
      healthy: value.healthy,
      pid: value.pid,
    };
  }

  lsWrite(LS_STATUS_KEY, slim);
}

// ─── readControls cache ───────────────────────────────────────────────────────
function readReadControlCache() {
  const cached = lsRead(LS_READCONTROL_KEY);

  return {
    django: {
      enabled: Boolean(cached.django?.enabled),
      loading: true,
      saving: false,
    },
    fastapi: {
      enabled: Boolean(cached.fastapi?.enabled),
      loading: true,
      saving: false,
    },
  };
}

function writeReadControlCache(readControls) {
  const slim = {};

  for (const [key, value] of Object.entries(readControls)) {
    slim[key] = { enabled: Boolean(value.enabled) };
  }

  lsWrite(LS_READCONTROL_KEY, slim);
}

// ─── Time formatters ──────────────────────────────────────────────────────────
function hmsFromMs(ms) {
  if (!ms || ms <= 0) return "—";

  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (h > 0) {
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(
      2,
      "0"
    )}s`;
  }

  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;

  return `${s}s`;
}

function hmsLive(startedAtMs) {
  return hmsFromMs(startedAtMs ? Date.now() - startedAtMs : 0);
}

function hmShort(ms) {
  const totalMin = Math.floor((ms || 0) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;

  return `${m}m`;
}

function formatRate(seconds) {
  const n = Number(seconds);
  if (!n || n <= 0) return "—";

  return `${parseFloat((1 / n).toFixed(2))} Hz`;
}

// ─── useRunningTimer ──────────────────────────────────────────────────────────
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
const dayKey = () => {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
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
      const delta = Math.min(now - last, 5000);

      last = now;

      setToday((prev) => {
        const key = dayKey();
        const base = prev.date === key ? prev : { date: key, ms: {} };

        let changed = base !== prev;
        const ms = { ...base.ms };

        for (const backend of BACKENDS) {
          if (statusesRef.current[backend.name]?.running) {
            ms[backend.name] = (ms[backend.name] || 0) + delta;
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

// ─── Shared styles ────────────────────────────────────────────────────────────
const buttonSx = {
  height: { xs: 38, lg: 32, xl: 36 },
  minHeight: { xs: 38, lg: 32, xl: 36 },
  boxSizing: "border-box",
  alignSelf: "center",
  whiteSpace: "nowrap",
  flexShrink: 0,
  px: { xs: 1.25, lg: 1.5, xl: 1.75 },
  py: 0,
  fontSize: { xs: "0.72rem", lg: "0.68rem", xl: "0.75rem" },
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
  success: {
    color: "#047857",
    bg: "#ECFDF5",
    border: "#6EE7B7",
  },
  warning: {
    color: "#92400E",
    bg: "#FEF3C7",
    border: "#FCD34D",
  },
  error: {
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FCA5A5",
  },
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
        "& .MuiChip-label": {
          px: 1,
          py: 0,
          lineHeight: 1,
        },
      }}
    />
  );
}

function StatPill({ icon, label, children }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        minWidth: 0,
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ display: "flex", color: tokens.textLightSecondary }}>
        {icon}
      </Box>

      <Typography
        sx={{
          fontFamily: tokens.mono,
          fontSize: { xs: "0.68rem", lg: "0.65rem", xl: "0.7rem" },
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
  fontSize: { xs: "0.68rem", lg: "0.65rem", xl: "0.7rem" },
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
        display: { xs: "none", lg: "block" },
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

  const iconColor = live
    ? tokens.brandAccent
    : muted
      ? "#CBD5E1"
      : "#94A3B8";

  return (
    <Box
      sx={{
        px: { xs: 1.75, lg: 2, xl: 2.5 },
        py: { xs: 1.25, lg: 1, xl: 1.1 },
        display: "flex",
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        flexWrap: "wrap",
        columnGap: 1.5,
        rowGap: 0.75,
        bgcolor: live ? "#F0FDF4" : tokens.surface,
        borderBottom: `1px solid ${tokens.lineLight}`,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 0.75, lg: 1 },
          minWidth: 0,
          flexWrap: "wrap",
        }}
      >
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
            color: live
              ? tokens.brandAccent
              : muted
                ? "#CBD5E1"
                : "#94A3B8",
          }}
        >
          {value}
        </Typography>
      </Box>

      <Box
        sx={{
          ml: { xs: 0, sm: "auto" },
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
        }}
      >
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

// ─── Modbus control helpers ───────────────────────────────────────────────────
const getInitialReadControls = () => readReadControlCache();

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

  const [readControls, setReadControls] = useState(getInitialReadControls);

  const pendingToggleRef = useRef({});
  useEffect(() => {
    pendingToggleRef.current = pendingToggle;
  }, [pendingToggle]);

  const { uptimes, lastRuns } = useRunningTimer(statuses);
  const todayMs = useTodayRuntime(statuses);

  const isBusy = Object.values(busy).some(Boolean);

  const runAction = async (key, action, successMsg) => {
    setBusy((prev) => ({ ...prev, [key]: true }));

    try {
      const result = await action();

      if (successMsg) toast(successMsg);

      return result;
    } catch (e) {
      toast(String(e), "error");
      return null;
    } finally {
      setBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  const applyStatuses = useCallback((result) => {
    const incoming = {};

    result.forEach((item) => {
      incoming[item.name] = item;
    });

    setStatuses((prev) => {
      const next = { ...prev, ...incoming };

      for (const name of Object.keys(incoming)) {
        const toggledRecently = Boolean(pendingToggleRef.current[name]);
        const incomingSaysNotRunning = !incoming[name]?.running;
        const weOptimisticallySetRunning = Boolean(prev[name]?.running);

        if (
          toggledRecently &&
          incomingSaysNotRunning &&
          weOptimisticallySetRunning
        ) {
          next[name] = prev[name];
        }
      }

      writeCache(next);
      return next;
    });
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
    } catch (e) {
      toast(String(e), "error");
    }
  }, [toast]);

  const loadReadControl = useCallback(
    async (backend) => {
      setReadControls((prev) => {
        const next = {
          ...prev,
          [backend.name]: {
            ...prev[backend.name],
            loading: true,
          },
        };
        return next;
      });

      try {
        const response = await fetch(
          `${backend.readControlUrl}?meter=${backend.short}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          }
        );

        if (!response.ok) {
          throw new Error(
            `${backend.short} Modbus status request failed (HTTP ${response.status})`
          );
        }

        const data = await response.json();

        setReadControls((prev) => {
          const next = {
            ...prev,
            [backend.name]: {
              ...prev[backend.name],
              enabled: Boolean(
                data.mode ??
                  data.data?.mode ??
                  data.read_enabled ??
                  data.data?.read_enabled
              ),
              loading: false,
            },
          };
          writeReadControlCache(next);
          return next;
        });
      } catch (e) {
        console.error(`Failed to load ${backend.short} Modbus status:`, e);

        setReadControls((prev) => ({
          ...prev,
          [backend.name]: {
            ...prev[backend.name],
            loading: false,
          },
        }));

        toast(`Unable to load ${backend.short} Modbus status.`, "error");
      }
    },
    [toast]
  );

  const handleReadControlToggle = useCallback(
    async (backend, nextEnabled) => {
      const isRunning = Boolean(statuses[backend.name]?.running);
      if (readControls[backend.name]?.saving) return;

      if (!isRunning) {
        toast(
          `Start the ${backend.short} Meter Backend before enabling Modbus reading.`,
          "error"
        );
        return;
      }

      setReadControls((prev) => ({
        ...prev,
        [backend.name]: {
          ...prev[backend.name],
          saving: true,
        },
      }));

      try {
        const response = await fetch(backend.readControlUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            meter: backend.short,
            mode: nextEnabled,
          }),
        });

        if (!response.ok) {
          let errorMessage = `${backend.short} Modbus request failed (HTTP ${response.status})`;

          try {
            const errorData = await response.json();
            if (errorData.detail) errorMessage = errorData.detail;
            if (errorData.error) errorMessage = errorData.error;
          } catch {}

          throw new Error(errorMessage);
        }

        let data = {};

        try {
          data = await response.json();
        } catch {}

        setReadControls((prev) => {
          const next = {
            ...prev,
            [backend.name]: {
              ...prev[backend.name],
              enabled:
                typeof (data.mode ??
                  data.data?.mode ??
                  data.read_enabled ??
                  data.data?.read_enabled) === "boolean"
                  ? data.mode ??
                    data.data?.mode ??
                    data.read_enabled ??
                    data.data?.read_enabled
                  : nextEnabled,
            },
          };
          writeReadControlCache(next);
          return next;
        });

        toast(
          `${backend.short} Modbus reading ${
            nextEnabled ? "enabled" : "disabled"
          }.`
        );
      } catch (e) {
        console.error(`Failed to update ${backend.short} Modbus status:`, e);
        toast(String(e), "error");
      } finally {
        setReadControls((prev) => ({
          ...prev,
          [backend.name]: {
            ...prev[backend.name],
            saving: false,
          },
        }));
      }
    },
    [statuses, readControls, toast]
  );

  useEffect(() => {
    (async () => {
      await refreshStatuses();
      loadConfigs();
      scanPorts();
    })();

    const timer = setInterval(refreshStatuses, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const djangoRunning = Boolean(statuses.django?.running);
  const fastapiRunning = Boolean(statuses.fastapi?.running);

  useEffect(() => {
    BACKENDS.forEach((backend) => {
      const running = Boolean(statuses[backend.name]?.running);

      if (running) {
        loadReadControl(backend);
      } else {
        setReadControls((prev) => {
          const next = {
            ...prev,
            [backend.name]: { enabled: false, loading: false, saving: false },
          };
          writeReadControlCache(next);
          return next;
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [djangoRunning, fastapiRunning]);

  const updateConfig = (key, field, value) =>
    setConfigs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));

  const toggleDaemon = async (backend) => {
    const currentlyRunning = Boolean(statuses[backend.name]?.running);

    setPendingToggle((prev) => ({
      ...prev,
      [backend.name]: true,
    }));

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

    const otherBackend = BACKENDS.find((b) => b.name !== backend.name);
    const otherRunning = Boolean(statuses[otherBackend.name]?.running);

    try {
      if (currentlyRunning) {
        const readState = readControls[backend.name];

        if (readState?.enabled) {
          try {
            const response = await fetch(backend.readControlUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ meter: backend.short, mode: false }),
            });

            if (!response.ok) {
              throw new Error(
                `Unable to disable ${backend.short} Modbus reading (HTTP ${response.status})`
              );
            }

            setReadControls((prev) => {
              const next = {
                ...prev,
                [backend.name]: {
                  ...prev[backend.name],
                  enabled: false,
                },
              };
              writeReadControlCache(next);
              return next;
            });
          } catch (e) {
            toast(
              `Could not disable ${backend.short} Modbus reading: ${String(e)}`,
              "error"
            );
          }
        }

        await invoke("stop_backend", { name: backend.name });

        try {
          await invoke("save_backend_configs", {
            configs: {
              [backend.configKey]: {
                ...configs[backend.configKey],
                enabled: false,
              },
            },
          });
          updateConfig(backend.configKey, "enabled", false);
        } catch {}

        toast(`${backend.title} stopped.`);
      } else {
        const myPort = (configs[backend.configKey].port || "").trim();
        const otherPort = (configs[otherBackend.configKey].port || "").trim();

        if (otherRunning && myPort && myPort === otherPort) {
          throw new Error(
            `Cannot start ${backend.short}: COM port ${myPort} is in use by the running ${otherBackend.short} daemon. Stop ${otherBackend.short} first.`
          );
        }

        const savePayload = {
          [backend.configKey]: {
            ...configs[backend.configKey],
            enabled: true,
          },
        };

        if (!otherRunning) {
          savePayload[otherBackend.configKey] = {
            ...configs[otherBackend.configKey],
            enabled: false,
          };
        }

        await invoke("save_backend_configs", { configs: savePayload });

        updateConfig(backend.configKey, "enabled", true);
        if (!otherRunning) {
          updateConfig(otherBackend.configKey, "enabled", false);
        }

        toast(`${backend.title} starting… health check will update shortly.`);

        await invoke("start_backend", {
          name: backend.name,
          pythonMode,
        });

        await refreshStatuses();
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

      setPendingToggle((prev) => ({
        ...prev,
        [backend.name]: false,
      }));
      return;
    }

    setTimeout(async () => {
      await refreshStatuses();
      setPendingToggle((prev) => ({
        ...prev,
        [backend.name]: false,
      }));
    }, 800);
  };

  const restartBackend = (backend) =>
    runAction(
      backend.name,
      async () => {
        const otherBackend = BACKENDS.find((b) => b.name !== backend.name);
        const otherRunning = Boolean(statuses[otherBackend.name]?.running);

        const savePayload = {
          [backend.configKey]: {
            ...configs[backend.configKey],
            enabled: true,
          },
        };

        if (!otherRunning) {
          savePayload[otherBackend.configKey] = {
            ...configs[otherBackend.configKey],
            enabled: false,
          };
        }

        await invoke("save_backend_configs", { configs: savePayload });

        updateConfig(backend.configKey, "enabled", true);
        if (!otherRunning) {
          updateConfig(otherBackend.configKey, "enabled", false);
        }

        await invoke("stop_backend", { name: backend.name });

        return invoke("start_backend", { name: backend.name, pythonMode });
      },
      `${backend.title} restarting…`
    ).then(refreshStatuses);

  const restartAll = () =>
    runAction(
      "all",
      async () => {
        const acPort = (configs.ac.port || "").trim();
        const dcPort = (configs.dc.port || "").trim();

        if (acPort && dcPort && acPort === dcPort) {
          throw new Error(
            `Cannot restart all: AC and DC are both configured on ${acPort}. Change one port, or restart individually.`
          );
        }

        const savePayload = {
          ac: { ...configs.ac, enabled: Boolean(acPort) },
          dc: { ...configs.dc, enabled: Boolean(dcPort) },
        };

        await invoke("save_backend_configs", { configs: savePayload });

        updateConfig("ac", "enabled", Boolean(acPort));
        updateConfig("dc", "enabled", Boolean(dcPort));

        for (const backend of BACKENDS) {
          if (readControls[backend.name]?.enabled) {
            const response = await fetch(backend.readControlUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ meter: backend.short, mode: false }),
            });

            if (!response.ok) {
              throw new Error(
                `Unable to disable ${backend.short} Modbus reading before restart.`
              );
            }

            setReadControls((prev) => {
              const next = {
                ...prev,
                [backend.name]: {
                  ...prev[backend.name],
                  enabled: false,
                },
              };
              writeReadControlCache(next);
              return next;
            });
          }
        }

        for (const backend of BACKENDS) {
          await invoke("stop_backend", { name: backend.name });
        }

        await Promise.all(
          BACKENDS.map((backend) =>
            invoke("start_backend", {
              name: backend.name,
              pythonMode,
            })
          )
        );
      },
      "All backends restarting…"
    ).then(refreshStatuses);

  const pingAll = () =>
    runAction("ping", refreshStatuses, "Status refreshed.");

  const openTerminal = (name) =>
    runAction(
      `term_${name}`,
      () => invoke("show_backend_terminal", { name }),
      "Terminal opened."
    );

  const totalHealthy = Object.values(statuses).filter(
    (status) => status.healthy
  ).length;

  const combinedTodayMs = BACKENDS.reduce(
    (sum, backend) => sum + (todayMs[backend.name] || 0),
    0
  );

  return (
    <Box sx={{ width: "100%", minWidth: 0, pb: 1 }}>
      {/* Page header */}
      <Box sx={{ mb: { xs: 1.5, lg: 1.75, xl: 2 } }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: {
              xs: "0.95rem",
              sm: "1rem",
              lg: "0.98rem",
              xl: "1.05rem",
            },
            color: tokens.ink,
            mb: 0.5,
            textAlign: "left",
          }}
        >
          Backend &amp; Infrastructure Settings
        </Typography>

        <Typography
          sx={{
            ...studioSx.secondaryText,
            maxWidth: 560,
            fontSize: { xs: "0.75rem", lg: "0.72rem", xl: "0.8rem" },
          }}
        >
          Configure serial meters and manage independent backend processes for
          AC and DC meter acquisition.
        </Typography>
      </Box>

      {/* Status bar */}
      <Box
        sx={{
          ...studioSx.card,
          px: { xs: 1.5, sm: 2, lg: 1.75, xl: 2.5 },
          py: { xs: 1.5, sm: 1.75, lg: 1.5, xl: 2.25 },
          minHeight: { xs: "auto", lg: 70, xl: 76 },
          mb: { xs: 1.75, lg: 2, xl: 2.5 },
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          columnGap: { xs: 1.25, lg: 1.5, xl: 2 },
          rowGap: { xs: 1.25, lg: 1, xl: 1.5 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: { xs: 0.75, lg: 1, xl: 1.25 },
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              bgcolor: tokens.brandAccent,
              flexShrink: 0,
            }}
          />

          <Typography
            sx={{
              ...studioSx.cardTitle,
              fontSize: { xs: "0.8rem", lg: "0.78rem", xl: "0.88rem" },
            }}
          >
            Modbus RTU Master Engine
          </Typography>

          <StatusChip
            label={`${totalHealthy} Active Pipeline${
              totalHealthy !== 1 ? "s" : ""
            }`}
          />
        </Box>

        <VDivider />

        <StatPill
          icon={<SyncAltRounded sx={{ fontSize: 16 }} />}
          label="Runtime Today"
        >
          <Typography sx={statValueSx}>
            {hmShort(combinedTodayMs)}
          </Typography>
        </StatPill>

        <VDivider />

        <StatPill
          icon={<SwapHorizRounded sx={{ fontSize: 16 }} />}
          label="By Server"
        >
          {BACKENDS.map((backend, index) => (
            <Box
              key={backend.name}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              {index > 0 && (
                <Typography
                  sx={{
                    ...statValueSx,
                    color: tokens.textLightSecondary,
                  }}
                >
                  ·
                </Typography>
              )}

              <Typography
                sx={{
                  fontFamily: tokens.mono,
                  fontSize: { xs: "0.68rem", lg: "0.65rem", xl: "0.7rem" },
                  color: tokens.textLightSecondary,
                }}
              >
                {backend.short}
              </Typography>

              <Typography sx={statValueSx}>
                {hmShort(todayMs[backend.name])}
              </Typography>
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
            width: { xs: "100%", md: "auto" },
            "& .MuiButton-root": {
              flex: { xs: "1 1 100%", sm: "0 1 auto" },
            },
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

      {/* Backend cards */}
      <Box
        sx={{
          display: "grid",
          // was hardcoded to 2 columns at every width — stacks to one
          // column below `md` so each card gets full room on phones
          // and narrow tablets instead of being squeezed side-by-side
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "repeat(2, minmax(0, 1fr))",
          },
          gap: { xs: 1.5, lg: 1.75, xl: 2 },
          alignItems: "start",
          minWidth: 0,
        }}
      >
        {BACKENDS.map((backend) => {
          const status = statuses[backend.name];
          const config = configs[backend.configKey];
          const readControl = readControls[backend.name] || {
            enabled: false,
            loading: true,
            saving: false,
          };

          const running = Boolean(status?.running);
          const healthy = Boolean(status?.healthy);
          const pending = Boolean(pendingToggle[backend.name]);
          const loading = Boolean(busy[backend.name] || busy.all);
          const pid = status?.pid;

          return (
            <Box
              key={backend.name}
              sx={{
                ...studioSx.card,
                overflow: "hidden",
                minWidth: 0,
                width: "100%",
                height: "auto",
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  px: { xs: 1.75, sm: 2, lg: 1.75, xl: 2.5 },
                  py: { xs: 1.5, lg: 1.5, xl: 2 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1, lg: 1.25, xl: 1.5 },
                    flex: "1 1 220px",
                    minWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      ...studioSx.iconTile,
                      width: { xs: 36, lg: 36, xl: 40 },
                      height: { xs: 36, lg: 36, xl: 40 },
                      flexShrink: 0,
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
                        gap: 0.75,
                      }}
                    >
                      <Typography
                        fontWeight={700}
                        sx={{
                          fontSize: {
                            xs: "0.85rem",
                            lg: "0.82rem",
                            xl: "0.94rem",
                          },
                        }}
                      >
                        {backend.title}
                      </Typography>

                      {running && healthy && (
                        <StatusChip
                          label="Active / Connected"
                          tone="success"
                        />
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
                      {pid ? `Daemon PID: ${pid} · ` : ""}
                      Port {backend.port}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    flexShrink: 0,
                    ml: "auto",
                  }}
                >
                  <Typography sx={studioSx.secondaryText}>Daemon</Typography>

                  <Switch
                    checked={running}
                    disabled={pending}
                    onChange={() => toggleDaemon(backend)}
                    inputProps={{
                      "aria-label": `${backend.title} daemon`,
                    }}
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

              {/* Modbus Reading toggle */}
              <Divider />

              <Box
                sx={{
                  px: { xs: 1.75, sm: 2, lg: 1.75, xl: 2.5 },
                  py: { xs: 1.25, lg: 1.25, xl: 1.5 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  flexWrap: "wrap",
                  bgcolor: readControl.enabled ? "#F0FDF4" : tokens.surface,
                }}
              >
                <Box
                  sx={{
                    minWidth: 0,
                    flex: "1 1 180px",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      color: tokens.ink,
                    }}
                  >
                    {backend.short} Modbus Reading
                  </Typography>

                  <Typography
                    sx={{
                      ...studioSx.secondaryText,
                      fontSize: "0.7rem",
                      mt: 0.25,
                    }}
                  >
                    {readControl.loading
                      ? "Loading read status…"
                      : readControl.saving
                        ? "Updating Modbus reading…"
                        : readControl.enabled
                          ? `${backend.short} polling is enabled`
                          : `${backend.short} polling is disabled`}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexShrink: 0,
                    ml: "auto",
                  }}
                >
                  {!readControl.loading && (
                    <StatusChip
                      label={readControl.enabled ? "ON" : "OFF"}
                      tone={readControl.enabled ? "success" : "warning"}
                    />
                  )}

                  <Switch
                    checked={readControl.enabled}
                    disabled={
                      readControl.loading ||
                      readControl.saving ||
                      !running ||
                      pending
                    }
                    onChange={(event) =>
                      handleReadControlToggle(backend, event.target.checked)
                    }
                    inputProps={{
                      "aria-label": `${backend.short} Modbus reading`,
                    }}
                  />
                </Box>
              </Box>

              {/* Body */}
              <Box
                sx={{
                  px: { xs: 1.75, sm: 2, lg: 1.75, xl: 2.5 },
                  pt: { xs: 1.75, lg: 1.75, xl: 2.25 },
                  pb: { xs: 1, lg: 0.75, xl: 1 },
                  display: "flex",
                  flexDirection: "column",
                  gap: { xs: 1.75, lg: 1.5, xl: 2 },
                  minWidth: 0,
                }}
              >
                {/* Serial / COM Port */}
                <Box sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      mb: 0.75,
                    }}
                  >
                    <Typography sx={fieldLabelSx}>
                      Serial / COM Port
                    </Typography>

                    <Button
                      onClick={scanPorts}
                      sx={{
                        minHeight: 0,
                        height: 22,
                        p: 0,
                        minWidth: 0,
                        flexShrink: 0,
                        fontFamily: tokens.mono,
                        fontSize: "0.65rem",
                        color: tokens.brandAccent,
                        "&:hover": {
                          bgcolor: "transparent",
                          opacity: 0.8,
                        },
                      }}
                    >
                      ↺ Scan Ports
                    </Button>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      width: "100%",
                      minWidth: 0,
                      flexWrap: { xs: "wrap", sm: "nowrap" },
                    }}
                  >
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={config.port}
                      onChange={(event) =>
                        updateConfig(
                          backend.configKey,
                          "port",
                          event.target.value
                        )
                      }
                      sx={{
                        flex: "1 1 180px",
                        minWidth: 0,
                      }}
                      slotProps={{
                        select: {
                          displayEmpty: true,
                        },
                      }}
                    >
                      <MenuItem value="">— Select COM port —</MenuItem>

                      {config.port && !ports.includes(config.port) && (
                        <MenuItem value={config.port}>
                          {config.port} (saved)
                        </MenuItem>
                      )}

                      {ports.map((port) => (
                        <MenuItem key={port} value={port}>
                          {port}
                        </MenuItem>
                      ))}
                    </TextField>

                    <Button
                      variant="outlined"
                      startIcon={<SearchRounded sx={{ fontSize: 16 }} />}
                      onClick={scanPorts}
                      sx={{
                        ...buttonSx,
                        height: 38,
                        minHeight: 38,
                        flex: { xs: "1 1 100%", sm: "0 0 auto" },
                        width: { xs: "100%", sm: "auto" },
                      }}
                    >
                      Detect
                    </Button>
                  </Box>
                </Box>

                {/* Baud Rate */}
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ ...fieldLabelSx, mb: 0.75 }}>
                    Baud Rate
                  </Typography>

                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={Number(config.baudRate)}
                    onChange={(event) =>
                      updateConfig(
                        backend.configKey,
                        "baudRate",
                        Number(event.target.value)
                      )
                    }
                    sx={{
                      minWidth: 0,
                      "& .MuiSelect-select": {
                        fontSize: { xs: "0.82rem", lg: "0.78rem", xl: "0.85rem" },
                      },
                    }}
                  >
                    {BAUD_RATES.map((rate) => (
                      <MenuItem key={rate.value} value={rate.value}>
                        {rate.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                {/* Polling Interval */}
                <Box sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: { xs: "flex-start", sm: "center" },
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 0.75,
                      mb: 0.75,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                      }}
                    >
                      <TimerOutlined
                        sx={{
                          fontSize: 15,
                          color: tokens.textLightSecondary,
                        }}
                      />

                      <Typography sx={fieldLabelSx}>
                        Polling Interval
                      </Typography>
                    </Box>

                    <Typography
                      sx={{
                        fontFamily: tokens.mono,
                        fontSize: {
                          xs: "0.65rem",
                          lg: "0.63rem",
                          xl: "0.68rem",
                        },
                        fontWeight: 700,
                        color: tokens.brand,
                        whiteSpace: { xs: "normal", sm: "nowrap" },
                        textAlign: { xs: "left", sm: "right" },
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
                      width: "100%",
                      minWidth: 0,
                    }}
                  >
                    <TextField
                      type="number"
                      size="small"
                      value={config.pollInterval}
                      onChange={(event) =>
                        updateConfig(
                          backend.configKey,
                          "pollInterval",
                          event.target.value === ""
                            ? ""
                            : Math.max(
                                1,
                                parseInt(event.target.value, 10) || 1
                              )
                        )
                      }
                      slotProps={{
                        htmlInput: {
                          min: 1,
                          max: 3600,
                          step: 1,
                        },
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
                        flex: "1 1 100px",
                        minWidth: 0,
                        "& input": {
                          fontFamily: tokens.mono,
                          fontSize: "0.8rem",
                        },
                      }}
                    />

                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: { xs: 0.5, lg: 0.6, xl: 0.75 },
                        flex: "1 1 auto",
                        minWidth: 0,
                      }}
                    >
                      {POLL_PRESETS_S.map((preset) => {
                        const active =
                          Number(config.pollInterval) === preset;

                        return (
                          <Button
                            key={preset}
                            onClick={() =>
                              updateConfig(
                                backend.configKey,
                                "pollInterval",
                                preset
                              )
                            }
                            sx={{
                              height: 38,
                              minHeight: 38,
                              minWidth: { xs: 0, sm: 44, xl: 52 },
                              flex: { xs: "1 1 42px", sm: "0 0 auto" },
                              px: { xs: 1, xl: 1.5 },
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
                                bgcolor: active
                                  ? tokens.brandHover
                                  : "#E2E8F0",
                              },
                            }}
                          >
                            {preset}s
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
                  px: { xs: 1.75, sm: 2, lg: 1.75, xl: 2.5 },
                  py: { xs: 1.5, lg: 1.25, xl: 1.75 },
                  display: "flex",
                  alignItems: "stretch",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                  gap: 1,
                  "& .MuiButton-root": {
                    flex: { xs: "1 1 100%", sm: "0 1 auto" },
                  },
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