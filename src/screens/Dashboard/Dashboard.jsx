// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Box, Typography, Stack, Chip, Paper, Button, CircularProgress } from "@mui/material";
import AppLayout from "../../components/AppLayout";
import api from "../../config.json";
import StatsGrid, { C, fontFamily, cardTitleSx, bodyTextSx, PANEL_SX, METRIC_LABEL_SX, METRIC_VALUE_SX } from "./StatCard";
import TopPerformers from "./Top3";

// ─── API endpoints ────────────────────────────────────────────────────
const CYCLES_URL = `${api.apiBase}/api/admin/cycles/`;
const PARTICIPANTS_URL = `${api.apiBase}/api/admin/participants/`;
const PARTICIPANT_CYCLES_URL = `${api.apiBase}/api/admin/participant-cycles/`;
const ACTIVE_SCREEN_URL = `${api.apiBase}/api/get_active_screen/`;
const READINGS_URL = (id) => `${api.apiBase}/api/admin/participants/${id}/readings/?limit=20`;

const GAMES = [
  { id: "go-green", title: "Go Green", icon: "eco" },
  { id: "fanpower", title: "Fanpower", icon: "air" },
  { id: "expo", title: "Expo", icon: "auto_awesome" },
];

async function getJson(url) {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return res.json();
}
function getDataArray(result) {
  if (result.status !== "fulfilled") return [];
  const data = result.value?.data;
  return Array.isArray(data) ? data : [];
}
function buildSparklinePath(readings) {
  if (!readings || readings.length === 0) return "M0,20 L200,20";
  const values = readings.map((r) => Number(r.current_power) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (200 / (values.length - 1 || 1)) * i;
    const y = 36 - ((v - min) / range) * 32;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return points.join(" ");
}

// ─── Live scrolling trend line — auto-scales, no fixed ceiling ───────────
function buildLiveTrendPath(history, width = 400, height = 80) {
  if (!history || history.length < 2) {
    return {
      line: `M0,${height / 2} L${width},${height / 2}`,
      fill: `M0,${height} L0,${height / 2} L${width},${height / 2} L${width},${height} Z`,
    };
  }

  const max = Math.max(...history);
  const min = Math.min(...history);
  const range = max - min || 1;
  const pad = 8;

  const points = history.map((v, i) => {
    const x = (width / (history.length - 1)) * i;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fill = `${line} L${width},${height} L0,${height} Z`;

  return { line, fill };
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalCycles: 0, totalParticipants: 0, allocated: 0, unallocated: 0, utilizationRate: 0 });
  const [activeGame, setActiveGame] = useState(null);
  const [liveWindow, setLiveWindow] = useState(null);
  const [power, setPower] = useState({ current: 0, avgVoltage: 0, peakSurge: 0 });
  const [powerHistory, setPowerHistory] = useState([]);
  const [top3, setTop3] = useState([]);

  const fetchDashboardData = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    setError(null);
    try {
      const [cyclesRes, participantsRes, allocRes, screenRes] = await Promise.allSettled([
        getJson(CYCLES_URL), getJson(PARTICIPANTS_URL), getJson(PARTICIPANT_CYCLES_URL), getJson(ACTIVE_SCREEN_URL),
      ]);

      const cycles = getDataArray(cyclesRes);
      const participants = getDataArray(participantsRes);
      const allocations = getDataArray(allocRes);

      const totalCycles = cycles.length;
      const totalParticipants = participants.length;
      const allocated = allocations.length;
      const unallocated = Math.max(totalCycles - allocated, 0);
      const utilizationRate = totalCycles > 0 ? Math.round((allocated / totalCycles) * 100) : 0;

      setStats({ totalCycles, totalParticipants, allocated, unallocated, utilizationRate });

      const totalPower = allocations.reduce((sum, a) => sum + (Number(a.power) || 0), 0);
      const avgVoltage = allocations.length
        ? allocations.reduce((sum, a) => sum + (Number(a.voltage) || 0), 0) / allocations.length
        : 0;
      const peakSurge = allocations.length
        ? Math.max(...allocations.map((a) => Number(a.power) || 0))
        : 0;

      setPower((prev) => ({ ...prev, current: totalPower, avgVoltage, peakSurge }));

      // Keep a rolling window of the last 30 readings for the live trend line.
      setPowerHistory((prev) => {
        const next = [...prev, totalPower];
        return next.length > 30 ? next.slice(next.length - 30) : next;
      });

      const rankStyles = [
        { tier: "Gold", bar: "#f59e0b", bg: "#fef3c7", text: "#92400e" },
        { tier: "Silver", bar: "#94a3b8", bg: "#f1f5f9", text: "#475569" },
        { tier: "Bronze", bar: "#c08457", bg: "#ffedd5", text: "#9a3412" },
      ];

      const rankedAllocations = [...allocations]
        .filter((a) => a.participent != null)
        .sort((a, b) => (Number(b.total_power) || 0) - (Number(a.total_power) || 0))
        .slice(0, 3);

      const readingsResults = await Promise.allSettled(
        rankedAllocations.map((a) => getJson(READINGS_URL(a.participent)))
      );

      setTop3(
        rankedAllocations.map((allocation, index) => {
          const style = rankStyles[index];
          const readingsRes = readingsResults[index];
          const readings = readingsRes.status === "fulfilled" && readingsRes.value?.data ? readingsRes.value.data : [];
          return {
            rank: index + 1,
            ...style,
            name: allocation.participent_name || `Participant ${allocation.participent}`,
            team: `Participant ID: ${allocation.participent}`,
            cycle: allocation.cycle_no || `CYCLE ${allocation.cycle ?? "—"}`,
            duration: allocation.duration || "—",
            power: `${(Number(allocation.total_power) || 0).toFixed(1)} Wh`,
            voltage: `${(Number(allocation.voltage) || 0).toFixed(2)} V`,
            sparkline: buildSparklinePath(readings),
          };
        })
      );

      if (screenRes.status === "fulfilled" && screenRes.value) {
        const screen = screenRes.value;
        setActiveGame(screen?.game || null);
        setLiveWindow({ screen: screen?.name || "—", window: screen?.path || "—", runningFor: "—" });
      } else {
        setActiveGame(null);
        setLiveWindow(null);
      }

      const failedRequests = [cyclesRes, participantsRes, allocRes, screenRes].some((r) => r.status === "rejected");
      if (failedRequests) setError("Some dashboard data could not be loaded. Check the backend connection.");
    } catch (e) {
      console.error("Dashboard loading error:", e);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(true);
    const interval = setInterval(() => fetchDashboardData(false), 10000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const STATS = [
    { label: "Total Cycles", value: stats.totalCycles, icon: "pedal_bike", note: `${stats.totalCycles} units registered` },
    { label: "Total Participants", value: stats.totalParticipants, icon: "groups", note: "Across active teams" },
    { label: "Allocated (Engaged)", value: stats.allocated, icon: "link", note: `${stats.utilizationRate}% utilization rate`, chip: true },
    { label: "Unallocated", value: stats.unallocated, icon: "link_off", note: `${stats.unallocated} cycles free` },
  ];

  return (
    <AppLayout title="Dashboard">
      <Box
        sx={{
          backgroundColor: C.pageBg, fontFamily, width: "100%", height: "100%",
          minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column",
          gap: { xs: 1.5, md: 2 }, p: { xs: 1, sm: 1.5, md: 2 }, boxSizing: "border-box",
          overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none", msOverflowStyle: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {error && (
          <Typography
            role="status"
            sx={{ fontFamily, fontSize: 12, color: "#b91c1c", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", p: 1.25 }}
          >
            {error}
          </Typography>
        )}

        {/* Header */}
     

        {/* Stat cards */}
        <StatsGrid stats={STATS} />

        {/* Active Experience + Power Output */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }, gap: { xs: 1.5, md: 2 }, alignItems: "stretch" }}>
          <Paper elevation={0} sx={{ ...PANEL_SX, display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "flex-start", sm: "center" }, gap: 1, mb: 2 }}>
              <Typography sx={cardTitleSx}>Active Experience Mode</Typography>
              <Typography sx={{ fontFamily, fontSize: 12, color: C.labelColor, bgcolor: "#f3f4f6", px: 1, py: 0.25, borderRadius: "6px", ml: { xs: 0, sm: "auto" }, flexShrink: 0 }}>
                Session #8492
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
              {GAMES.map((game) => {
                const isActive = game.id === activeGame;
                return (
                  <Chip
                    key={game.id}
                    label={game.title}
                    sx={{
                      fontFamily, fontSize: 13, fontWeight: 700, height: 32,
                      bgcolor: isActive ? C.brandDark : "#f3f4f6",
                      color: isActive ? "#fff" : C.textSecondary,
                      transition: "background-color 200ms ease, color 200ms ease",
                    }}
                  />
                );
              })}
            </Stack>

            <Box sx={{ mt: "auto", p: { xs: 1.25, sm: 2 }, borderRadius: "10px", bgcolor: "#f9fafb", border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Currently Live</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: "auto", flexShrink: 0 }}>
                  <Chip size="small" label={liveWindow ? "running" : "idle"} sx={{ fontFamily, fontSize: 10, fontWeight: 700, bgcolor: C.activeChipBg, color: C.activeChipText }} />
                  <Box sx={{ width: 30, height: 30, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: C.activeChipBg, color: C.activeChipText, flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 17 }}>cast</span>
                  </Box>
                </Stack>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(3, minmax(0, 1fr))" }, gap: { xs: 1.5, sm: 1 }, textAlign: { xs: "left", sm: "center" } }}>
                {[
                  { label: "Screen", value: liveWindow?.screen || "—", color: C.textPrimary },
                  { label: "Window", value: liveWindow?.window || "—", color: C.textPrimary },
                  { label: "Running For", value: liveWindow?.runningFor || "—", color: C.accentText },
                ].map((item) => (
                  <Box key={item.label}>
                    <Typography sx={METRIC_LABEL_SX}>{item.label}</Typography>
                    <Typography sx={{ fontFamily, fontSize: { xs: 13, sm: 14, md: 15 }, fontWeight: 700, color: item.color }}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>

          {/* ─── Power Output card — live scrolling trend, no fixed ceiling ─── */}
          <Paper elevation={0} sx={PANEL_SX}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
              <Typography sx={{ ...cardTitleSx, flex: 1 }}>Instantaneous Microgrid Output</Typography>
              <Chip label="live" size="small" sx={{ fontFamily, fontSize: 10, fontWeight: 700, bgcolor: C.activeChipBg, color: C.activeChipText, flexShrink: 0 }} />
            </Box>

            <Stack direction="row" alignItems="baseline" spacing={1} useFlexGap flexWrap="wrap" sx={{ my: 1.5 }}>
              <Typography
                sx={{
                  fontFamily, fontSize: { xs: 34, sm: 40, md: 44 }, fontWeight: 800,
                  color: C.textPrimary, lineHeight: 1.1, fontVariantNumeric: "tabular-nums",
                  transition: "color 300ms ease",
                }}
              >
                {power.current.toFixed(2)}
                <Typography component="span" sx={{ fontFamily, fontSize: { xs: 16, sm: 19 }, fontWeight: 700, color: C.accentText, ml: 1 }}>
                  W
                </Typography>
              </Typography>
              <Typography sx={{ fontFamily, fontSize: 12, color: C.labelColor, ml: { xs: 0, sm: "auto" } }}>
                Combined output — live trend
              </Typography>
            </Stack>

            {/* Live scrolling trend — auto-scales to recent range, no cap */}
            <Box sx={{ width: "100%", height: 64, mb: 2 }}>
              {(() => {
                const { line, fill } = buildLiveTrendPath(powerHistory);
                return (
                  <svg width="100%" height="100%" viewBox="0 0 400 80" preserveAspectRatio="none">
                    <path d={fill} fill={C.accentText} opacity="0.1" style={{ transition: "d 500ms ease" }} />
                    <path
                      d={line}
                      fill="none"
                      stroke={C.accentText}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ transition: "d 500ms ease" }}
                    />
                  </svg>
                );
              })()}
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: { xs: 1.5, sm: 1 }, p: { xs: 1.25, sm: 1.75 }, bgcolor: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
              <Box>
                <Typography sx={METRIC_LABEL_SX}>Avg Voltage</Typography>
                <Typography sx={METRIC_VALUE_SX}>{power.avgVoltage.toFixed(2)} V</Typography>
              </Box>
              <Box>
                <Typography sx={METRIC_LABEL_SX}>Peak Surge</Typography>
                <Typography sx={{ ...METRIC_VALUE_SX, color: C.accentText }}>{power.peakSurge.toFixed(2)} W</Typography>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Top performers */}
        <TopPerformers top3={top3} loading={loading} />
      </Box>
    </AppLayout>
  );
}

export default Dashboard;