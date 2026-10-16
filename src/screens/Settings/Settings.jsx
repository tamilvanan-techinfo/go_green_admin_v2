/**
 * GoGreen Admin — Settings Page
 * Tauri v2 · MUI · React 18
 *
 * Drop-in replacement that uses YOUR existing theme.js.
 * Uses AppLayout wrapper from your project.
 *
 * Tabs:
 *  0  Monitor AC Meter   — waiting-for-data empty state + Config dialog + Export CSV
 *  1  Change Game        — game engine library selector
 *  2  Start New Match    — match staging orchestration
 *  3  Backend Settings   — Django + FastAPI connection management
 */

import React, { useState, useCallback } from 'react';
import AppLayout from '../../components/AppLayout';
import MonitorACMeter from './MonitorACMeter';
import BackendSettings from "./BackendSettings";
import GameChange from "./GameChange";

import {
  Box, Stack, Typography, Paper, Chip,
  Button, IconButton, Divider, Switch, Slider,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, LinearProgress,
} from '@mui/material';





// ─── Theme color constants (matching YOUR theme.js) ───────────────────────────
const C = {
  primary:        '#064E3B',
  primaryLight:   '#047857',
  primaryLighter: '#D1FAE5',
  primaryPale:    '#ECFDF5',
  secondary:      '#047857',
  secondaryLight: '#10B981',
  bg:             '#EFF1FF',
  paper:          '#FFFFFF',
  border:         '#D9DEEE',
  borderLight:    '#E2E8F0',
  textPrimary:    '#0F172A',
  textSecondary:  '#475569',
  textDisabled:   '#94A3B8',
  textMuted:      '#64748B',
  surfaceHover:   '#F8FAFC',
  surfaceSubtle:  '#F4F6FF',
  surfaceGreen:   '#F0FDF4',
  success:        '#10B981',
  successDark:    '#065F46',
  successBg:      '#ECFDF5',
  warning:        '#F59E0B',
  warningBg:      '#FEF3C7',
  warningDark:    '#92400E',
  error:          '#DC2626',
  errorBg:        '#FEE2E2',
  errorDark:      '#B91C1C',
};

// ─── Small reusable primitives ────────────────────────────────────────────────
const MonoText = ({ children, sx, component = 'span', ...rest }) => (
  <Typography
    component={component}
    sx={{ fontFamily: '"JetBrains Mono", monospace', ...sx }}
    {...rest}
  >
    {children}
  </Typography>
);

const StatusDot = ({ color = C.success, pulse = false, size = 8 }) => (
  <Box component="span" sx={{
    display: 'inline-block',
    width: size, height: size,
    borderRadius: '50%',
    bgcolor: color,
    flexShrink: 0,
    ...(pulse && {
      animation: 'gg-pulse 1.6s ease-in-out infinite',
      '@keyframes gg-pulse': {
        '0%,100%': { opacity: 1 },
        '50%':     { opacity: 0.3 },
      },
    }),
  }} />
);

// Pill badge — telemetry style
const Pill = ({ label, bg = C.primaryLighter, color = C.primary, mono = true }) => (
  <Box sx={{
    display: 'inline-flex', alignItems: 'center',
    px: 1.25, py: 0.25, borderRadius: 9999,
    bgcolor: bg,
  }}>
    {mono
      ? <MonoText sx={{ fontSize: '0.6875rem', color, fontWeight: 600, lineHeight: 1.4 }}>{label}</MonoText>
      : <Typography sx={{ fontSize: '0.6875rem', color, fontWeight: 600, lineHeight: 1.4, fontFamily: 'Inter, sans-serif' }}>{label}</Typography>
    }
  </Box>
);

// Card wrapper — uses your MuiCard/MuiPaper theme styles
const SCard = ({ children, sx, ...rest }) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      border: `1px solid ${C.border}`,
      borderRadius: '14px',
      bgcolor: C.paper,
      boxShadow: '0 2px 10px rgba(15,23,42,0.035)',
      ...sx,
    }}
    {...rest}
  >
    {children}
  </Paper>
);

// Section title row inside a card
const CardTitle = ({ title, subtitle, action }) => (
  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2} mb={2.5}>
    <Box>
      <Typography variant="h6" sx={{ color: C.textPrimary, fontWeight: 700 }}>{title}</Typography>
      
    </Box>
    {action}
  </Stack>
);

// ─── Settings Tab Bar ─────────────────────────────────────────────────────────
const SETTING_TABS = [
  {
    key: 'acmeter',
    icon: 'offline_bolt',
    label: 'Monitor AC Meter',
    

   
  },
  {
    key: 'changegame',
    icon: 'sports_esports',
    label: 'Change Game',
   
  },
  {
    key: 'newmatch',
    icon: 'sports_score',
    label: 'Start New Match',
   
  },
  {
    key: 'backend',
    icon: 'dns',
    label: 'Backend Settings',
   
  },
];


const SETTINGS_STORAGE_KEY = "settings.activeTab";

function getInitialSettingsTab() {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);

    return SETTING_TABS.some((tab) => tab.key === saved)
      ? saved
      : "acmeter";
  } catch {
    return "acmeter";
  }
}

function SettingsTabBar({ active, onChange }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
        },
        gap: { xs: 1, sm: 1.25 },
        p: { xs: 0.75, sm: 1 },
        mb: { xs: 2.5, sm: 3 },
        bgcolor: "#F4F6FF",
        border: "1px solid #D9DEEE",
        borderRadius: { xs: "12px", sm: "16px" },
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {SETTING_TABS.map((tab) => {
        const isActive = active === tab.key;

        return (
          <Box
            key={tab.key}
            component="button"
            type="button"
            onClick={() => onChange(tab.key)}
            aria-pressed={isActive}
            sx={{
              appearance: "none",
              WebkitTapHighlightColor: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: { xs: 1, sm: 1.5 },
              minWidth: 0,
              minHeight: { xs: 62, sm: 72, md:74  },
              px: { xs: 1.25, sm: 2, md: 2.25 },
              py: { xs: 1.25, sm: 1.75 },
              borderRadius: { xs: "9px", sm: "12px" },
              border: "1px solid",
              borderColor: isActive ? "#064E3B" : "transparent",
              bgcolor: isActive ? "#FFFFFF" : "transparent",
              color: isActive ? "#064E3B" : "#475569",
              boxShadow: isActive
                ? "0 2px 5px rgba(6,78,59,0.08), 0 1px 2px rgba(15,23,42,0.04)"
                : "none",
              cursor: "pointer",
              textAlign: "left",
              font: "inherit",
              transition:
                "background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
              "&:hover": {
                bgcolor: isActive ? "#FFFFFF" : "#FFFFFF",
                borderColor: isActive ? "#064E3B" : "#D9DEEE",
              },
              "&:focus-visible": {
                outline: "2px solid #047857",
                outlineOffset: 2,
              },
              "&:active": {
                bgcolor: "#ECFDF5",
              },
            }}
          >
            {/* Icon container */}
            <Box
              sx={{
                width: { xs: 34, sm: 42 },
                height: { xs: 34, sm: 42 },
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: { xs: "8px", sm: "10px" },
                bgcolor: isActive ? "#D1FAE5" : "#E9ECF7",
                color: isActive ? "#064E3B" : "#64748B",
                transition: "background-color 160ms ease",
              }}
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
                style={{
                  fontSize: 22,
                  lineHeight: 1,
                }}
              >
                {tab.icon}
              </span>
            </Box>

            {/* Tab label */}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: { xs: "14px", sm: "16px", md: "18px" },
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? "#064E3B" : "#334155",
                  lineHeight: 1.4,
                  overflowWrap: "anywhere",
                }}
              >
                {tab.label}
              </Typography>

              <Typography
                sx={{
                  mt: 0.35,
                  fontSize: { xs: "10px", sm: "11px" },
                  lineHeight: 1.3,
                  color: "#64748B",
                  display: { xs: "none", sm: "block" },
                }}
              >
                {tab.key === "acmeter" && "Live meter monitoring"}
                {tab.key === "changegame" && "Game mode selection"}
                {tab.key === "newmatch" && "Match configuration"}
                {tab.key === "backend" && "Server connections"}
              </Typography>
            </Box>

            {/* Active indicator */}
            {isActive && (
              <Box
                sx={{
                  width: 5,
                  alignSelf: "stretch",
                  flexShrink: 0,
                  borderRadius: 99,
                  bgcolor: "#047857",
                  display: { xs: "none", sm: "block" },
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}



// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Change Game
// ═══════════════════════════════════════════════════════════════════════════════
const GAMES = [
  {
    id: 'hill',
    title: 'Hill Climb Watts Challenge',
    tag: 'Dynamic Grade %',
    mode: 'Single / Multi',
    desc: 'Simulates alpine elevation resistance. Smart trainers increase magnetic resistance proportionally to track grade up to 14%.',
    stats: [['Profile', 'Alpe d\'Huez Sim'], ['Difficulty', 'High (Endurance)'], ['Physics', 'Newtonian v4'], ['Duration', '5–12 min']],
    action: 'Switch to Hill Climb',
    iconBg: `linear-gradient(135deg, #064E3B22 0%, #047857aa 100%)`,
    icon: 'landscape',
  },
  {
    id: 'neon',
    title: 'Neon Velocity Battle',
    tag: 'High Agility Sprint',
    mode: 'Direct Shootout',
    desc: 'Head-to-head elimination sprint. Cyclists draft behind energy light walls; sudden watt surges trigger nitro boost multipliers.',
    stats: [['Profile', 'Sprint Arena 200m'], ['Difficulty', 'Max Anaerobic'], ['Physics', 'Arcade Precision'], ['Duration', '90 sec']],
    action: 'Switch to Neon Battle',
    iconBg: `linear-gradient(135deg, #0d1f17 0%, #064E3Bdd 100%)`,
    icon: 'bolt',
  },
  {
    id: 'city',
    title: 'Eco-Power City Builder',
    tag: 'Co-Op Gamification',
    mode: '4-Player Cooperative',
    desc: 'Collaborative challenge where cumulative watts activate power sectors, monorails, and clean water facilities in real-time.',
    stats: [['Profile', 'Metropolis Grid'], ['Difficulty', 'Steady Aerobic'], ['Physics', 'Cumulative Joules'], ['Duration', '4–8 min']],
    action: 'Switch to City Builder',
    iconBg: `linear-gradient(135deg, #D1FAE5aa 0%, #064E3B44 100%)`,
    icon: 'apartment',
  },
];

function ChangeGameTab({ onToast }) {
  return (
    <Stack gap={3}>
      {/* Active engine */}
      <SCard>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" gap={2}>
          <Stack direction="row" alignItems="center" gap={2}>
            <Box sx={{
              width: 60, height: 60, borderRadius: '12px', flexShrink: 0,
              bgcolor: C.primaryLighter,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: C.primary }}>sports_motorsports</span>
            </Box>
            <Box>
              <Stack direction="row" alignItems="center" gap={1.5} mb={0.5}>
                <Pill label="Active Engine" bg={C.primaryLighter} color={C.primary} />
                <Typography variant="caption" sx={{ color: C.textMuted }}>Arena Display 1-4 Synced</Typography>
              </Stack>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>Velodrome Sprint Pro v2.4</Typography>
              <Typography variant="body2" sx={{ mt: 0.25 }}>
                Professional banking track physics, live cadence/watt resistance mapping, and spectator broadcast HUD.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" gap={2} sx={{ flexShrink: 0 }}>
            <MonoText sx={{ fontSize: '11px', color: C.textMuted }}>60 FPS Lock</MonoText>
            <Button
              variant="outlined"
              size="small"
              startIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>replay</span>}
              onClick={() => onToast('Engine broadcast initiated: Reloading Velodrome Sprint Pro on displays 1-4…')}
            >
              Force Reset Engine
            </Button>
          </Stack>
        </Stack>
      </SCard>

      {/* Library header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Available Gamification Engines</Typography>
        <Typography variant="body2">Select an experience to deploy to all athlete terminals</Typography>
      </Stack>

      {/* Game cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        {GAMES.map((g) => (
          <SCard key={g.id} sx={{
            p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': { boxShadow: '0 6px 20px rgba(15,23,42,0.1)', transform: 'translateY(-1px)' },
          }}>
            {/* Visual area */}
            <Box sx={{
              height: 160, background: g.iconBg, position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderBottom: `1px solid ${C.borderLight}`,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 52, color: 'rgba(255,255,255,0.18)' }}>
                {g.icon}
              </span>
              <Box sx={{ position: 'absolute', top: 10, left: 10 }}>
                <Pill label={g.tag} bg={`${C.paper}ee`} color={C.textPrimary} mono={false} />
              </Box>
              <Box sx={{ position: 'absolute', bottom: 10, right: 10 }}>
                <Pill label={g.mode} bg={C.primaryLighter} color={C.primary} />
              </Box>
            </Box>

            <Stack gap={2} p={2.5} sx={{ flex: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>{g.title}</Typography>
                <Typography variant="body2">{g.desc}</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {g.stats.map(([k, v]) => (
                  <Box key={k}>
                    <MonoText sx={{ fontSize: '10px', color: C.textMuted, display: 'block' }}>{k}</MonoText>
                    <MonoText sx={{ fontSize: '11px', color: C.textPrimary, fontWeight: 700 }}>{v}</MonoText>
                  </Box>
                ))}
              </Box>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                startIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>swap_horiz</span>}
                onClick={() => onToast(`Deploying ${g.title} to all athlete terminals…`)}
                sx={{ mt: 'auto', '&:hover': { bgcolor: C.primaryLighter, borderColor: C.primary } }}
              >
                {g.action}
              </Button>
            </Stack>
          </SCard>
        ))}
      </Box>
    </Stack>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Start New Match
// ═══════════════════════════════════════════════════════════════════════════════
const MATCH_TYPES = [
  { value: 'sprint',    icon: 'sprint',  label: 'Single Sprint', sub: '500m Dash' },
  { value: 'timetrial', icon: 'timer',   label: 'Time Trial',    sub: '3:00 Fixed' },
  { value: 'relay',     icon: 'groups',  label: 'Team Relay',    sub: '2×2 Tag' },
  { value: 'watt',      icon: 'bolt',    label: 'Watt Battle',   sub: 'Highest Avg' },
];
const LANES = [
  { id: 'L1', name: 'Harrison P. (Eng Dept)',     ftp: '285W', status: 'Assigned' },
  { id: 'L2', name: 'Elena R. (Design Ops)',       ftp: '240W', status: 'Assigned' },
  { id: 'L3', name: 'Marcus T. (Sustainability)',  ftp: '310W', status: 'Assigned' },
  { id: 'L4', name: 'Open Station (Guest Rider)',  ftp: null,   status: 'empty' },
];

function StartNewMatchTab({ onToast }) {
  const [matchType, setMatchType] = useState('sprint');
  const [countdown, setCountdown] = useState('10');
  const [sound, setSound] = useState(true);
  const [hud, setHud]     = useState(true);

  return (
    <Stack gap={3}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 3 }}>
        {/* Left: config */}
        <Stack gap={3}>
          <SCard sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CardTitle
              title="Match Staging & Format Orchestration"
              subtitle="Configure session boundaries, telemetry triggers, and spectator overlays"
            />

            {/* Race type */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: C.textPrimary, display: 'block', mb: 1 }}>
                Race Discipline / Mode
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
                {MATCH_TYPES.map((m) => {
                  const active = matchType === m.value;
                  return (
                    <Box
                      key={m.value}
                      onClick={() => setMatchType(m.value)}
                      sx={{
                        p: 1.5, borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                        bgcolor: active ? C.primaryLighter : C.bg,
                        border: `1px solid ${active ? C.primary : C.borderLight}`,
                        color: active ? C.primary : C.textSecondary,
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: active ? C.primaryLighter : C.surfaceGreen },
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, display: 'block', marginBottom: 4, color: 'inherit' }}>
                        {m.icon}
                      </span>
                      <Typography sx={{ fontSize: '12px', fontWeight: 700, color: 'inherit', lineHeight: 1.2 }}>{m.label}</Typography>
                      <MonoText sx={{ fontSize: '10px', color: 'inherit', opacity: 0.7, mt: 0.25 }}>{m.sub}</MonoText>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Countdown + leaderboard */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: C.textPrimary, display: 'block', mb: 1 }}>
                  Countdown Delay
                </Typography>
                <Stack direction="row" gap={1}>
                  {[['5', '5 sec (Fast)'], ['10', '10 sec (Std.)']].map(([v, l]) => (
                    <Box
                      key={v}
                      onClick={() => setCountdown(v)}
                      sx={{
                        flex: 1, py: 1.125, borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                        bgcolor: countdown === v ? C.primary : C.bg,
                        color: countdown === v ? '#fff' : C.textSecondary,
                        border: `1px solid ${countdown === v ? C.primary : C.borderLight}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <MonoText sx={{ fontSize: '11px', color: 'inherit' }}>{l}</MonoText>
                    </Box>
                  ))}
                </Stack>
              </Box>
              <FormControl size="small" fullWidth>
                <InputLabel>Leaderboard Persistence</InputLabel>
                <Select defaultValue="corporate" label="Leaderboard Persistence">
                  <MenuItem value="corporate">Corporate Annual Championship 2025</MenuItem>
                  <MenuItem value="daily">Daily Sprint Leaderboard</MenuItem>
                  <MenuItem value="exhibition">Exhibition Mode (No Global Score)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Toggles */}
            <Divider />
            <Stack gap={2}>
              {[
                { key: 'sound', val: sound, set: setSound, label: 'Arena Sound FX & Starter Horn', sub: 'Triggers 3-2-1 tone sequence to velodrome PA system' },
                { key: 'hud',   val: hud,   set: setHud,   label: 'Broadcast HUD Graphics',        sub: 'Output live telemetry bars to HDMI Overlays 1 & 2' },
              ].map((row) => (
                <Stack key={row.key} direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px', display: 'block' }}>{row.label}</Typography>
                    <Typography variant="body2" sx={{ color: C.textSecondary }}>{row.sub}</Typography>
                  </Box>
                  <Switch checked={row.val} onChange={e => row.set(e.target.checked)} />
                </Stack>
              ))}
            </Stack>
          </SCard>

          {/* Launch CTA */}
          <SCard sx={{ py: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2}>
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>
                  Pre-Race Verification Passed
                </Typography>
                <MonoText sx={{ fontSize: '11px', color: C.success }}>
                  All 4 Bike Stations Latency &lt; 8ms · AC Inverters Armed
                </MonoText>
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={<span className="material-symbols-outlined" style={{ fontSize: 22 }}>flag</span>}
                onClick={() => onToast('Countdown initiated! Audio FX queued and arena displays locked.')}
                sx={{ flexShrink: 0, fontWeight: 700, px: 3 }}
              >
                Initiate Race &amp; Sync Displays
              </Button>
            </Stack>
          </SCard>
        </Stack>

        {/* Right: lane allocations */}
        <SCard sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Bike Station Allocations</Typography>
              <Typography variant="body2" sx={{ mt: 0.25 }}>Assign authenticated riders to lanes</Typography>
            </Box>
            <Button size="small" sx={{ color: C.secondary, fontSize: '12px', fontWeight: 600, px: 0 }}>
              Re-seed Lanes
            </Button>
          </Stack>

          {LANES.map((lane) => (
            <Stack key={lane.id} direction="row" alignItems="center" justifyContent="space-between" gap={1.5}
              sx={{ bgcolor: C.bg, p: 1.5, borderRadius: '10px', border: `1px solid ${C.borderLight}` }}>
              <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
                <Box sx={{
                  width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
                  bgcolor: lane.status === 'empty' ? C.surfaceSubtle : C.primaryLighter,
                  color: lane.status === 'empty' ? C.textSecondary : C.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${C.borderLight}`,
                }}>
                  <MonoText sx={{ fontSize: '10px', fontWeight: 700, color: 'inherit' }}>{lane.id}</MonoText>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lane.name}
                  </Typography>
                  <MonoText sx={{ fontSize: '10px', color: C.textMuted }}>
                    {lane.ftp ? `FTP: ${lane.ftp} · ANT+ Ready` : 'NFC Tap or Bluetooth Auto'}
                  </MonoText>
                </Box>
              </Stack>
              {lane.status === 'Assigned' ? (
                <Chip label="Assigned" color="success" size="small" />
              ) : (
                <Button size="small" variant="outlined" sx={{ fontSize: '12px', px: 1.5, flexShrink: 0 }}>
                  Assign NFC
                </Button>
              )}
            </Stack>
          ))}

          {/* Jumbotron feed */}
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ bgcolor: C.bg, p: 1.5, borderRadius: '10px', border: `1px solid ${C.borderLight}`, mt: 'auto' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: C.secondary }}>tv</span>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>Jumbotron Main Feed</Typography>
              <Typography variant="caption">Will display countdown screen upon trigger</Typography>
            </Box>
            <StatusDot color={C.success} pulse />
          </Stack>
        </SCard>
      </Box>
    </Stack>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — Backend Settings
// ═══════════════════════════════════════════════════════════════════════════════
const DAEMONS = [
  { name: 'modbusd (RS485 Core)',   pid: 'PID 1092', cpu: '0.8% CPU',  status: 'online' },
  { name: 'telemetry-hub (WSS)',    pid: 'PID 1144', cpu: '1.2% CPU',  status: 'online' },
  { name: 'unity-display-sync',    pid: 'PID 1589', cpu: '4.6% CPU',  status: 'online' },
  { name: 'sqlite-wal-logger',     pid: 'PID 1602', cpu: '0.1% CPU',  status: 'online' },
];

function BackendSettingsTab({ onToast }) {
  const [tokenVisible, setTokenVisible] = useState(false);
  const [gpuRaster, setGpuRaster]       = useState(true);
  const [crcCheck, setCrcCheck]         = useState(true);
  const [bufferSize, setBufferSize]     = useState(256);

  const copy = (text, label) =>
    navigator.clipboard.writeText(text).then(() => onToast(`Copied: ${label}`));

  return (
    <Stack gap={3}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 3 }}>
        {/* Left */}
        <Stack gap={3}>
          {/* Telemetry ingestion */}
          <SCard sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CardTitle
              title="High-Frequency Telemetry Ingestion"
              subtitle="Real-time socket streams handling cadence, watt vectors, and inverter thermals"
            />

            {/* WS endpoint */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: C.textPrimary, display: 'block', mb: 0.75 }}>
                WebSocket Ingestion Endpoint
              </Typography>
              <Stack direction="row" gap={1}>
                <Box sx={{
                  flex: 1, bgcolor: C.bg, px: 2, py: 1.25, borderRadius: '8px',
                  border: `1px solid ${C.borderLight}`, overflowX: 'auto',
                }}>
                  <MonoText sx={{ fontSize: '12px', color: C.textPrimary, whiteSpace: 'nowrap' }}>
                    wss://telemetry.gogreen.internal:8443/cycle/v2/stream
                  </MonoText>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<span className="material-symbols-outlined" style={{ fontSize: 14 }}>content_copy</span>}
                  onClick={() => copy('wss://telemetry.gogreen.internal:8443/cycle/v2/stream', 'WebSocket URL')}
                  sx={{ flexShrink: 0 }}
                >
                  Copy
                </Button>
              </Stack>
              <Stack direction="row" alignItems="center" gap={0.75} mt={0.75}>
                <StatusDot color={C.success} pulse />
                <MonoText sx={{ fontSize: '11px', color: C.successDark }}>
                  Socket status: Connected · 1,240 pkts/sec
                </MonoText>
              </Stack>
            </Box>

            {/* Buffer slider */}
            <Divider />
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px', display: 'block' }}>
                    SQLite Local Fallback Buffer
                  </Typography>
                  <Typography variant="body2">Preserves kinematic records during arena LAN disconnects</Typography>
                </Box>
                <MonoText sx={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>{bufferSize} packets</MonoText>
              </Stack>
              <Slider
                min={64} max={1024} step={64}
                value={bufferSize}
                onChange={(_, v) => setBufferSize(v)}
                marks={[
                  { value: 64,   label: '64' },
                  { value: 256,  label: '256 ✓' },
                  { value: 1024, label: '1024' },
                ]}
                sx={{
                  color: C.primary,
                  '& .MuiSlider-rail': { bgcolor: C.borderLight },
                  '& .MuiSlider-mark': { bgcolor: C.border },
                  '& .MuiSlider-markLabel': { fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: C.textMuted },
                }}
              />
            </Box>

            {/* Toggles */}
            <Divider />
            <Stack gap={2.5}>
              {[
                { key: 'gpu', val: gpuRaster, set: setGpuRaster, label: 'Hardware GPU Rasterization for Displays', sub: 'Force Vulkan backend on Jumbotron rendering pipelines' },
                { key: 'crc', val: crcCheck,  set: setCrcCheck,  label: 'Modbus CRC-16 Checksum Enforcement',     sub: 'Silently drop corrupted packets without re-transmission lag' },
              ].map((row) => (
                <Stack key={row.key} direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px', display: 'block' }}>{row.label}</Typography>
                    <Typography variant="body2">{row.sub}</Typography>
                  </Box>
                  <Switch checked={row.val} onChange={e => row.set(e.target.checked)} />
                </Stack>
              ))}
            </Stack>
          </SCard>

          {/* API token */}
          <SCard sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Master Broadcast API Token</Typography>
              <Chip label="Bearer Active" color="success" size="small" />
            </Stack>
            <Typography variant="body2">
              Bearer token for REST relays, OBS scoreboard bots, and external timing gates.
            </Typography>
            <Stack direction="row" gap={1}>
              <Box sx={{
                flex: 1, bgcolor: C.bg, px: 2, py: 1.25, borderRadius: '8px',
                border: `1px solid ${C.borderLight}`,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '12px', color: C.textPrimary,
                letterSpacing: tokenVisible ? '0' : '0.12em',
                overflow: 'hidden',
              }}>
                {tokenVisible ? 'gg_live_84f901cb290e29d71aa104992bb' : '•'.repeat(28)}
              </Box>
              <IconButton
                size="small"
                onClick={() => setTokenVisible(v => !v)}
                sx={{ borderRadius: '8px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {tokenVisible ? 'visibility_off' : 'visibility'}
                </span>
              </IconButton>
              <Button
                variant="contained"
                size="small"
                startIcon={<span className="material-symbols-outlined" style={{ fontSize: 14 }}>content_copy</span>}
                onClick={() => copy('gg_live_84f901cb290e29d71aa104992bb', 'API Token')}
              >
                Copy Token
              </Button>
            </Stack>
          </SCard>
        </Stack>

        {/* Right */}
        <Stack gap={3}>
          {/* Daemon status */}
          <SCard sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Daemon Subsystems Status</Typography>
            <Stack gap={1}>
              {DAEMONS.map((d) => (
                <Stack key={d.name} direction="row" alignItems="center" justifyContent="space-between"
                  sx={{ bgcolor: C.bg, px: 2, py: 1.25, borderRadius: '8px', border: `1px solid ${C.borderLight}` }}>
                  <Stack direction="row" alignItems="center" gap={1.25}>
                    <StatusDot color={C.success} />
                    <MonoText sx={{ fontSize: '12px', color: C.textPrimary, fontWeight: 600 }}>{d.name}</MonoText>
                  </Stack>
                  <MonoText sx={{ fontSize: '10px', color: C.textMuted }}>{d.pid} · {d.cpu}</MonoText>
                </Stack>
              ))}
            </Stack>
            <Divider />
            <Button
              fullWidth
              variant="outlined"
              startIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>restart_alt</span>}
              onClick={() => onToast('Restart signal sent to all daemon subsystems.')}
            >
              Restart All Daemons
            </Button>
          </SCard>

          {/* Host specs */}
          <SCard>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Host Node Specs</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {[
                ['Architecture', 'Linux x86_64'],
                ['Kernel', '6.5.0-velodrome'],
                ['Interface', 'eth0 (10GbE SFP+)'],
                ['Memory', '32 GB ECC DDR5'],
              ].map(([k, v]) => (
                <Box key={k}>
                  <MonoText sx={{ fontSize: '10px', color: C.textMuted, display: 'block', mb: 0.25 }}>{k}</MonoText>
                  <MonoText sx={{ fontSize: '12px', color: C.textPrimary, fontWeight: 700 }}>{v}</MonoText>
                </Box>
              ))}
            </Box>
          </SCard>
        </Stack>
      </Box>
    </Stack>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT — Settings Page
// ═══════════════════════════════════════════════════════════════════════════════
function Settings() {
  const [activeTab, setActiveTab] = useState(getInitialSettingsTab);
  const handleSettingsTabChange = useCallback((key)=>{
    setActiveTab(key);

    try{
      localStorage.setItem(SETTINGS_STORAGE_KEY, key);
    }catch{

    }
  }, []);


  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, severity = "success") => {
    setToast({ message, severity });
  }, []);


  return (
    <AppLayout title="Settings">
      {/* Google Fonts + Material Symbols */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        rel="stylesheet"
      />

      <Box
        sx={{
          width: "100%",
          maxWidth: "none",
          minWidth: 0,
          mx: 0,
          px: 0,
          py: 2.5,
          boxSizing: "border-box",
        }}
      >
   
        <SettingsTabBar active={activeTab} onChange={handleSettingsTabChange} />

        {activeTab === 'acmeter' && <MonitorACMeter />}
        {activeTab === 'changegame' && <GameChange />}
        {activeTab === 'newmatch'   && <StartNewMatchTab   onToast={showToast} />}
        {activeTab === "backend" && <BackendSettings/>}
      </Box>

  

      {/* Global toast */}
  

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {toast && (
          <Alert
            severity={toast.severity}
            onClose={() => setToast(null)}
            sx={{ alignItems: "center" }}
          >
            {toast.message}
          </Alert>
        )}
      </Snackbar>

    </AppLayout>
  );
}

export default Settings;