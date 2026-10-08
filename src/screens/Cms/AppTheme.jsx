import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Grid,
  Typography,
  TextField,
  Autocomplete,
  Button,
  Divider,
  Chip,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Skeleton,
  Badge,
  IconButton,
  Tooltip,
} from "@mui/material";
import BrushIcon from "@mui/icons-material/Brush";
import PaletteIcon from "@mui/icons-material/Palette";
import BoltIcon from "@mui/icons-material/Bolt";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import MonitorIcon from "@mui/icons-material/Monitor";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SensorsIcon from "@mui/icons-material/Sensors";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import EnergySavingsLeafIcon from "@mui/icons-material/EnergySavingsLeaf";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import SaveIcon from "@mui/icons-material/Save";
import PublishIcon from "@mui/icons-material/Publish";
import api from "../../config.json";
import { useSocket } from "../../context/SocketContext";

// Design tokens for the admin UI itself (not the theme being edited).
export const tokens = {
  ink: "#0A0F1C",
  panel: "#121A2C",
  panelAlt: "#0E1524",
  line: "#22304A",
  lineLight: "#E3E8F0",
  current: "#22D3C4",
  currentDark: "#0F9C90",
  signal: "#FFB020",
  signalDark: "#C97F00",
  paperLight: "#F5F7FA",
  textLightSecondary: "#5B6472",
  // Studio palette
  brand: "#064E3B", // dark green (buttons, headings)
  brandSoft: "#D1FAE5",
  brandAccent: "#10B981",
  border: "#C9D3E0",
  surface: "#F8FAFC",
  mono: "'JetBrains Mono', 'Roboto Mono', monospace",
};

const MONO = tokens.mono;

const COLOR_FIELDS = [
  { key: "backgroundGradient", label: "Background Gradient" },
  { key: "headerBorder", label: "Header Border" },
  { key: "headerBorderShadow", label: "Border Shadow" },
  { key: "white", label: "Text Accent" },
  { key: "green", label: "Sub Text / Metrics" },
  { key: "gold", label: "Screen Title" },
  { key: "highlightBorder", label: "Highlight Border" },
  { key: "highlightShadow", label: "Highlight Shadow" },
  { key: "normalRowBorder", label: "Normal Row Border" },
  { key: "circleBg", label: "Circle Background" },
  { key: "circleHighlightBorder", label: "Circle Highlight Border" },
  { key: "circleHighlightShadow", label: "Circle Highlight Shadow" },
];

const THEME_FIELDS = [
  { key: "bg", label: "Background" },
  { key: "bgGradient", label: "Background Gradient" },
  { key: "panel", label: "Panel" },
  { key: "panelBorder", label: "Panel Border" },
  { key: "panelGlow", label: "Panel Glow" },
  { key: "neon", label: "Neon (Primary)" },
  { key: "neonSoft", label: "Neon Soft" },
  { key: "gold", label: "Top Rank" },
  { key: "text", label: "Text" },
  { key: "subtext", label: "Subtext" },
  { key: "muted", label: "Muted" },
  { key: "divider", label: "Divider" },
];

const FONT_OPTIONS = [
  { value: "'Poppins', sans-serif", label: "Poppins", group: "Sans-serif" },
  { value: "'Inter', sans-serif", label: "Inter", group: "Sans-serif" },
  { value: "'Roboto', sans-serif", label: "Roboto", group: "Sans-serif" },
  { value: "'Montserrat', sans-serif", label: "Montserrat", group: "Sans-serif" },
  { value: "'Rubik', sans-serif", label: "Rubik", group: "Sans-serif" },
  { value: "'Work Sans', sans-serif", label: "Work Sans", group: "Sans-serif" },
  { value: "'Nunito', sans-serif", label: "Nunito", group: "Sans-serif" },
  { value: "'Lato', sans-serif", label: "Lato", group: "Sans-serif" },
  { value: "'Open Sans', sans-serif", label: "Open Sans", group: "Sans-serif" },
  { value: "'Manrope', sans-serif", label: "Manrope", group: "Sans-serif" },
  { value: "'Oswald', sans-serif", label: "Oswald", group: "Display" },
  { value: "'Bebas Neue', sans-serif", label: "Bebas Neue", group: "Display" },
  { value: "'Anton', sans-serif", label: "Anton", group: "Display" },
  { value: "'Archivo Black', sans-serif", label: "Archivo Black", group: "Display" },
  { value: "'Playfair Display', serif", label: "Playfair Display", group: "Serif" },
  { value: "'Merriweather', serif", label: "Merriweather", group: "Serif" },
  { value: "'Lora', serif", label: "Lora", group: "Serif" },
  { value: "'Roboto Mono', monospace", label: "Roboto Mono", group: "Monospace" },
  { value: "'JetBrains Mono', monospace", label: "JetBrains Mono", group: "Monospace" },
  { value: "'Space Mono', monospace", label: "Space Mono", group: "Monospace" },
  { value: "'IBM Plex Mono', monospace", label: "IBM Plex Mono", group: "Monospace" },
];

const DEFAULT_FONT_FAMILY = FONT_OPTIONS[0].value;

// ---------------------------------------------------------------
// Color parsing helpers
// ---------------------------------------------------------------

const COLOR_TOKEN_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;

const isHex = (v) => typeof v === "string" && /^#([0-9a-fA-F]{3,8})$/.test(v.trim());
const isRgba = (v) => typeof v === "string" && /^rgba?\(/i.test(v.trim());
const isCompound = (v) =>
  typeof v === "string" && (v.includes("gradient(") || (v.match(COLOR_TOKEN_RE) || []).length > 1);

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const num = parseInt(h.slice(0, 6), 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")).join("");
}

function toHexAlpha(value) {
  if (!value) return { hex: "#000000", alpha: 1 };
  const v = value.trim();
  if (isHex(v)) {
    const { r, g, b } = hexToRgb(v);
    let alpha = 1;
    const h = v.replace("#", "");
    if (h.length === 4) alpha = parseInt(h[3] + h[3], 16) / 255;
    if (h.length === 8) alpha = parseInt(h.slice(6, 8), 16) / 255;
    return { hex: rgbToHex(r, g, b), alpha: Math.round(alpha * 100) / 100 };
  }
  const m = v.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
    const [r, g, b, a = 1] = parts;
    return { hex: rgbToHex(r || 0, g || 0, b || 0), alpha: isNaN(a) ? 1 : a };
  }
  return { hex: null, alpha: 1 };
}

function fromHexAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  if (alpha >= 1) return rgbToHex(r, g, b);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function replaceColorTokens(source, newTokens) {
  let i = 0;
  return source.replace(COLOR_TOKEN_RE, () => newTokens[i++] ?? "");
}

function extractColorTokens(source) {
  return source.match(COLOR_TOKEN_RE) || [];
}

const APP_THEME_ENDPOINT = api.apiBase + "/api/admin/app-theme/";
const APP_THEMES_LIST_ENDPOINT = api.apiBase + "/api/admin/app-theme-list/";

const COLORS_SNAKE_TO_CAMEL = {
  colors_background_gradient: "backgroundGradient",
  colors_header_border: "headerBorder",
  colors_header_border_shadow: "headerBorderShadow",
  colors_white: "white",
  colors_green: "green",
  colors_gold: "gold",
  colors_highlight_border: "highlightBorder",
  colors_highlight_shadow: "highlightShadow",
  colors_normal_row_border: "normalRowBorder",
  colors_circle_bg: "circleBg",
  colors_circle_highlight_border: "circleHighlightBorder",
  colors_circle_highlight_shadow: "circleHighlightShadow",
};

const THEME_SNAKE_TO_CAMEL = {
  theme_bg: "bg",
  theme_bg_gradient: "bgGradient",
  theme_panel: "panel",
  theme_panel_border: "panelBorder",
  theme_panel_glow: "panelGlow",
  theme_neon: "neon",
  theme_neon_soft: "neonSoft",
  theme_gold: "gold",
  theme_text: "text",
  theme_subtext: "subtext",
  theme_muted: "muted",
  theme_divider: "divider",
};

const COLORS_CAMEL_TO_SNAKE = Object.fromEntries(
  Object.entries(COLORS_SNAKE_TO_CAMEL).map(([snake, camel]) => [camel, snake])
);
const THEME_CAMEL_TO_SNAKE = Object.fromEntries(
  Object.entries(THEME_SNAKE_TO_CAMEL).map(([snake, camel]) => [camel, snake])
);

function normalizeThemePayload(data) {
  const colors = {};
  const theme = {};

  Object.entries(COLORS_SNAKE_TO_CAMEL).forEach(([snakeKey, camelKey]) => {
    if (data[snakeKey] !== undefined) colors[camelKey] = data[snakeKey];
  });
  Object.entries(THEME_SNAKE_TO_CAMEL).forEach(([snakeKey, camelKey]) => {
    if (data[snakeKey] !== undefined) theme[camelKey] = data[snakeKey];
  });

  return {
    name: data.name ?? data.theme_name ?? "",
    colors,
    theme,
    fontFamily: data.font_family ?? data.fontFamily ?? DEFAULT_FONT_FAMILY,
  };
}

function buildRestPayload(name, colors, themeVals, fontFamily, isActive) {
  const body = { name, is_active: isActive, font_family: fontFamily };
  Object.entries(colors || {}).forEach(([camelKey, value]) => {
    const snakeKey = COLORS_CAMEL_TO_SNAKE[camelKey];
    if (snakeKey) body[snakeKey] = value;
  });
  Object.entries(themeVals || {}).forEach(([camelKey, value]) => {
    const snakeKey = THEME_CAMEL_TO_SNAKE[camelKey];
    if (snakeKey) body[snakeKey] = value;
  });
  return body;
}

async function persistThemeToBackend(payload) {
  try {
    const res = await fetch(APP_THEME_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.status) {
      const errMsg =
        json?.message ||
        (json?.errors ? Object.values(json.errors).flat().join(" ") : null) ||
        `Server responded with ${res.status}.`;
      return { ok: false, data: null, message: errMsg };
    }
    return { ok: true, data: json.data, message: json.message };
  } catch (err) {
    console.error("Failed to persist theme:", err);
    return { ok: false, data: null, message: "Network error — couldn't reach the server." };
  }
}

// ---------------------------------------------------------------
// Small UI atoms
// ---------------------------------------------------------------

const swatchSx = (size) => ({
  width: size,
  height: size,
  p: 0,
  border: `1px solid ${tokens.ink}`,
  borderRadius: "6px",
  background: "none",
  cursor: "pointer",
  flexShrink: 0,
});

function SwatchPicker({ value, onCommit, size = 26, showHex = true }) {
  const { hex, alpha } = toHexAlpha(value);
  const showAlpha = isRgba(value) || alpha < 1;

  if (!hex) {
    return (
      <TextField
        size="small"
        value={value ?? ""}
        onChange={(e) => onCommit(e.target.value)}
        sx={{ width: 120 }}
        placeholder="css color"
      />
    );
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Box
          component="input"
          type="color"
          value={hex}
          onChange={(e) => onCommit(fromHexAlpha(e.target.value, alpha))}
          sx={swatchSx(size)}
        />
        {showHex && (
          <Typography sx={{ fontFamily: MONO, fontSize: "0.72rem", color: tokens.textLightSecondary }}>
            {hex.toUpperCase()}
          </Typography>
        )}
      </Stack>
      {showAlpha && (
        <Box>
          <Typography
            sx={{ fontFamily: MONO, fontSize: "0.65rem", color: tokens.textLightSecondary, textAlign: "right" }}
          >
            Opacity {Math.round(alpha * 100)}%
          </Typography>
          <Box
            component="input"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={alpha}
            onChange={(e) => onCommit(fromHexAlpha(hex, parseFloat(e.target.value)))}
            sx={{ width: "100%", m: 0, accentColor: tokens.brandAccent, cursor: "pointer" }}
          />
        </Box>
      )}
    </Stack>
  );
}

function CompoundSwatchPicker({ value, onCommit }) {
  const tokens_ = extractColorTokens(value || "");

  if (tokens_.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: tokens.textLightSecondary }}>
        No color stops detected
      </Typography>
    );
  }

  const handleTokenChange = (index, newToken) => {
    const nextTokens = [...tokens_];
    nextTokens[index] = newToken;
    onCommit(replaceColorTokens(value, nextTokens));
  };

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {tokens_.map((tok, i) => (
        <SwatchPicker key={i} value={tok} showHex={false} onCommit={(v) => handleTokenChange(i, v)} size={26} />
      ))}
    </Stack>
  );
}

// Every token card shares one fixed size. If its content is taller than
// the card (e.g. "Edit CSS value" expanded), the body scrolls inside the
// card with the scrollbar hidden.
const CARD_HEIGHT = 168;

const hiddenScrollSx = {
  overflowY: "auto",
  overflowX: "hidden",
  scrollbarWidth: "none", // Firefox
  msOverflowStyle: "none", // old Edge / IE
  "&::-webkit-scrollbar": { display: "none", width: 0, height: 0 }, // Chrome / Safari
};

function CardGrid({ children }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          md: "repeat(4, minmax(0, 1fr))",
        },
      }}
    >
      {children}
    </Box>
  );
}

function FieldFrame({ label, isUnapplied, onApply, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          height: CARD_HEIGHT,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          bgcolor: "#fff",
          borderColor: isUnapplied ? tokens.brandAccent : tokens.border,
          borderRadius: "10px",
          transition: "border-color 120ms ease",
        }}
      >
        <Stack
          direction="row"
          sx={{ mb: 1.25, alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}
        >
          <Typography sx={{ fontWeight: 600, fontSize: "0.78rem", lineHeight: 1.25, color: tokens.ink }}>
            {label}
          </Typography>
          <Tooltip title={isUnapplied ? "Apply this field now" : "Already live"}>
            <span>
              <IconButton
                size="small"
                onClick={onApply}
                disabled={!isUnapplied}
                sx={{
                  p: 0,
                  ml: 0.5,
                  color: isUnapplied ? tokens.signalDark : tokens.brandAccent,
                  "&.Mui-disabled": { color: tokens.brandAccent },
                }}
              >
                <CheckIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0, ...hiddenScrollSx }}>{children}</Box>
      </Paper>
    </Box>
  );
}

function RawToggle({ open, onToggle }) {
  return (
    <Button
      fullWidth
      size="small"
      onClick={onToggle}
      endIcon={<ChevronRightIcon sx={{ fontSize: 14, transform: open ? "rotate(90deg)" : "none" }} />}
      sx={{
        mt: 1.25,
        px: 0,
        minWidth: 0,
        justifyContent: "space-between",
        fontFamily: MONO,
        fontSize: "0.62rem",
        letterSpacing: "0.04em",
        color: tokens.brand,
        textTransform: "uppercase",
      }}
    >
      Edit CSS value
    </Button>
  );
}

function ColorField({ fieldKey, label, value, applied, onChange, onApply }) {
  const isUnapplied = value !== applied;
  const compound = isCompound(value);
  const [showRaw, setShowRaw] = useState(false);

  return (
    <FieldFrame label={label} isUnapplied={isUnapplied} onApply={() => onApply(fieldKey)}>
      {compound ? (
        <CompoundSwatchPicker value={value} onCommit={(v) => onChange(fieldKey, v)} />
      ) : (
        <SwatchPicker value={value} onCommit={(v) => onChange(fieldKey, v)} />
      )}

      <Divider sx={{ mt: 1.25, borderColor: tokens.lineLight }} />
      <RawToggle open={showRaw} onToggle={() => setShowRaw((s) => !s)} />

      {showRaw && (
        <TextField
          fullWidth
          multiline
          size="small"
          value={value ?? ""}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          sx={{ mt: 0.5, "& textarea": { fontFamily: MONO, fontSize: "0.7rem" } }}
        />
      )}
    </FieldFrame>
  );
}

function FontField({ value, applied, onChange, onApply }) {
  const isUnapplied = value !== applied;
  const selected = FONT_OPTIONS.find((f) => f.value === value) || null;

  return (
    <Grid item xs={12}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: "10px",
          borderColor: isUnapplied ? tokens.brandAccent : tokens.border,
        }}
      >
        <Stack direction="row" sx={{ mb: 1.25, alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontWeight: 600, fontSize: "0.8rem" }}>App Font</Typography>
          <Tooltip title={isUnapplied ? "Apply this field now" : "Already live"}>
            <span>
              <IconButton
                size="small"
                onClick={onApply}
                disabled={!isUnapplied}
                sx={{
                  p: 0,
                  color: isUnapplied ? tokens.signalDark : tokens.brandAccent,
                  "&.Mui-disabled": { color: tokens.brandAccent },
                }}
              >
                <CheckIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        <Autocomplete
          options={FONT_OPTIONS}
          groupBy={(o) => o.group}
          value={selected}
          onChange={(_, option) => onChange(option ? option.value : DEFAULT_FONT_FAMILY)}
          getOptionLabel={(o) => o.label}
          isOptionEqualToValue={(o, v) => o.value === v.value}
          renderOption={(props, option) => (
            <li {...props} style={{ fontFamily: option.value }}>
              {option.label}
            </li>
          )}
          renderInput={(params) => <TextField {...params} size="small" placeholder="Choose a font…" />}
        />
        <Paper
          variant="outlined"
          sx={{ mt: 1.5, p: 1.5, borderColor: tokens.border, borderRadius: "8px", bgcolor: tokens.surface }}
        >
          <Typography sx={{ fontFamily: value || DEFAULT_FONT_FAMILY, fontWeight: 700, fontSize: "1.35rem" }}>
            The quick brown fox jumps
          </Typography>
          <Typography
            sx={{
              fontFamily: value || DEFAULT_FONT_FAMILY,
              fontSize: "0.9rem",
              color: tokens.textLightSecondary,
              mt: 0.25,
            }}
          >
            ABCDEFGHIJ · abcdefghij · 0123456789
          </Typography>
        </Paper>
      </Paper>
    </Grid>
  );
}

function SectionLabel({ icon, children, right }) {
  return (
    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", color: tokens.brand }}>
        {icon}
        <Typography sx={{ fontFamily: MONO, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.08em" }}>
          {children}
        </Typography>
      </Stack>
      {right}
    </Stack>
  );
}

function MonoChip({ label, dot }) {
  return (
    <Chip
      size="small"
      label={label}
      icon={
        dot ? (
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: tokens.brandAccent, ml: "8px !important" }} />
        ) : undefined
      }
      sx={{
        height: 20,
        fontFamily: MONO,
        fontSize: "0.6rem",
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: tokens.brand,
        bgcolor: "#ECFDF5",
        border: `1px solid ${tokens.brandAccent}55`,
      }}
    />
  );
}

function LivePreviewStrip({ colors, themeVals, fontFamily }) {
  const neon = themeVals.neon || "#39FF88";
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
      {/* Ranking / participant */}
      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          p: 2,
          position: "relative",
          borderRadius: "12px",
          borderColor: colors.headerBorder || tokens.line,
          background: colors.backgroundGradient || "#0c2818",
          minHeight: 130,
        }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontFamily: MONO, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.65)" }}>
            RANKING / PARTICIPANT PREVIEW
          </Typography>
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: colors.headerBorder || "#22c55e" }} />
        </Stack>

        <Box
          sx={{
            mt: 1.5,
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.5,
            py: 0.6,
            borderRadius: "999px",
            border: `2px solid ${colors.highlightBorder || colors.headerBorder || "#22c55e"}`,
            boxShadow: `0 0 12px ${colors.headerBorderShadow || "rgba(41,235,112,0.55)"}`,
            color: colors.white || "#fff",
            fontFamily,
            fontWeight: 700,
            fontSize: "0.85rem",
          }}
        >
          #1 Sample Participant
          <WorkspacePremiumIcon sx={{ fontSize: 16, color: colors.gold || "#FBBF24" }} />
        </Box>

        <Stack direction="row" sx={{ mt: 1.5, justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontFamily, fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
            Current Speed:{" "}
            <Box component="span" sx={{ color: colors.white || "#fff", fontWeight: 700 }}>
              38.4 km/h
            </Box>
          </Typography>
          <Typography sx={{ fontFamily: MONO, fontSize: "0.75rem", fontWeight: 700, color: colors.green || "#4ade80" }}>
            +14.2 pts
          </Typography>
        </Stack>
      </Paper>

      {/* Go Green */}
      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          p: 2,
          borderRadius: "12px",
          borderColor: themeVals.panelBorder || tokens.line,
          background: themeVals.bg || "#04140A",
          backgroundImage: themeVals.bgGradient,
          minHeight: 130,
        }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontFamily: MONO, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", color: themeVals.muted || "rgba(255,255,255,0.5)" }}>
            GO GREEN PREVIEW
          </Typography>
          <EnergySavingsLeafIcon sx={{ fontSize: 14, color: neon }} />
        </Stack>
        <Typography sx={{ mt: 1, fontFamily, fontWeight: 800, fontSize: "1.6rem", color: neon, lineHeight: 1.1 }}>
          482 <Box component="span" sx={{ fontSize: "0.85rem" }}>W</Box>
        </Typography>
        <Typography sx={{ fontFamily, fontSize: "0.78rem", color: themeVals.subtext || "#7FDDA0" }}>
          Live power draw generated
        </Typography>
        <Box sx={{ mt: 1.25, height: 4, borderRadius: 2, bgcolor: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
          <Box sx={{ width: "68%", height: "100%", bgcolor: neon, boxShadow: `0 0 8px ${neon}` }} />
        </Box>
      </Paper>
    </Stack>
  );
}

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------

function AppTheme() {
  const { appTheme, send } = useSocket();

  const [themeName, setThemeName] = useState("");
  const [colors, setColors] = useState({});
  const [themeVals, setThemeVals] = useState({});
  const [fontFamily, setFontFamily] = useState(DEFAULT_FONT_FAMILY);

  const [appliedColors, setAppliedColors] = useState({});
  const [appliedTheme, setAppliedTheme] = useState({});
  const [appliedFontFamily, setAppliedFontFamily] = useState(DEFAULT_FONT_FAMILY);

  const [savedThemes, setSavedThemes] = useState([]);
  const [themesLoaded, setThemesLoaded] = useState(false);

  const [newThemeDialogOpen, setNewThemeDialogOpen] = useState(false);
  const [newThemeNameDraft, setNewThemeNameDraft] = useState("");
  const [newThemeError, setNewThemeError] = useState("");
  const [savingDraftOnly, setSavingDraftOnly] = useState(false);
  const [creatingLive, setCreatingLive] = useState(false);

  const [pendingSwitchName, setPendingSwitchName] = useState(null);

  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const hasLoadedOnce = React.useRef(false);

  const dirty =
    JSON.stringify(colors) !== JSON.stringify(appliedColors) ||
    JSON.stringify(themeVals) !== JSON.stringify(appliedTheme) ||
    fontFamily !== appliedFontFamily;

  const dirtyFieldCount = useMemo(() => {
    let n = 0;
    COLOR_FIELDS.forEach((f) => {
      if (colors[f.key] !== appliedColors[f.key]) n += 1;
    });
    THEME_FIELDS.forEach((f) => {
      if (themeVals[f.key] !== appliedTheme[f.key]) n += 1;
    });
    if (fontFamily !== appliedFontFamily) n += 1;
    return n;
  }, [colors, appliedColors, themeVals, appliedTheme, fontFamily, appliedFontFamily]);

  const activeTheme = savedThemes.find((t) => t.name === themeName);

  const refreshThemeList = React.useCallback(async () => {
    try {
      const res = await fetch(APP_THEMES_LIST_ENDPOINT);
      const json = await res.json();
      if (json?.status && Array.isArray(json.data)) {
        setSavedThemes(
          json.data
            .map((t) => ({ name: t.name ?? t.theme_name, updatedAt: t.updated_at, isActive: t.is_active }))
            .filter((t) => t.name)
        );
      }
    } catch (err) {
      console.error("Failed to fetch saved theme names:", err);
    } finally {
      setThemesLoaded(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(APP_THEME_ENDPOINT);
        const json = await res.json();

        if (cancelled || !json?.status || !json?.data) return;

        const { name, colors: fetchedColors, theme: fetchedTheme, fontFamily: fetchedFont } =
          normalizeThemePayload(json.data);

        if (!hasLoadedOnce.current) {
          setThemeName(name);
          setColors(fetchedColors);
          setThemeVals(fetchedTheme);
          setFontFamily(fetchedFont);
          setAppliedColors(fetchedColors);
          setAppliedTheme(fetchedTheme);
          setAppliedFontFamily(fetchedFont);
          hasLoadedOnce.current = true;
        }
      } catch (err) {
        console.error("Failed to fetch initial app theme:", err);
        if (!cancelled) {
          setToast({ severity: "error", message: "Couldn't load the current theme from the server." });
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();

    refreshThemeList();

    return () => {
      cancelled = true;
    };
  }, [refreshThemeList]);

  useEffect(() => {
    if (!appTheme) return;
    setAppliedColors(appTheme.colors || {});
    setAppliedTheme(appTheme.theme || {});
    setAppliedFontFamily(appTheme.fontFamily || DEFAULT_FONT_FAMILY);
    if (!dirty) {
      setThemeName(appTheme.name ?? themeName);
      setColors(appTheme.colors || {});
      setThemeVals(appTheme.theme || {});
      setFontFamily(appTheme.fontFamily || DEFAULT_FONT_FAMILY);
    }
    hasLoadedOnce.current = true;
    setInitialLoading(false);
  }, [appTheme]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleColorChange = (key, value) => setColors((prev) => ({ ...prev, [key]: value }));
  const handleThemeChange = (key, value) => setThemeVals((prev) => ({ ...prev, [key]: value }));

  const pushUpdate = (name, nextColors, nextTheme, nextFontFamily) => {
    const ok = send({
      type: "update_theme",
      name,
      colors: nextColors,
      theme: nextTheme,
      fontFamily: nextFontFamily,
    });

    if (!ok) {
      setToast({ severity: "error", message: "Socket isn't connected — couldn't send the update." });
    }
    return ok;
  };

  const handleApplyColor = (key) => {
    if (pushUpdate(themeName, colors, themeVals, fontFamily)) {
      setAppliedColors((prev) => ({ ...prev, [key]: colors[key] }));
      setToast({ severity: "success", message: `${key} applied to live screens.` });
    }
  };

  const handleApplyTheme = (key) => {
    if (pushUpdate(themeName, colors, themeVals, fontFamily)) {
      setAppliedTheme((prev) => ({ ...prev, [key]: themeVals[key] }));
      setToast({ severity: "success", message: `${key} applied to live screens.` });
    }
  };

  const handleApplyFont = () => {
    if (pushUpdate(themeName, colors, themeVals, fontFamily)) {
      setAppliedFontFamily(fontFamily);
      setToast({ severity: "success", message: "Font applied to live screens." });
    }
  };

  const handleReset = () => {
    setColors(appliedColors);
    setThemeVals(appliedTheme);
    setFontFamily(appliedFontFamily);
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = pushUpdate(themeName, colors, themeVals, fontFamily);
    if (ok) {
      setAppliedColors(colors);
      setAppliedTheme(themeVals);
      setAppliedFontFamily(fontFamily);
      setToast({ severity: "success", message: `"${themeName}" saved — live screens will update shortly.` });
      refreshThemeList();
    }
    setSaving(false);
  };

  const validateNewThemeName = () => {
    const name = newThemeNameDraft.trim();
    if (!name) {
      setNewThemeError("Give the theme a name.");
      return null;
    }
    if (savedThemes.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setNewThemeError("A theme with this name already exists.");
      return null;
    }
    return name;
  };

  const handleSaveDraftOnly = async () => {
    const name = validateNewThemeName();
    if (!name) return;

    setSavingDraftOnly(true);
    const payload = buildRestPayload(name, colors, themeVals, fontFamily, false);
    const result = await persistThemeToBackend(payload);
    setSavingDraftOnly(false);

    if (!result.ok) {
      setNewThemeError(result.message || "Couldn't save the theme.");
      return;
    }

    setSavedThemes((prev) => [...prev, { name, isActive: false }]);
    setNewThemeDialogOpen(false);
    setNewThemeNameDraft("");
    setNewThemeError("");
    setToast({ severity: "success", message: `"${name}" saved — not live yet.` });
    refreshThemeList();
  };

  const handleCreateAndSwitch = async () => {
    const name = validateNewThemeName();
    if (!name) return;

    setCreatingLive(true);
    const payload = buildRestPayload(name, colors, themeVals, fontFamily, true);
    const result = await persistThemeToBackend(payload);
    setCreatingLive(false);

    if (!result.ok) {
      setNewThemeError(result.message || "Couldn't create the theme.");
      return;
    }

    setThemeName(name);
    setAppliedColors(colors);
    setAppliedTheme(themeVals);
    setAppliedFontFamily(fontFamily);
    setSavedThemes((prev) => [...prev, { name, isActive: true }]);
    setNewThemeDialogOpen(false);
    setNewThemeNameDraft("");
    setNewThemeError("");
    setToast({ severity: "success", message: `Created and switched to "${name}" — now live.` });
    refreshThemeList();
  };

  const loadThemeByName = async (name) => {
    if (!name) return;
    setSwitching(true);
    try {
      const res = await fetch(`${APP_THEME_ENDPOINT}?name=${encodeURIComponent(name)}`);
      const json = await res.json();
      if (!json?.status || !json?.data) {
        setToast({ severity: "error", message: `Couldn't load theme "${name}".` });
        refreshThemeList();
        return;
      }
      const { name: loadedName, colors: c, theme: t, fontFamily: f } = normalizeThemePayload(json.data);

      setThemeName(loadedName || name);
      setColors(c);
      setThemeVals(t);
      setFontFamily(f);

      const broadcastOk = pushUpdate(loadedName || name, c, t, f);

      setAppliedColors(c);
      setAppliedTheme(t);
      setAppliedFontFamily(f);

      if (broadcastOk) {
        setToast({ severity: "success", message: `Switched to "${loadedName || name}" — now live.` });
      }
    } catch (err) {
      console.error("Failed to load theme:", err);
      setToast({ severity: "error", message: `Couldn't load theme "${name}".` });
    } finally {
      setSwitching(false);
    }
  };

  const requestSwitchTheme = (name) => {
    if (!name || name === themeName) return;
    if (dirty) {
      setPendingSwitchName(name);
    } else {
      loadThemeByName(name);
    }
  };

  const confirmSwitchTheme = () => {
    const name = pendingSwitchName;
    setPendingSwitchName(null);
    if (name) loadThemeByName(name);
  };

  const closeNewThemeDialog = () => {
    setNewThemeDialogOpen(false);
    setNewThemeNameDraft("");
    setNewThemeError("");
  };

  const loading = initialLoading && !hasLoadedOnce.current;
  const newThemeBusy = savingDraftOnly || creatingLive;

  return (
    <Box sx={{ mx: "auto", p: { xs: 2, md: 3 }}}>
      <Paper
        variant="outlined"
        sx={{ borderColor: tokens.border, borderRadius: "14px", p: { xs: 2, md: 3 }, bgcolor: "#fff" }}
      >
        {/* Header */}
        <Stack
          direction="row"
          sx={{ alignItems: "flex-start", justifyContent: "space-between", mb: 2.5 }}
          spacing={2}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "8px",
                bgcolor: tokens.brand,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BrushIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }} useFlexGap>
                <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: tokens.ink }}>
                  App Theme Presets & Token Studio
                </Typography>
                <MonoChip label="Live sync ready" />
              </Stack>
              <Typography sx={{ fontSize: "0.75rem", color: tokens.textLightSecondary }}>
                Edits here are sent live to every connected screen without recompiling.
              </Typography>
            </Box>
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setNewThemeDialogOpen(true)}
            sx={{
              flexShrink: 0,
              whiteSpace: "nowrap",
              color: tokens.brand,
              borderColor: tokens.brand,
              fontWeight: 600,
              textTransform: "none",
            }}
          >
            New Theme
          </Button>
        </Stack>

        {/* Active configuration */}
        <Box
          sx={{
            border: `1px solid ${tokens.lineLight}`,
            bgcolor: tokens.surface,
            borderRadius: "12px",
            p: 2,
            mb: 3,
          }}
        >
          <Typography
            sx={{ fontFamily: MONO, fontWeight: 700, fontSize: "0.68rem", letterSpacing: "0.08em", mb: 1, color: tokens.ink }}
          >
            ACTIVE CONFIGURATION
          </Typography>

          {!themesLoaded ? (
            <Skeleton variant="rounded" height={40} />
          ) : (
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "center" } }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flex: { md: "0 0 55%" } }}>
                <Autocomplete
                  fullWidth
                  disableClearable
                  popupIcon={<ExpandMoreIcon />}
                  options={savedThemes.map((t) => t.name)}
                  value={themeName || null}
                  onChange={(_, v) => requestSwitchTheme(v)}
                  loading={switching}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Select a saved theme…"
                      sx={{ bgcolor: "#fff" }}
                    />
                  )}
                />
                {activeTheme?.isActive && (
                  <Chip
                    size="small"
                    icon={<CheckCircleIcon sx={{ fontSize: 14, color: "#fff !important" }} />}
                    label="Active Default"
                    sx={{
                      bgcolor: tokens.brand,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.68rem",
                      height: 26,
                      flexShrink: 0,
                    }}
                  />
                )}
              </Stack>
              <Typography sx={{ fontSize: "0.75rem", color: tokens.textLightSecondary, flex: 1 }}>
                {savedThemes.length === 0
                  ? 'No saved themes yet — click "New Theme" to create your first one.'
                  : "Switching a preset applies instantly to rider pods and big-screen stadium scoreboards."}
              </Typography>
            </Stack>
          )}
        </Box>

        {/* Live preview */}
        {!loading && (themeName || dirty) && (
          <Box sx={{ mb: 3 }}>
            <SectionLabel
              icon={<MonitorIcon sx={{ fontSize: 16 }} />}
              right={<MonoChip label="Live Sync Active" dot />}
            >
              PREVIEW
            </SectionLabel>
            <LivePreviewStrip colors={colors} themeVals={themeVals} fontFamily={fontFamily} />
          </Box>
        )}

        {/* Editing surface */}
        <Box>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{ sx: { bgcolor: tokens.brand, height: 2 } }}
            sx={{ borderBottom: `1px solid ${tokens.lineLight}`, minHeight: 40 }}
          >
            {[
              { icon: <AccountTreeIcon fontSize="small" />, label: "Ranking / Participant Cards" },
              { icon: <BoltIcon fontSize="small" />, label: "Go Green (Power Charts)" },
              {
                icon: (
                  <Badge color="warning" variant="dot" invisible={fontFamily === appliedFontFamily}>
                    <TextFieldsIcon fontSize="small" />
                  </Badge>
                ),
                label: "Typography Tokens",
              },
            ].map((t, i) => (
              <Tab
                key={t.label}
                icon={t.icon}
                iconPosition="start"
                label={t.label}
                sx={{
                  minHeight: 40,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  color: tokens.textLightSecondary,
                  "&.Mui-selected": { color: tokens.brand },
                }}
              />
            ))}
          </Tabs>

          <Box sx={{ pt: 2.5, pb: 1 }}>
            {loading ? (
              <CardGrid>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={CARD_HEIGHT} />
                ))}
              </CardGrid>
            ) : !themeName ? (
              <Stack spacing={1.5} sx={{ py: 6, alignItems: "center" }}>
                <PaletteIcon sx={{ fontSize: 40, color: tokens.textLightSecondary }} />
                <Typography color="text.secondary">
                  Select a theme above, or create a new one to start editing.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={() => setNewThemeDialogOpen(true)}
                  sx={{ bgcolor: tokens.brand, "&:hover": { bgcolor: tokens.brand } }}
                >
                  Create your first theme
                </Button>
              </Stack>
            ) : (
              <>
                {tab === 0 && (
                  <CardGrid>
                    {COLOR_FIELDS.map((f) => (
                      <ColorField
                        key={f.key}
                        fieldKey={f.key}
                        label={f.label}
                        value={colors[f.key]}
                        applied={appliedColors[f.key]}
                        onChange={handleColorChange}
                        onApply={handleApplyColor}
                      />
                    ))}
                  </CardGrid>
                )}

                {tab === 1 && (
                  <CardGrid>
                    {THEME_FIELDS.map((f) => (
                      <ColorField
                        key={f.key}
                        fieldKey={f.key}
                        label={f.label}
                        value={themeVals[f.key]}
                        applied={appliedTheme[f.key]}
                        onChange={handleThemeChange}
                        onApply={handleApplyTheme}
                      />
                    ))}
                  </CardGrid>
                )}

                {tab === 2 && (
                  <Grid container spacing={2}>
                    <FontField
                      value={fontFamily}
                      applied={appliedFontFamily}
                      onChange={setFontFamily}
                      onApply={handleApplyFont}
                    />
                  </Grid>
                )}
              </>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2, borderColor: tokens.lineLight }} />

        {/* Footer */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: dirty ? tokens.signal : tokens.brandAccent,
              }}
            />
            <Typography sx={{ fontFamily: MONO, fontSize: "0.7rem", color: tokens.textLightSecondary }}>
              {dirty
                ? `${dirtyFieldCount} unsaved token${dirtyFieldCount === 1 ? "" : "s"}`
                : "Theme tokens ready for push"}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              disabled={!dirty}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                color: tokens.ink,
                borderColor: tokens.border,
              }}
            >
              Reset to Defaults
            </Button>
            <Button
              variant="contained"
              startIcon={<SensorsIcon />}
              onClick={handleSave}
              disabled={!dirty || loading || !themeName || saving}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                bgcolor: tokens.brand,
                "&:hover": { bgcolor: "#043d2e" },
              }}
            >
              {saving ? "Saving…" : "Save & Broadcast Theme"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* New theme dialog */}
      <Dialog open={newThemeDialogOpen} onClose={newThemeBusy ? undefined : closeNewThemeDialog} fullWidth maxWidth="xs">
        <DialogTitle>New theme</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {dirty
              ? "Your current unsaved edits will be used as the starting point for this new theme."
              : `The new theme will start as a copy of "${themeName || "the current draft"}".`}
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Theme name"
            placeholder="e.g. Diwali 2026"
            value={newThemeNameDraft}
            disabled={newThemeBusy}
            onChange={(e) => {
              setNewThemeNameDraft(e.target.value);
              if (newThemeError) setNewThemeError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateAndSwitch();
            }}
            error={!!newThemeError}
            helperText={newThemeError || "Save stores it quietly. Create & switch makes it live right away."}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
          <Button onClick={closeNewThemeDialog} disabled={newThemeBusy}>
            Cancel
          </Button>
          <Tooltip title="Stores this as a new theme without going live — nothing changes on connected screens">
            <span>
              <Button variant="outlined" startIcon={<SaveIcon />} onClick={handleSaveDraftOnly} disabled={newThemeBusy}>
                {savingDraftOnly ? "Saving…" : "Save"}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Stores this as a new theme and broadcasts it live to every connected screen">
            <span>
              <Button
                variant="contained"
                startIcon={<PublishIcon />}
                onClick={handleCreateAndSwitch}
                disabled={newThemeBusy}
                sx={{ bgcolor: tokens.brand, "&:hover": { bgcolor: "#043d2e" } }}
              >
                {creatingLive ? "Publishing…" : "Create & switch"}
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      {/* Unsaved-changes guard */}
      <Dialog open={!!pendingSwitchName} onClose={() => setPendingSwitchName(null)} fullWidth maxWidth="xs">
        <DialogTitle>Discard unsaved changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have {dirtyFieldCount} unsaved change{dirtyFieldCount === 1 ? "" : "s"} in "{themeName}". Switching to
            "{pendingSwitchName}" will discard them and go live immediately.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPendingSwitchName(null)}>Keep editing</Button>
          <Button color="error" variant="contained" onClick={confirmSwitchTheme}>
            Discard & switch
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast && (
          <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled">
            {toast.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}

export default AppTheme;