import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Paper,
  Switch,
  Divider,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";

import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SendIcon from "@mui/icons-material/Send";

import api from "../../config.json";
import { useSocket } from "../../context/SocketContext";

const SCREEN_API_URL = `${api.apiBase}/screens/screen-position/`;
// Adjust this to wherever your backend exposes the list of monitors
// and the LED UI resolution currently running on each of them.
const MONITORS_API_URL = `${api.apiBase}/screens/monitors-led-status/`;

const initialSettings = {
  width: "1080",
  height: "1920",
  positionX: "0",
  positionY: "1",
};

const FIELD_KEYS = ["width", "height", "positionX", "positionY"];

const NUMERIC_FIELDS = new Set([
  "width",
  "height",
  "positionX",
  "positionY",
]);

const FIELD_MAP = {
  positionX: "x",
  positionY: "y",
};

function formFromScreen(screen) {
  const get = (key) => screen?.[FIELD_MAP[key] || key];

  return {
    width: String(get("width") ?? initialSettings.width),
    height: String(get("height") ?? initialSettings.height),
    positionX: String(get("positionX") ?? initialSettings.positionX),
    positionY: String(get("positionY") ?? initialSettings.positionY),
  };
}

function ScreenControl() {
  const {
    connected,
    send,
    controlledScreen,
    setControlledScreen,
  } = useSocket();

  const [screen, setScreen] = useState(null);
  const [settings, setSettings] = useState(initialSettings);
  const [baseline, setBaseline] = useState(initialSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [receiverOn, setReceiverOn] = useState(false);
  const [receiverToggling, setReceiverToggling] = useState(false);

  // Monitors + LED UI usage per monitor.
  const [monitors, setMonitors] = useState([]);
  const [monitorsLoading, setMonitorsLoading] = useState(true);

  // Load the current screen configuration.
  useEffect(() => {
    let active = true;

    const loadScreen = async () => {
      setLoading(true);

      try {
        const response = await fetch(SCREEN_API_URL);

        if (!response.ok) {
          throw new Error(
            `Failed to load screen settings (${response.status}).`
          );
        }

        const data = await response.json();

        if (!active) return;

        const loadedSettings = formFromScreen(data);

        setScreen(data);
        setControlledScreen(data);
        setSettings(loadedSettings);
        setBaseline(loadedSettings);
      } catch (error) {
        console.error("Could not load screen settings:", error);

        if (active) {
          setFeedback({
            type: "error",
            message:
              "Could not load screen settings. Check the backend connection.",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadScreen();

    return () => {
      active = false;
    };
  }, [setControlledScreen]);

  // Keep screen state synchronized with shared socket updates.
  useEffect(() => {
    if (!controlledScreen) return;

    setScreen(controlledScreen);

    const loadedSettings = formFromScreen(controlledScreen);

    setSettings(loadedSettings);
    setBaseline(loadedSettings);
  }, [controlledScreen]);

  // Load LED receiver status from the Electron main process.
  useEffect(() => {
    let active = true;

    const loadReceiverStatus = async () => {
      try {
        if (!window.electronAPI?.getReceiverStatus) return;

        const result = await window.electronAPI.getReceiverStatus();

        if (active) {
          setReceiverOn(Boolean(result?.running));
        }
      } catch (error) {
        console.error("Could not load LED UI status:", error);
      }
    };

    loadReceiverStatus();

    return () => {
      active = false;
    };
  }, []);

  // Load monitors + per-monitor LED UI resolution usage.
  const loadMonitors = useCallback(async () => {
    setMonitorsLoading(true);

    try {
      // Prefer live data from Electron if available (actual connected
      // displays), falling back to the backend endpoint.
      let monitorList = [];

      if (window.electronAPI?.getMonitorsLedStatus) {
        const result = await window.electronAPI.getMonitorsLedStatus();
        monitorList = Array.isArray(result) ? result : [];
      } else {
        const response = await fetch(MONITORS_API_URL);

        if (!response.ok) {
          throw new Error(
            `Failed to load monitors (${response.status}).`
          );
        }

        const data = await response.json();
        monitorList = Array.isArray(data) ? data : data?.monitors || [];
      }

      setMonitors(monitorList);
    } catch (error) {
      console.error("Could not load monitors LED status:", error);
      setMonitors([]);
    } finally {
      setMonitorsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonitors();
  }, [loadMonitors]);

  // Re-fetch monitor usage whenever the LED UI is toggled, so the
  // "used vs free resolution" numbers stay accurate.
  useEffect(() => {
    loadMonitors();
  }, [receiverOn, loadMonitors]);

  const updateSetting = useCallback((key, value) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setFeedback(null);
  }, []);

  // Compare current values against the last loaded/applied baseline.
  const changedProperties = useMemo(() => {
    const changes = {};

    for (const key of FIELD_KEYS) {
      const current = settings[key];
      const original = baseline[key];

      if (NUMERIC_FIELDS.has(key)) {
        if (
          current === "" ||
          Number.isNaN(Number(current)) ||
          Number(current) === Number(original)
        ) {
          continue;
        }

        changes[FIELD_MAP[key] || key] = Number(current);
      } else if (current !== original) {
        changes[FIELD_MAP[key] || key] = current;
      }
    }

    return changes;
  }, [settings, baseline]);

  const changeCount = Object.keys(changedProperties).length;
  const hasChanges = changeCount > 0;

  const handleReset = useCallback(() => {
    setSettings({ ...baseline });
    setFeedback(null);
  }, [baseline]);

  // Apply modified screen properties through the shared WebSocket.
  const handlePushResolution = useCallback(() => {
    if (!hasChanges) return;

    if (!connected) {
      setFeedback({
        type: "error",
        message: "WebSocket is disconnected. Reconnect before applying changes.",
      });
      return;
    }

    const invalidDimension =
      !Number.isInteger(Number(settings.width)) ||
      !Number.isInteger(Number(settings.height)) ||
      Number(settings.width) <= 0 ||
      Number(settings.height) <= 0;

    if (invalidDimension) {
      setFeedback({
        type: "error",
        message: "Width and height must be positive whole numbers.",
      });
      return;
    }

    const invalidPosition =
      settings.positionX.trim() === "" ||
      settings.positionY.trim() === "" ||
      !Number.isFinite(Number(settings.positionX)) ||
      !Number.isFinite(Number(settings.positionY));

    if (invalidPosition) {
      setFeedback({
        type: "error",
        message: "Enter valid numeric X and Y positions.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      send({
        type: "window_update",
        screen_id: screen?.id,
        properties: changedProperties,
      });

      setBaseline({ ...settings });

      setFeedback({
        type: "success",
        message: "Screen settings sent successfully.",
      });
    } catch (error) {
      console.error("Could not send screen settings:", error);

      setFeedback({
        type: "error",
        message: "Could not send screen settings.",
      });
    } finally {
      setSaving(false);
    }
  }, [
    hasChanges,
    connected,
    settings,
    screen,
    changedProperties,
    send,
  ]);

  // Start or stop the LED receiver using the Electron API.
  const handleReceiverToggle = useCallback(async (checked) => {
    const electronAPI = window.electronAPI;

    if (
      !electronAPI?.startReceiver ||
      !electronAPI?.stopReceiver
    ) {
      setFeedback({
        type: "error",
        message: "LED UI controls are unavailable in this environment.",
      });
      return;
    }

    setReceiverToggling(true);
    setFeedback(null);

    try {
      const result = checked
        ? await electronAPI.startReceiver()
        : await electronAPI.stopReceiver();

      setReceiverOn(Boolean(result?.running ?? checked));

      setFeedback({
        type: "success",
        message: checked
          ? "LED UI started."
          : "LED UI stopped.",
      });
    } catch (error) {
      console.error("Failed to toggle LED UI:", error);

      try {
        const current = await electronAPI.getReceiverStatus();
        setReceiverOn(Boolean(current?.running));
      } catch {
        // Keep the last known receiver status.
      }

      setFeedback({
        type: "error",
        message: "Could not change LED UI status.",
      });
    } finally {
      setReceiverToggling(false);
    }
  }, []);

  // Compact field styles.
  const compactFieldSx = {
    "& .MuiOutlinedInput-root": {
      height: 40,
      fontSize: 13,
      borderRadius: "7px",
      alignItems: "center",
      bgcolor: "background.paper",
    },

    "& .MuiOutlinedInput-input": {
      boxSizing: "border-box",
      height: "100%",
      padding: "8px 12px",
    },

    "& .MuiInputLabel-root": {
      fontFamily: "Inter, sans-serif",
      fontSize: 12,
      color: "text.secondary",
      top: 0,
      transform: "translate(12px, 10px) scale(1)",
      transformOrigin: "top left",
    },

    "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled":
      {
        transform: "translate(12px, -8px) scale(0.78)",
        bgcolor: "background.paper",
        px: 0.5,
      },

    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "divider",
    },
  };

  const sectionTitleSx = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: "text.secondary",
    mb: 0.8,
  };

  const toggleRowSx = {
    minHeight: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 1,
  };

  const compactSwitchSx = {
    width: 38,
    height: 22,
    p: 0,

    "& .MuiSwitch-switchBase": {
      p: "3px",

      "&.Mui-checked": {
        transform: "translateX(16px)",
        color: "#FFFFFF",

        "& + .MuiSwitch-track": {
          bgcolor: "#10B981",
          opacity: 1,
        },
      },
    },

    "& .MuiSwitch-thumb": {
      width: 16,
      height: 16,
      boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
    },

    "& .MuiSwitch-track": {
      borderRadius: 12,
      bgcolor: "#CBD5E1",
      opacity: 1,
    },
  };

  // Helper: compute used vs free resolution/area for a monitor entry.
  // Expects each monitor to look roughly like:
  // { id, name, width, height, ledWidth, ledHeight }
  const getMonitorUsage = (monitor) => {
    const monitorWidth = Number(monitor.width) || 0;
    const monitorHeight = Number(monitor.height) || 0;
    const ledWidth = Number(monitor.ledWidth ?? monitor.led_width) || 0;
    const ledHeight = Number(monitor.ledHeight ?? monitor.led_height) || 0;

    const totalArea = monitorWidth * monitorHeight;
    const usedArea = ledWidth * ledHeight;
    const freeArea = Math.max(totalArea - usedArea, 0);

    const freeWidth = Math.max(monitorWidth - ledWidth, 0);
    const freeHeight = Math.max(monitorHeight - ledHeight, 0);

    const usedPercent =
      totalArea > 0 ? Math.round((usedArea / totalArea) * 100) : 0;

    return {
      monitorWidth,
      monitorHeight,
      ledWidth,
      ledHeight,
      freeWidth,
      freeHeight,
      usedPercent,
      hasLed: ledWidth > 0 && ledHeight > 0,
    };
  };

  if (loading) {
    return (
      <Box
        sx={{
          width: "100%",
          maxWidth: 440,
          mx: "auto",
          p: 1.5,
          boxSizing: "border-box",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            minHeight: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "14px",
          }}
        >
          <CircularProgress size={26} />
        </Paper>
      </Box>
    );
  }

  return (
      <Box
        sx={{
          width: "100%",
          maxWidth: 440,
          mx: "auto",
          p: 1.5,
          boxSizing: "border-box",
          fontFamily: "Inter, sans-serif",
        }}
      >
      <Paper
        component="section"
        elevation={0}
        sx={{
          width: "100%",
          p: 2,
          boxSizing: "border-box",
          borderRadius: "14px",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "0 2px 10px rgba(15,23,42,0.035)",
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ mb: 1.75 }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "9px",
              bgcolor: "#ECFDF5",
              border: "1px solid #A7F3D0",
              color: "secondary.main",
            }}
          >
            <TuneRoundedIcon sx={{ fontSize: 22 }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 700,
                color: "text.primary",
                lineHeight: 1.4,
              }}
            >
              Screen Control
            </Typography>

            <Typography
              sx={{
                fontSize: 11,
                color: "text.secondary",
                lineHeight: 1.5,
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {screen?.name || "CombinedView"}{" "}
              {screen?.route || "/live/combined-view"}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={connected ? "LIVE" : "OFFLINE"}
            sx={{
              height: 22,
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: '"JetBrains Mono", monospace',
              bgcolor: connected
                ? "#ECFDF5"
                : "action.hover",
              color: connected
                ? "#059669"
                : "text.secondary",
              border: "1px solid",
              borderColor: connected ? "#A7F3D0" : "divider",
            }}
          />
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Dimensions */}
        <Box sx={{ mb: 1.75 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 0.8 }}
          >
            <Typography sx={{ ...sectionTitleSx, mb: 0 }}>
              DIMENSIONS
            </Typography>

            <Typography
              sx={{
                fontSize: 10,
                fontFamily: '"JetBrains Mono", monospace',
                color: "text.disabled",
              }}
            >
              {Number(settings.width) > Number(settings.height)
                ? "Landscape"
                : "Portrait"}{" "}
              {settings.width && settings.height
                ? `${settings.width}:${settings.height}`
                : ""}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              size="small"
              label="Width"
              type="number"
              value={settings.width}
              onChange={(event) =>
                updateSetting("width", event.target.value)
              }
              inputProps={{ min: 1 }}
              sx={compactFieldSx}
            />

            <TextField
              fullWidth
              size="small"
              label="Height"
              type="number"
              value={settings.height}
              onChange={(event) =>
                updateSetting("height", event.target.value)
              }
              inputProps={{ min: 1 }}
              sx={compactFieldSx}
            />
          </Stack>
        </Box>

        {/* Position */}
        <Box sx={{ mb: 1.75 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 0.8 }}
          >
            <Typography sx={{ ...sectionTitleSx, mb: 0 }}>
              POSITION
            </Typography>

            <Typography
              sx={{
                fontSize: 10,
                fontFamily: '"JetBrains Mono", monospace',
                color: "text.disabled",
              }}
            >
              Window coordinates
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              size="small"
              label="Position X"
              type="number"
              value={settings.positionX}
              onChange={(event) =>
                updateSetting("positionX", event.target.value)
              }
              sx={compactFieldSx}
            />

            <TextField
              fullWidth
              size="small"
              label="Position Y"
              type="number"
              value={settings.positionY}
              onChange={(event) =>
                updateSetting("positionY", event.target.value)
              }
              sx={compactFieldSx}
            />
          </Stack>
        </Box>

        {/* Window behavior - single LED UI toggle */}
        <Box sx={{ mb: 1.75 }}>
          <Typography sx={sectionTitleSx}>
            WINDOW BEHAVIOR
          </Typography>

          <Box sx={toggleRowSx}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 600,
                color: "text.primary",
              }}
            >
              START LED UI
            </Typography>

            <Switch
              size="small"
              checked={receiverOn}
              disabled={receiverToggling}
              onChange={(event) =>
                handleReceiverToggle(event.target.checked)
              }
              inputProps={{ "aria-label": "START LED UI" }}
              sx={compactSwitchSx}
            />
          </Box>
        </Box>

        {/* LED UI usage per monitor */}
        <Box sx={{ mb: 1.75 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 0.8 }}
          >
            <Typography sx={{ ...sectionTitleSx, mb: 0 }}>
              LED UI ON MONITORS
            </Typography>

            {monitorsLoading && <CircularProgress size={12} />}
          </Stack>

          {!monitorsLoading && monitors.length === 0 && (
            <Typography
              sx={{
                fontSize: 11,
                color: "text.disabled",
              }}
            >
              No monitors detected.
            </Typography>
          )}

          <Stack spacing={1}>
            {monitors.map((monitor, index) => {
              const usage = getMonitorUsage(monitor);
              const key = monitor.id ?? monitor.name ?? index;

              return (
                <Box
                  key={key}
                  sx={{
                    p: 1.1,
                    borderRadius: "9px",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 0.5 }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "text.primary",
                      }}
                    >
                      {monitor.name || `Monitor ${index + 1}`}
                    </Typography>

                    <Chip
                      size="small"
                      label={usage.hasLed ? "LED ACTIVE" : "NO LED"}
                      sx={{
                        height: 18,
                        fontSize: 9,
                        fontWeight: 700,
                        fontFamily: '"JetBrains Mono", monospace',
                        bgcolor: usage.hasLed ? "#ECFDF5" : "action.hover",
                        color: usage.hasLed ? "#059669" : "text.secondary",
                        border: "1px solid",
                        borderColor: usage.hasLed ? "#A7F3D0" : "divider",
                      }}
                    />
                  </Stack>

                  <Typography
                    sx={{
                      fontSize: 10,
                      fontFamily: '"JetBrains Mono", monospace',
                      color: "text.secondary",
                    }}
                  >
                    Monitor: {usage.monitorWidth}×{usage.monitorHeight}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 10,
                      fontFamily: '"JetBrains Mono", monospace',
                      color: "text.secondary",
                    }}
                  >
                    LED UI: {usage.hasLed
                      ? `${usage.ledWidth}×${usage.ledHeight}`
                      : "—"}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 10,
                      fontFamily: '"JetBrains Mono", monospace',
                      color: "text.secondary",
                    }}
                  >
                    Free space: {usage.freeWidth}×{usage.freeHeight}
                    {" "}
                    ({usage.usedPercent}% used)
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {feedback && (
          <Alert
            severity={feedback.type}
            onClose={() => setFeedback(null)}
            sx={{
              mb: 1.5,
              py: 0,
              fontSize: 11,
              alignItems: "center",
              "& .MuiAlert-message": {
                fontSize: 11,
              },
            }}
          >
            {feedback.message}
          </Alert>
        )}

        {/* Footer actions */}

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography
            sx={{
              fontSize: 10,
              color: "text.secondary",
            }}
          >
            {hasChanges
              ? `${changeCount} change${changeCount === 1 ? "" : "s"} pending`
              : "All settings applied"}
          </Typography>

          {saving && <CircularProgress size={14} />}
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            "& .MuiButton-root": {
              minHeight: 36,
              borderRadius: "8px",
              fontSize: 12,
              fontWeight: 600,
              textTransform: "none",
              boxShadow: "none",
            },
          }}
        >
          <Button
            fullWidth
            type="button"
            variant="contained"
            startIcon={
              <RestartAltRoundedIcon
                sx={{ fontSize: "16px !important" }}
              />
            }
            onClick={handleReset}
            disabled={!hasChanges || saving}
            sx={{
              bgcolor: "#F1F5F9",
              color: "text.secondary",
              "&:hover": {
                bgcolor: "#E2E8F0",
                boxShadow: "none",
              },
            }}
          >
            Reset
          </Button>

          <Button
            fullWidth
            type="button"
            variant="contained"
            startIcon={
              saving ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <SendIcon sx={{ fontSize: "16px !important" }} />
              )
            }
            onClick={handlePushResolution}
            disabled={!hasChanges || !connected || saving}
            sx={{
              bgcolor: "primary.main",
              color: "#FFFFFF",
              "&:hover": {
                bgcolor: "primary.dark",
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                bgcolor: "action.disabledBackground",
                color: "text.disabled",
              },
            }}
          >
            {saving ? "Applying..." : "Push Resolution"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

export default ScreenControl;