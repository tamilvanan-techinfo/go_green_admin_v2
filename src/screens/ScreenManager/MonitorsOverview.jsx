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
const MAX_CARD_WIDTH = 260;
const MAX_CARD_HEIGHT = 170;

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
  const hasContent = Boolean(content);

  const contentW = hasContent ? Math.round(content.width * scale) : 0;
  const contentH = hasContent ? Math.round(content.height * scale) : 0;
  const contentX = hasContent ? Math.round((content.x || 0) * scale) : 0;
  const contentY = hasContent ? Math.round((content.y || 0) * scale) : 0;

  // Leftover space = monitor area not covered by the content window.
  const monitorArea = monW * monH;
  const contentArea = hasContent ? content.width * content.height : 0;
  const leftoverPercent = hasContent
    ? Math.max(0, Math.round(((monitorArea - contentArea) / monitorArea) * 100))
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
        {hasContent && (
          <Tooltip
            title={`Content: ${content.width} × ${content.height} px`}
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
                bgcolor: isFullCoverage ? "#064E3B" : "#047857",
                border: "1px solid #34D399",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
                {content.width}×{content.height}
              </Typography>
            </Box>
          </Tooltip>
        )}

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

function MonitorsOverview() {
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
    }, [loadAll, loadWindows]);

  // Match each monitor to whichever window is currently assigned to
  // its Screen (first active window found, if any).
    const contentForMonitor = (monitor) => {
    const monLeft = monitor.x;
    const monTop = monitor.y;
    const monRight = monitor.x + monitor.width;
    const monBottom = monitor.y + monitor.height;

    const match = windows.find((w) => {
        const pos = w?.position_details;
        if (!pos) return false;

        const winX = pos.x ?? 0;
        const winY = pos.y ?? 0;

        // Window's top-left corner falls inside this monitor's bounds.
        return (
        winX >= monLeft &&
        winX < monRight &&
        winY >= monTop &&
        winY < monBottom
        );
    });

    if (!match?.position_details) return null;

    const pos = match.position_details;
    return {
        width: pos.width,
        height: pos.height,
        // Report position relative to the monitor's own origin, not the
        // virtual desktop's global origin — needed for correct drawing.
        x: (pos.x ?? 0) - monLeft,
        y: (pos.y ?? 0) - monTop,
    };
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

      <Stack
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
      </Stack>
    </Box>
  );
}

export default MonitorsOverview;