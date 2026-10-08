import {
  AppBar as MuiAppBar,
  Box,
  Typography,
  IconButton,
  InputBase,
  Chip,
  Divider,
  Badge,
} from "@mui/material";

import {
  BoltRounded,
  SearchRounded,
  KeyboardCommandKeyRounded,
  FiberManualRecordRounded,
  RemoveRounded,
  CropSquareRounded,
  CloseRounded,
  NotificationsNoneRounded,
} from "@mui/icons-material";

import { useState, useEffect } from "react";

function AppBar() {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) =>
    date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const formatTime = (date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

  const handleMinimize = async (e) => {
    e.stopPropagation();
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      console.log("Minimizing window:", win);
      await win.minimize();
    } catch (err) {
      console.error("Minimize failed:", err);
    }
  };

  const handleMaximize = async (e) => {
    e.stopPropagation();
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      await win.toggleMaximize();
    } catch (err) {
      console.error("Maximize failed:", err);
    }
  };

  const handleClose = async (e) => {
    e.stopPropagation();
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      await win.close();
    } catch (err) {
      console.error("Close failed:", err);
    }
  };

  return (
    <MuiAppBar
      position="fixed"
      elevation={0}
      color="transparent"
      sx={{
        height: 48,
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
        color: "#0F172A",
        zIndex: 1300,
      }}
    >
      <Box
        data-tauri-drag-region
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          px: 1.5,
          gap: 1,
          userSelect: "none",
        }}
      >
        {/* ── BRAND ── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            minWidth: 210,
            px: 0.5,
          }}
        >
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: "8px",
              background: "linear-gradient(135deg, #065F46 0%, #047857 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 1px 3px rgba(4,120,87,0.35)",
            }}
          >
            <BoltRounded sx={{ fontSize: 15, color: "#FFFFFF" }} />
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: "#0F172A",
                whiteSpace: "nowrap",
                letterSpacing: "0.01em",
                lineHeight: 1,
              }}
            >
              Go Green Admin
            </Typography>
            <Typography
              sx={{
                fontSize: 9,
                fontWeight: 500,
                color: "#94A3B8",
                letterSpacing: "0.04em",
                lineHeight: 1.4,
              }}
            >
              ENTERPRISE PLATFORM
            </Typography>
          </Box>

          <Box
            sx={{
              px: 0.9,
              py: 0.3,
              borderRadius: "5px",
              backgroundColor: "#ECFDF5",
              border: "1px solid #A7F3D0",
            }}
          >
            <Typography
              sx={{
                fontSize: 9,
                fontWeight: 700,
                color: "#047857",
                fontFamily: '"JetBrains Mono", monospace',
                lineHeight: 1.2,
              }}
            >
              v2.4.0
            </Typography>
          </Box>
        </Box>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ height: 20, alignSelf: "center", borderColor: "#E2E8F0" }}
        />

        {/* ── SEARCH ── */}
        <Box
          data-tauri-drag-region="false"
          sx={{
            width: 380,
            height: 31,
            display: "flex",
            alignItems: "center",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            backgroundColor: "#F8FAFC",
            px: 1,
            gap: 0.8,
            transition: "all 0.15s ease",
            "&:hover": {
              borderColor: "#CBD5E1",
              backgroundColor: "#FFFFFF",
            },
            "&:focus-within": {
              borderColor: "#047857",
              backgroundColor: "#FFFFFF",
              boxShadow: "0 0 0 3px rgba(4,120,87,0.08)",
            },
          }}
        >
          <SearchRounded sx={{ fontSize: 15, color: "#94A3B8" }} />

          <InputBase
            placeholder="Search modules, participants, records..."
            sx={{
              flex: 1,
              "& input": {
                fontSize: 11.5,
                color: "#0F172A",
                padding: 0,
                "&::placeholder": { color: "#94A3B8", opacity: 1 },
              },
            }}
          />

          <Box
            sx={{
              height: 19,
              px: 0.6,
              display: "flex",
              alignItems: "center",
              gap: 0.2,
              borderRadius: "4px",
              border: "1px solid #E2E8F0",
              backgroundColor: "#FFFFFF",
            }}
          >
            <KeyboardCommandKeyRounded sx={{ fontSize: 10, color: "#94A3B8" }} />
            <Typography sx={{ fontSize: 9, fontWeight: 600, color: "#94A3B8" }}>
              K
            </Typography>
          </Box>
        </Box>

        {/* ── FLEXIBLE DRAG AREA ── */}
        <Box data-tauri-drag-region sx={{ flex: 1, height: "100%" }} />

        {/* ── DATE & TIME ── */}
        <Box
          data-tauri-drag-region="false"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.2,
            py: 0.5,
            borderRadius: "7px",
            backgroundColor: "#F8FAFC",
            border: "1px solid #E2E8F0",
          }}
        >
          <Box sx={{ textAlign: "right" }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: "#0F172A",
                fontFamily: '"JetBrains Mono", monospace',
                lineHeight: 1.1,
              }}
            >
              {formatTime(dateTime)}
            </Typography>
            <Typography
              sx={{
                fontSize: 9,
                fontWeight: 500,
                color: "#94A3B8",
                lineHeight: 1.3,
                letterSpacing: "0.02em",
              }}
            >
              {formatDate(dateTime)}
            </Typography>
          </Box>
        </Box>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ height: 20, alignSelf: "center", mx: 0.25, borderColor: "#E2E8F0" }}
        />

        {/* ── LIVE STATUS ── */}
        <Chip
          icon={
            <FiberManualRecordRounded
              sx={{ fontSize: "7px !important", color: "#10B981 !important" }}
            />
          }
          label="Live"
          size="small"
          sx={{
            height: 24,
            borderRadius: "6px",
            backgroundColor: "#ECFDF5",
            border: "1px solid #A7F3D0",
            "& .MuiChip-label": {
              px: 0.7,
              fontSize: 9.5,
              fontWeight: 700,
              color: "#047857",
              letterSpacing: "0.03em",
            },
            "& .MuiChip-icon": { ml: 0.7, mr: -0.2 },
          }}
        />

        <Divider
          orientation="vertical"
          flexItem
          sx={{ height: 20, alignSelf: "center", mx: 0.25, borderColor: "#E2E8F0" }}
        />

        {/* ── NOTIFICATIONS ── */}
        <IconButton
          data-tauri-drag-region="false"
          size="small"
          sx={{
            width: 30,
            height: 30,
            borderRadius: "7px",
            color: "#64748B",
            "&:hover": { backgroundColor: "#F1F5F9", color: "#0F172A" },
          }}
        >
          <Badge
            badgeContent={3}
            sx={{
              "& .MuiBadge-badge": {
                fontSize: 8,
                fontWeight: 700,
                minWidth: 14,
                height: 14,
                padding: "0 3px",
                backgroundColor: "#EF4444",
                color: "#FFFFFF",
                top: 1,
                right: 1,
              },
            }}
          >
            <NotificationsNoneRounded sx={{ fontSize: 17 }} />
          </Badge>
        </IconButton>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ height: 20, alignSelf: "center", mx: 0.25, borderColor: "#E2E8F0" }}
        />

        {/* ── WINDOW CONTROLS ── */}
        <IconButton
          data-tauri-drag-region="false"
          onClick={handleMinimize}
          size="small"
          sx={{
            width: 28,
            height: 28,
            borderRadius: "6px",
            color: "#94A3B8",
            "&:hover": { backgroundColor: "#FEF9C3", color: "#854D0E" },
          }}
        >
          <RemoveRounded sx={{ fontSize: 15 }} />
        </IconButton>

        <IconButton
          data-tauri-drag-region="false"
          onClick={handleMaximize}
          size="small"
          sx={{
            width: 28,
            height: 28,
            borderRadius: "6px",
            color: "#94A3B8",
            "&:hover": { backgroundColor: "#F1F5F9", color: "#0F172A" },
          }}
        >
          <CropSquareRounded sx={{ fontSize: 13 }} />
        </IconButton>

        <IconButton
          data-tauri-drag-region="false"
          onClick={handleClose}
          size="small"
          sx={{
            width: 28,
            height: 28,
            borderRadius: "6px",
            color: "#94A3B8",
            "&:hover": { backgroundColor: "#FEE2E2", color: "#DC2626" },
          }}
        >
          <CloseRounded sx={{ fontSize: 15 }} />
        </IconButton>
      </Box>
    </MuiAppBar>
  );
}

export default AppBar;