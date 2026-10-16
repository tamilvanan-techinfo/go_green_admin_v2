
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import DesktopWindowsRoundedIcon from "@mui/icons-material/DesktopWindowsRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import AspectRatioRoundedIcon from "@mui/icons-material/AspectRatioRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import api from "../../config.json";
import BottomSheet from "../../components/BottonSheet";
import { Send } from "@mui/icons-material";

const GREEN = "#047857";
const DARK_GREEN = "#064E3B";
const TEXT_PRIMARY = "#0F172A";
const TEXT_SECONDARY = "#64748B";
const BORDER = "#E2E8F0";
const SURFACE = "#FFFFFF";
const PAGE_BG = "#F8FAFC";

const DEFAULT_CONFIG = {
  x: 0,
  y: 0,
  width: 1080,
  height: 1920,
  fullscreen: false,
  always_on_top: false,

};

const BEHAVIOR_OPTIONS = [
  {
    key: "fullscreen",
    label: "Fullscreen",
    description: "Occupy the full display",
  },
  {
    key: "always_on_top",
    label: "Always on top",
    description: "Keep above other windows",
  },
];

const NUMERIC_FIELDS = ["x", "y", "width", "height"];

const sectionSx = {
  p: { xs: 2, md: 2.5 },
  border: `1px solid ${BORDER}`,
  borderRadius: "12px",
  boxShadow: "none",
  bgcolor: SURFACE,
  minWidth: 0,
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    bgcolor: "#FFFFFF",
    fontSize: "0.875rem",
    "& fieldset": {
      borderColor: "#CBD5E1",
    },
    "&:hover fieldset": {
      borderColor: "#94A3B8",
    },
    "&.Mui-focused fieldset": {
      borderColor: GREEN,
      borderWidth: "1px",
    },
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.875rem",
  },
};

function SectionHeading({ icon, title, description, action }) {
  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: 2.5 }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.25}>
        <Box
          sx={{
            width: 34,
            height: 34,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: "9px",
            bgcolor: "#ECFDF5",
            color: GREEN,
          }}
        >
          {icon}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: "0.925rem",
              fontWeight: 700,
              color: TEXT_PRIMARY,
              lineHeight: 1.5,
            }}
          >
            {title}
          </Typography>

          {description && (
            <Typography
              sx={{
                mt: 0.25,
                fontSize: "0.8rem",
                color: TEXT_SECONDARY,
                lineHeight: 1.6,
              }}
            >
              {description}
            </Typography>
          )}
        </Box>
      </Stack>

      {action}
    </Stack>
  );
}

function EditWindow({ onClose, selectedWindow, onSave }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const windowData = selectedWindow?.window ?? selectedWindow;
  const position = windowData?.position_details;
  const assignedScreen = windowData?.active_screen_details;

  // WebSocket lifecycle refs
  const windowSocketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const connectionGenerationRef = useRef(0);
  const manuallyClosedRef = useRef(false);
  const pendingPushRef = useRef(null);

  const windowId = windowData?.id ?? windowData?.window_id ?? null;

  const clearPendingPush = useCallback(() => {
    const pending = pendingPushRef.current;

    if (pending?.timeout) {
      clearTimeout(pending.timeout);
    }

    pendingPushRef.current = null;
  }, []);

  const connectWindowSocket = useCallback(() => {
    if (!windowId) {
      setSocketConnected(false);
      console.warn("Cannot connect WebSocket: Window ID is missing.");
      return;
    }

    const socketBase = String(api.socketBase || api.ws || "")
      .replace(/\/+$/, "");

    if (!socketBase) {
      setNotice("WebSocket URL is missing from config.json.");
      return;
    }

    const existingSocket = windowSocketRef.current;

    if (
      existingSocket?.windowId === windowId &&
      (existingSocket.readyState === WebSocket.OPEN ||
        existingSocket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (existingSocket) {
      existingSocket.onopen = null;
      existingSocket.onmessage = null;
      existingSocket.onerror = null;
      existingSocket.onclose = null;

      if (existingSocket.readyState < WebSocket.CLOSING) {
        existingSocket.close();
      }

      windowSocketRef.current = null;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const generation = ++connectionGenerationRef.current;
    manuallyClosedRef.current = false;

    const isCurrentConnection = (socket) =>
      connectionGenerationRef.current === generation &&
      !manuallyClosedRef.current &&
      windowSocketRef.current === socket;

    const scheduleReconnect = () => {
      if (
        connectionGenerationRef.current !== generation ||
        manuallyClosedRef.current
      ) {
        return;
      }

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      const delay = Math.min(
        1000 * 2 ** reconnectAttemptRef.current,
        30000
      );

      reconnectAttemptRef.current += 1;

      console.log(
        `Window ${windowId}: reconnecting in ${delay / 1000}s`
      );

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;

        if (
          connectionGenerationRef.current === generation &&
          !manuallyClosedRef.current
        ) {
          openSocket();
        }
      }, delay);
    };

    const openSocket = () => {
      if (
        connectionGenerationRef.current !== generation ||
        manuallyClosedRef.current
      ) {
        return;
      }

      let socket;

      try {
        socket = new WebSocket(
          `${socketBase}/ws/window/admin/${windowId}/`
        );
      } catch (error) {
        console.error("Unable to create window WebSocket:", error);
        scheduleReconnect();
        return;
      }

      socket.windowId = windowId;
      windowSocketRef.current = socket;

      socket.onopen = () => {
        if (!isCurrentConnection(socket)) {
          socket.close();
          return;
        }

        console.log(`Window ${windowId}: WebSocket connected`);

        reconnectAttemptRef.current = 0;
        setSocketConnected(true);

        // Ask the backend for the current window information.
        socket.send(
          JSON.stringify({
            type: "get_windows",
            window_id: windowId,
          })
        );
      };

      socket.onmessage = (event) => {
        if (!isCurrentConnection(socket)) {
          return;
        }

        let data;

        try {
          data = JSON.parse(event.data);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
          return;
        }

        console.log(`Window ${windowId} message:`, data);

        if (data.type === "error") {
          const pending = pendingPushRef.current;

          if (pending) {
            clearPendingPush();
            setSaving(false);
            setNotice(data.message || "The backend rejected the configuration.");
          } else {
            setNotice(data.message || "Window WebSocket error.");
          }

          return;
        }

        if (
          data.type === "resolution_changed" ||
          data.type === "window_updated"
        ) {
          const responseWindowId =
            data.window_id ?? data.id ?? windowId;

          // Ignore events for another window.
          if (Number(responseWindowId) !== Number(windowId)) {
            return;
          }

          const pending = pendingPushRef.current;

          if (pending) {
            clearPendingPush();
            setSaving(false);
            setNotice(
              `Configuration pushed successfully: ${pending.width} × ${pending.height}.`
            );
          }

          // Update the local form if the backend sends properties.
          const updatedProperties = data.properties ?? data.window?.properties;

          if (updatedProperties && typeof updatedProperties === "object") {
            setConfig((previous) => ({
              ...previous,
              ...updatedProperties,
            }));
          }
        }
      };

      socket.onerror = (error) => {
        if (connectionGenerationRef.current !== generation) {
          return;
        }

        console.error(`Window ${windowId} WebSocket error:`, error);
      };

      socket.onclose = (event) => {
        // Check ownership BEFORE clearing the socket reference.
        const wasCurrentConnection =
          connectionGenerationRef.current === generation &&
          !manuallyClosedRef.current &&
          windowSocketRef.current === socket;

        console.log(
          `Window ${windowId} disconnected:`,
          event.code,
          event.reason
        );

        if (!wasCurrentConnection) {
          return;
        }

        windowSocketRef.current = null;
        setSocketConnected(false);

        scheduleReconnect();
      };
    };

    openSocket();
  }, [windowId, clearPendingPush]);

    useEffect(() => {
    if (!windowData) return;

    const details = windowData.position_details ?? {};
    const properties = windowData.properties ?? {};

    const source = {
      ...details,
      ...properties,
    };

    setConfig({
      x: source.x ?? 0,
      y: source.y ?? 0,
      width: source.width ?? 1080,
      height: source.height ?? 1920,
      fullscreen: source.fullscreen ?? false,
      always_on_top:
        source.always_on_top ?? source.alwaysOnTop ?? false,
    });

    setNotice("");
    setSaving(false);
  }, [windowData]);

  useEffect(() => {
    connectWindowSocket();

    return () => {
      manuallyClosedRef.current = true;
      connectionGenerationRef.current += 1;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      clearPendingPush();

      const socket = windowSocketRef.current;

      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;

        if (socket.readyState < WebSocket.CLOSING) {
          socket.close();
        }

        windowSocketRef.current = null;
      }

      setSocketConnected(false);
    };
  }, [connectWindowSocket, clearPendingPush]);

  const handleNumberChange = useCallback((field, value) => {
    setConfig((previous) => ({
      ...previous,
      [field]: value,
    }));
  }, []);

  const handleToggle = useCallback((field, checked) => {
    setConfig((previous) => ({
      ...previous,
      [field]: checked,
    }));
  }, []);

  const handleReset = useCallback(() => {
  const details = windowData?.position_details ?? {};
  const properties = windowData?.properties ?? {};

  const source = {
    ...details,
    ...properties,
  };

  setConfig({
    x: source.x ?? 0,
    y: source.y ?? 0,
    width: source.width ?? 1080,
    height: source.height ?? 1920,
    fullscreen: source.fullscreen ?? false,
    always_on_top:
      source.always_on_top ?? source.alwaysOnTop ?? false,
  });

  setNotice("");
}, [windowData]);

  const handleSave = useCallback(async () => {
  if (!windowData || !windowId) {
    setNotice("No window is selected or the Window ID is missing.");
    return;
  }

  for (const field of NUMERIC_FIELDS) {
    if (
      config[field] === "" ||
      !Number.isFinite(Number(config[field]))
    ) {
      setNotice(`Enter a valid value for ${field}.`);
      return;
    }

    const value = Number(config[field]);

    if (
      ["width", "height"].includes(field) &&
      value <= 0
    ) {
      setNotice(`${field} must be greater than zero.`);
      return;
    }
  }

  const socket = windowSocketRef.current;

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    setNotice(
      "WebSocket is disconnected. Wait for it to reconnect and try again."
    );
    return;
  }

  // Explicitly whitelist the six supported fields.
  const properties = {
    x: Number(config.x),
    y: Number(config.y),
    width: Number(config.width),
    height: Number(config.height),
    fullscreen: Boolean(config.fullscreen),
    always_on_top: Boolean(config.always_on_top),
  };

  const payload = {
    type: "change_resolution",
    window_id: Number(windowId),
    properties,
  };

  setSaving(true);
  setNotice("");



  pendingPushRef.current = {
    width: properties.width,
    height: properties.height,
  };

  try {
    socket.send(JSON.stringify(payload));
    console.log("Configuration sent to Django:", payload);
  } catch (error) {
    clearPendingPush();
    setSaving(false);
    setNotice(
      error?.message || "Unable to push window configuration."
    );
  }finally{
    setSaving(false)
  }
}, [config, windowData, windowId, clearPendingPush]);

  return (
    <BottomSheet
      width="min(600px, 85vw)"
      height="75vh"
      title="Edit Window Configuration"
      onClose={onClose}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
          bgcolor: PAGE_BG,
          color: TEXT_PRIMARY,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Window identity */}
        <Box
          sx={{
            flex: "0 0 auto",
            px: { xs: 2, md: 3 },
            py: 2,
            bgcolor: SURFACE,
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            spacing={1.5}
          >
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ minWidth: 0, alignItems: "center" }}
            >
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "11px",
                  bgcolor: "#ECFDF5",
                  color: DARK_GREEN,
                  border: "1px solid #D1FAE5",
                }}
              >
                <DesktopWindowsRoundedIcon />
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: "1rem",
                    fontWeight: 750,
                    letterSpacing: "-0.025em",
                    overflowWrap: "anywhere",
                  }}
                >
                  {windowData?.name ?? "Unnamed Window"}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Box>

        {/* Scrollable form */}
        <Box
          sx={{
            flex: "1 1 auto",
            minHeight: 0,
            minWidth: 0,
            overflowY: "auto",
            overflowX: "hidden",
            px: { xs: 1.5, md: 3 },
            py: { xs: 2, md: 2.5 },
            boxSizing: "border-box",
          }}
        >
          {notice && (
            <Alert
              severity={
                notice.toLowerCase().includes("successfully")
                  ? "success"
                  : "error"
              }
              onClose={() => setNotice("")}
              sx={{
                mb: 2,
                borderRadius: "8px",
                alignItems: "center",
              }}
            >
              {notice}
            </Alert>
          )}

          <Stack spacing={2.5}>
            {/* Position and dimensions */}
            <Paper sx={sectionSx}>
              <SectionHeading
                icon={<AspectRatioRoundedIcon fontSize="small" />}
                title="Position & Dimensions"
                description="Specify the window coordinates, display size, and opacity."
              />

              <Grid container spacing={2}>
                {[
                  { key: "x", label: "X Position" },
                  { key: "y", label: "Y Position" },
                  {
                    key: "width",
                    label: "Width",
                    disabled: config.fullscreen,
                  },
                  {
                    key: "height",
                    label: "Height",
                    disabled: config.fullscreen,
                  },
                ].map((field) => (
                  <Grid item xs={12} sm={6} key={field.key}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label={field.label}
                      value={config[field.key]}
                      disabled={field.disabled}
                      onChange={(event) =>
                        handleNumberChange(field.key, event.target.value)
                      }
                      inputProps={{ step: 1 }}
                      sx={inputSx}
                    />
                  </Grid>
                ))}
              </Grid>

              {config.fullscreen && (
                <Alert severity="info" sx={{ mt: 2, borderRadius: "8px" }}>
                  Width and height are controlled by fullscreen mode.
                </Alert>
              )}
            </Paper>

            {/* Window behavior */}
            <Paper sx={sectionSx}>
              <SectionHeading
                icon={<LayersRoundedIcon fontSize="small" />}
                title="Window Behavior"
                description="Manage visibility, window controls, and display behavior."
              />

              <Divider sx={{ mb: 1.5, borderColor: BORDER }} />

              <Grid container spacing={1}>
                {BEHAVIOR_OPTIONS.map((option) => (
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    md={4}
                    key={option.key}
                    sx={{ display: "flex" }}
                  >
                    <Box
                      sx={{
                        width: "100%",
                        height: 76,
                        minWidth: 0,
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        px: 1.5,
                        py: 1,
                        border: `1px solid ${BORDER}`,
                        borderRadius: "8px",
                        bgcolor: "#FFFFFF",
                        transition:
                          "background-color 150ms ease, border-color 150ms ease",
                        "&:hover": {
                          bgcolor: "#F8FAFC",
                          borderColor: "#94A3B8",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                        }}
                      >
                        <Typography
                          noWrap
                          title={option.label}
                          sx={{
                            fontSize: "0.825rem",
                            fontWeight: 650,
                            color: TEXT_PRIMARY,
                            lineHeight: 1.5,
                          }}
                        >
                          {option.label}
                        </Typography>

                        <Typography
                          title={option.description}
                          sx={{
                            mt: 0.5,
                            fontSize: "0.735rem",
                            lineHeight: 1.4,
                            color: TEXT_SECONDARY,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {option.description}
                        </Typography>
                      </Box>

                      <Switch
                        size="small"
                        checked={Boolean(config[option.key])}
                        onChange={(event) =>
                          handleToggle(option.key, event.target.checked)
                        }
                        color="success"
                        sx={{
                          flexShrink: 0,
                          ml: 0.5,
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: GREEN,
                          },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                            {
                              bgcolor: GREEN,
                              opacity: 1,
                            },
                        }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Stack>
        </Box>

        {/* Fixed action footer */}
        <Box
          sx={{
            flex: "0 0 auto",
            px: { xs: 2, md: 3 },
            py: 1.75,
            bgcolor: SURFACE,
            borderTop: `1px solid ${BORDER}`,
            boxShadow: "0 -4px 12px rgba(15, 23, 42, 0.025)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{ justifyContent: "space-between" }}
            spacing={1.5}
          >
            <Button
              startIcon={<RestartAltRoundedIcon />}
              onClick={handleReset}
              disabled={saving}
              sx={{
                alignSelf: { xs: "flex-start", sm: "auto" },
                color: TEXT_SECONDARY,
                textTransform: "none",
                fontWeight: 600,
                "&:hover": { bgcolor: "#F1F5F9" },
              }}
            >
              Reset changes
            </Button>

            <Stack
              direction="row"
              spacing={1}
              justifyContent="flex-end"
              alignItems="center"
            >
              <Button
                variant="outlined"
                onClick={onClose}
                disabled={saving}
                sx={{
                  minWidth: 90,
                  borderColor: "#CBD5E1",
                  borderRadius: "8px",
                  color: "#334155",
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": {
                    borderColor: "#94A3B8",
                    bgcolor: "#F8FAFC",
                  },
                }}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={handleSave}
                disabled={saving}
                sx={{
                  minWidth: 175,
                  borderRadius: "8px",
                  bgcolor: GREEN,
                  color: "#FFFFFF",
                  textTransform: "none",
                  fontWeight: 650,
                  boxShadow: "none",
                  "&:hover": {
                    bgcolor: DARK_GREEN,
                    boxShadow: "none",
                  },
                  "&.Mui-disabled": {
                    bgcolor: "#A7CFC0",
                    color: "#FFFFFF",
                  },
                }}
              >
                {saving ? "Pushing..." : "Push Configuration"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </BottomSheet>
  );
}

export default EditWindow;
