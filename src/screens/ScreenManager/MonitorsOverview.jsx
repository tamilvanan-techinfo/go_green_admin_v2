import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import MonitorRoundedIcon from "@mui/icons-material/MonitorRounded";
import CropFreeRoundedIcon from "@mui/icons-material/CropFreeRounded";
import { availableMonitors, primaryMonitor } from "@tauri-apps/api/window";
import api from "../../config.json";
import { useToast } from "../Allocations/Ui";

const WINDOWS_URL = `${api.apiBase}/screens/windows/?role=admin`;

// Max footprint for a single monitor card in the layout grid.
// const MAX_CARD_WIDTH = 260;
// const MAX_CARD_HEIGHT = 170;
const MAX_PREVIEW_HEIGHT = 220;

/**
 * Given a monitor's real resolution and the max box we're allowed to
 * draw it in, compute a scale factor so the drawn rectangle keeps the
 * monitor's true aspect ratio.
 */
function computeScale(monitorWidth, monitorHeight) {
  const scaleX = MAX_CARD_WIDTH / monitorWidth;
  const scaleY = MAX_CARD_HEIGHT / monitorHeight;
  return Math.min(scaleX, scaleY);
}

function MonitorCard({ monitor, content }) {
  const { width: monW, height: monH, label, isPrimary } = monitor;

  const scale = computeScale(monW, monH);
  const drawW = Math.round(monW * scale);
  const drawH = Math.round(monH * scale);

  // Content rectangle (the actual window) drawn relative to the monitor.
  const contentWindows = Array.isArray(content) ? content : [];

  const hasContent = contentWindows.length > 0;

  const monitorArea = monW * monH;

  const contentArea = contentWindows.reduce(
    (total, item) => total + item.width * item.height,
    0
  );

  const leftoverPercent = hasContent
    ? Math.max(
        0,
        Math.round(((monitorArea - contentArea) / monitorArea) * 100)
      )
    : 100;

  const isFullCoverage = hasContent && leftoverPercent === 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.75,
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.25,
        minWidth: MAX_CARD_WIDTH + 40,
      }}
    >
      {/* Monitor label row */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{ width: "100%" }}
      >
        <MonitorRoundedIcon sx={{ fontSize: 16, color: "text.secondary" }} />

        <Typography
          sx={{ fontSize: 12.5, fontWeight: 700, color: "text.primary", flex: 1 }}
          noWrap
        >
          {label || "Display"}
        </Typography>

        {isPrimary && (
          <Chip
            label="PRIMARY"
            size="small"
            sx={{
              height: 18,
              fontSize: 9,
              fontWeight: 700,
              bgcolor: "#ECFDF5",
              color: "#059669",
              border: "1px solid #A7F3D0",
            }}
          />
        )}
      </Stack>

      {/* Monitor rectangle, drawn to scale */}
      <Box
        sx={{
          width: drawW,
          height: drawH,
          position: "relative",
          borderRadius: "6px",
          border: "2px solid",
          borderColor: "divider",
          bgcolor: "#0B1220",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
          overflow: "hidden",
        }}
      >
        {/* Content window, drawn as a nested rect inside the monitor */}
        {contentWindows.map((item) => {
          const contentW = Math.round(item.width * scale);
          const contentH = Math.round(item.height * scale);
          const contentX = Math.round(item.x * scale);
          const contentY = Math.round(item.y * scale);

          return (
            <Tooltip
              key={item.id}
              title={`${item.name}: ${item.width} × ${item.height}px`}
              arrow
            >
              <Box
                sx={{
                  position: "absolute",
                  left: contentX,
                  top: contentY,
                  width: contentW,
                  height: contentH,
                  borderRadius: "3px",
                  bgcolor: item.fullscreen ? "#064E3B" : "#047857",
                  border: "1px solid #34D399",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  transition: "all 160ms ease",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#D1FAE5",
                    textAlign: "center",
                    px: 0.5,
                    lineHeight: 1.3,
                  }}
                >
                  {item.name}
                  {" "}
                  {item.width}×{item.height}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}

        {/* No content placeholder */}
        {!hasContent && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 10,
                color: "rgba(255,255,255,0.35)",
                fontStyle: "italic",
              }}
            >
              No content
            </Typography>
          </Box>
        )}
      </Box>

      {/* Resolution + leftover space info */}
      <Stack spacing={0.4} sx={{ width: "100%", alignItems: "center" }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            fontFamily: '"JetBrains Mono", monospace',
            color: "text.primary",
          }}
        >
          {monW} × {monH}
        </Typography>

        {hasContent ? (
          leftoverPercent > 0 ? (
            <Chip
              size="small"
              icon={<CropFreeRoundedIcon sx={{ fontSize: "12px !important" }} />}
              label={`${leftoverPercent}% unused space`}
              sx={{
                height: 20,
                fontSize: 9.5,
                fontWeight: 650,
                bgcolor: "#FFF7ED",
                color: "#C2410C",
                border: "1px solid #FED7AA",
                "& .MuiChip-icon": { color: "#C2410C", ml: 0.75 },
              }}
            />
          ) : (
            <Chip
              size="small"
              label="Fully covered"
              sx={{
                height: 20,
                fontSize: 9.5,
                fontWeight: 650,
                bgcolor: "#ECFDF5",
                color: "#059669",
                border: "1px solid #A7F3D0",
              }}
            />
          )
        ) : (
          <Typography sx={{ fontSize: 9.5, color: "text.disabled" }}>
            Not displaying anything
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}


function CombinedMonitorCard({ monitors, getContentForMonitor }) {
  if (!monitors.length) return null;

  // Calculate the complete virtual desktop boundaries.
  const minX = Math.min(...monitors.map((m) => m.x));
  const minY = Math.min(...monitors.map((m) => m.y));

  const maxX = Math.max(...monitors.map((m) => m.x + m.width));
  const maxY = Math.max(...monitors.map((m) => m.y + m.height));

  const totalWidth = maxX - minX;
  const totalHeight = maxY - minY;

  if (totalWidth <= 0 || totalHeight <= 0) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        width: "100%",
        minWidth: 0,
        p: 1.25,
        borderRadius: "12px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <MonitorRoundedIcon
            sx={{ fontSize: 16, color: "text.secondary" }}
          />

          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>
            Combined Desktop
          </Typography>
        </Stack>

        <Chip
          size="small"
          label={`${monitors.length} DISPLAY${monitors.length > 1 ? "S" : ""}`}
          sx={{
            height: 19,
            fontSize: 9,
            fontWeight: 700,
            bgcolor: "#ECFDF5",
            color: "#059669",
          }}
        />
      </Stack>

      {/* Combined monitor canvas */}
      <Box
        sx={{
          width: "100%",
          maxHeight: MAX_PREVIEW_HEIGHT,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
          position: "relative",
          overflow: "hidden",
          mx: "auto",
          bgcolor: "#0B1220",
          border: "2px solid",
          borderColor: "divider",
          borderRadius: "7px",
        }}
      >
        {monitors.map((monitor) => {
          const contentWindows = getContentForMonitor(monitor);

          const left = ((monitor.x - minX) / totalWidth) * 100;
          const top = ((monitor.y - minY) / totalHeight) * 100;

          const width = (monitor.width / totalWidth) * 100;
          const height = (monitor.height / totalHeight) * 100;

          return (
            <Box
              key={monitor.id}
              sx={{
                position: "absolute",
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`,
                boxSizing: "border-box",
                overflow: "hidden",
                bgcolor: "#0B1220",
                border: "1px solid #64748B",
              }}
            >
              {/* Monitor name */}
              <Typography
                sx={{
                  position: "absolute",
                  top: 3,
                  left: 3,
                  zIndex: 2,
                  fontSize: "clamp(5px, 1.1vw, 9px)",
                  color: "#CBD5E1",
                  bgcolor: "rgba(15,23,42,0.8)",
                  px: 0.4,
                  borderRadius: "2px",
                  maxWidth: "90%",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {monitor.label}
                {monitor.isPrimary ? " (Primary)" : ""}
              </Typography>

              {/* Windows positioned relative to this monitor */}
              {contentWindows.map((item) => (
                <Tooltip
                  key={item.id}
                  title={`${item.name}: ${item.width} × ${item.height}px`}
                  arrow
                >
                  <Box
                    sx={{
                      position: "absolute",
                      left: `${(item.x / monitor.width) * 100}%`,
                      top: `${(item.y / monitor.height) * 100}%`,
                      width: `${(item.width / monitor.width) * 100}%`,
                      height: `${(item.height / monitor.height) * 100}%`,
                      boxSizing: "border-box",
                      bgcolor: item.fullscreen ? "#064E3B" : "#047857",
                      border: "1px solid #34D399",
                      borderRadius: "3px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "clamp(5px, 1vw, 9px)",
                        fontWeight: 700,
                        color: "#D1FAE5",
                        textAlign: "center",
                        overflow: "hidden",
                        px: 0.25,
                        lineHeight: 1.2,
                      }}
                    >
                      {item.name}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </Box>
          );
        })}
      </Box>

      {/* Combined resolution */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 1 }}
      >
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          Desktop: {totalWidth} × {totalHeight}
        </Typography>

        <Typography sx={{ fontSize: 9, color: "text.secondary" }}>
          {monitors.length} connected
        </Typography>
      </Stack>
    </Paper>
  );
}

function MonitorsOverview({ refreshKey = 0 }) {
  const toast = useToast();
  const [monitors, setMonitors] = useState([]);
  const [windows, setWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
 


    const loadMonitors = useCallback(async () => {
    try {
        const [monitors, primary] = await Promise.all([
        availableMonitors(),
        primaryMonitor(),
        ]);

        return (monitors || []).map((m, index) => ({
        id: m.name || `monitor-${index}`,
        label: m.name || `Display ${index + 1}`,
        width: m.size.width,
        height: m.size.height,
        x: m.position.x,
        y: m.position.y,
        isPrimary: primary ? m.name === primary.name : index === 0,
        path: m.name || null,
        }));
    } catch (err) {
        console.error("Could not detect monitors:", err);
        throw new Error("Monitor detection failed. Make sure this is running inside the desktop app.");
    }
    }, []);

  const loadWindows = useCallback(async () => {
    const response = await fetch(WINDOWS_URL, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to load windows (HTTP ${response.status}).`);
    }

    const data = await response.json();
    console.log("windows from API:", data);
    return Array.isArray(data) ? data : data?.results ?? data?.windows ?? [];
  }, []);

    const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
        const [detectedMonitors, windowList] = await Promise.all([
        loadMonitors(),
        loadWindows(),
        ]);

        setMonitors(detectedMonitors);
        setWindows(windowList);

        toast("Monitor and window information loaded successfully.", "success");
    } catch (err) {
        const message =
        err.message || "Unable to load display information.";

        setError(message);
        toast(message, "error");
    } finally {
        setLoading(false);
    }
    }, [loadMonitors, loadWindows, toast]);

    useEffect(() => {
    loadAll();
    // const interval = setInterval(() => loadWindows().then(setWindows), 1000);
    // return () => clearInterval(interval);
    }, [loadAll, refreshKey]);

  // Match each monitor to whichever window is currently assigned to
  // its Screen (first active window found, if any).
  const contentForMonitor = (monitor) => {
    const monLeft = monitor.x;
    const monTop = monitor.y;
    const monRight = monitor.x + monitor.width;
    const monBottom = monitor.y + monitor.height;

    return windows
      .filter((window) => {
        if (window.is_active === false) return false;

        const pos = window?.position_details;

        if (!pos) return false;

        const x = Number(pos.x ?? 0);
        const y = Number(pos.y ?? 0);
        const width = Number(pos.width ?? 0);
        const height = Number(pos.height ?? 0);

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          width <= 0 ||
          height <= 0
        ) {
          return false;
        }

        // A window is assigned to a monitor only if its entire
        // rectangle fits inside that monitor.
        return (
          x >= monLeft &&
          y >= monTop &&
          x + width <= monRight &&
          y + height <= monBottom
        );
      })
      .map((window) => {
        const pos = window.position_details;

        const width = Number(pos.width);
        const height = Number(pos.height);

        // Fullscreen windows occupy the whole monitor visually.
        if (pos.fullscreen) {
          return {
            id: window.id,
            name: window.name,
            x: 0,
            y: 0,
            width: monitor.width,
            height: monitor.height,
            fullscreen: true,
          };
        }

        return {
          id: window.id,
          name: window.name,
          x: Number(pos.x ?? 0) - monLeft,
          y: Number(pos.y ?? 0) - monTop,
          width,
          height,
          fullscreen: false,
        };
      });
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: "10px" }}>
        {error}
      </Alert>
    );
  }

  if (monitors.length === 0) {
    return (
      <Alert severity="info" sx={{ borderRadius: "10px" }}>
        No monitors detected.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: "text.secondary",
          mb: 1.2,
        }}
      >
        CONNECTED MONITORS
      </Typography>

      <CombinedMonitorCard
        monitors={monitors}
        getContentForMonitor={contentForMonitor}
      />

      {/* <Stack
        direction="row"
        flexWrap="wrap"
        gap={1.5}
        sx={{ width: "100%" }}
      >
        {monitors.map((monitor) => (
          <MonitorCard
            key={monitor.id}
            monitor={monitor}
            content={contentForMonitor(monitor)}
          />
        ))}
      </Stack> */}
    </Box>
  );
}

export default MonitorsOverview;