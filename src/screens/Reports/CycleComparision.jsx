import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";

import BottomSheet from "../../components/BottonSheet";
import CycleSelect from "../../components/CycleSelect";

const COMPARISON_API_URL =
  "http://127.0.0.1:8000/export/reports/cycle-comparison/";
const EXCEL_API_URL =
  "http://127.0.0.1:8000/export/reports/cycle-comparison/excel/";

const CONTROL_HEIGHT = 44;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const COLORS = {
  primary: "#047857",
  primaryMid: "#34D399",
  primaryDark: "#064E3B",
  primaryLight: "#ECFDF5",
  background: "#F6F8FA",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  rowBorder: "#EDF1F5",
  text: "#0F172A",
  muted: "#64748B",
  amber: "#B45309",
  amberLight: "#FFFBEB",
  slate: "#334155",
  slateLight: "#F1F5F9",
  notActive: "#CBD5E1",
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    minHeight: CONTROL_HEIGHT,
    borderRadius: 2,
    bgcolor: COLORS.surface,
  },
};

const tableSx = {
  "& .MuiTableCell-root": {
    borderBottom: `1px solid ${COLORS.rowBorder}`,
    py: 1.25,
    px: 2,
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  },
  "& .MuiTableHead-root .MuiTableCell-root": {
    bgcolor: "#F8FAFC",
    color: "#475569",
    fontWeight: 800,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
};

const numberFormat = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 3,
});

/* -------------------------------------------------------------------------- */
/*                                  Formatters                                */
/* -------------------------------------------------------------------------- */

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number) ? numberFormat.format(number) : "—";
}

function formatInteger(value) {
  return Number.isFinite(Number(value))
    ? formatNumber(Math.round(Number(value)))
    : "—";
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : "—";
}

/** Seconds -> "3d 12h 5m". */
function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return "—";
  }

  const total = Math.round(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return parts.join(" ");
}

function initialsOf(name) {
  const clean = String(name || "").trim();
  return clean ? clean.charAt(0).toUpperCase() : "?";
}

/* -------------------------------------------------------------------------- */
/*                                  Animation                                 */
/* -------------------------------------------------------------------------- */

/** True when the OS asks for reduced motion. Animations are skipped then. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

/** Eases a number from its last value to `rawTarget`. */
function useCountUp(rawTarget, duration = 900) {
  const reduced = usePrefersReducedMotion();
  const target =
    rawTarget === null || rawTarget === undefined ? NaN : Number(rawTarget);

  const [display, setDisplay] = useState(0);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setDisplay(NaN);
      return undefined;
    }

    if (reduced) {
      lastRef.current = target;
      setDisplay(target);
      return undefined;
    }

    const from = Number.isFinite(lastRef.current) ? lastRef.current : target;
    const start = performance.now();
    let frame;

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (target - from) * eased;

      lastRef.current = current;
      setDisplay(current);

      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);

  return display;
}

function AnimatedNumber({ value, format = formatNumber }) {
  const display = useCountUp(value);
  return <>{format(display)}</>;
}

/** Bar that grows from 0 to `ratio` (0–1) after an optional delay. */
function AnimatedBar({ ratio, color = COLORS.primary, delay = 0, sx }) {
  const reduced = usePrefersReducedMotion();
  const target = Number.isFinite(ratio) ? Math.min(Math.max(ratio, 0), 1) * 100 : 0;
  const [width, setWidth] = useState(reduced ? target : 0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(target), reduced ? 0 : delay);
    return () => clearTimeout(timer);
  }, [target, delay, reduced]);

  return (
    <Box
      sx={{
        width: `${width}%`,
        height: "100%",
        bgcolor: color,
        borderRadius: 999,
        transition: reduced ? "none" : `width 900ms ${EASE}`,
        ...sx,
      }}
    />
  );
}

/** Fades and slides its children in when they scroll into view. */
function Reveal({ children, delay = 0, sx }) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return undefined;
    }

    const element = ref.current;

    if (!element || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <Box
      ref={ref}
      sx={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: reduced
          ? "none"
          : `opacity 600ms ease ${delay}ms, transform 600ms ${EASE} ${delay}ms`,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Building blocks                            */
/* -------------------------------------------------------------------------- */

function KpiCard({
  icon,
  label,
  value,
  format = formatNumber,
  hint,
  highlight = false,
  delay = 0,
}) {
  return (
    <Reveal delay={delay} sx={{ height: "100%" }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          height: "100%",
          minWidth: 0,
          border: `1px solid ${highlight ? COLORS.primary : COLORS.border}`,
          borderRadius: 3,
          bgcolor: COLORS.surface,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: COLORS.primaryLight,
              color: COLORS.primary,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{ color: COLORS.muted, fontWeight: 600, display: "block" }}
            >
              {label}
            </Typography>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 20,
                lineHeight: 1.2,
                color: COLORS.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <AnimatedNumber value={value} format={format} />
            </Typography>
            {hint && (
              <Typography variant="caption" sx={{ color: COLORS.muted }}>
                {hint}
              </Typography>
            )}
          </Box>
        </Stack>
      </Paper>
    </Reveal>
  );
}

function StatBlock({ label, value, format = formatNumber }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{ color: COLORS.muted, fontWeight: 600, display: "block" }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: 15,
          color: COLORS.text,
          whiteSpace: "nowrap",
        }}
      >
        <AnimatedNumber value={value} format={format} />
      </Typography>
    </Box>
  );
}

/** Thin rounded track with an animated fill for a 0–1 ratio. */
function RatioBar({ ratio, color = COLORS.primary, delay = 0 }) {
  return (
    <Box
      sx={{
        width: "100%",
        height: 8,
        borderRadius: 999,
        bgcolor: COLORS.slateLight,
        overflow: "hidden",
      }}
    >
      <AnimatedBar ratio={ratio} color={color} delay={delay} />
    </Box>
  );
}

function PowerCell({ value, maxValue, delay = 0 }) {
  const ratio =
    Number.isFinite(value) && Number.isFinite(maxValue) && maxValue > 0
      ? value / maxValue
      : 0;

  return (
    <Stack spacing={0.5} alignItems="flex-end" sx={{ minWidth: 120 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
        <AnimatedNumber value={value} />
      </Typography>
      <Box sx={{ width: 120 }}>
        <RatioBar ratio={ratio} delay={delay} />
      </Box>
    </Stack>
  );
}

function StatusChip({ isAllocated, hasActivity }) {
  if (!isAllocated) {
    return (
      <Chip
        size="small"
        label="Not allocated"
        sx={{
          bgcolor: COLORS.amberLight,
          color: COLORS.amber,
          fontWeight: 700,
          border: "1px solid #FDE68A",
        }}
      />
    );
  }

  if (hasActivity) {
    return (
      <Chip
        size="small"
        label="Active"
        sx={{
          bgcolor: COLORS.primaryLight,
          color: COLORS.primaryDark,
          fontWeight: 700,
        }}
      />
    );
  }

  return (
    <Chip
      size="small"
      label="Idle"
      sx={{ bgcolor: COLORS.slateLight, color: COLORS.muted, fontWeight: 700 }}
    />
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <Reveal>
      <Paper
        elevation={0}
        sx={{
          py: 7,
          px: 3,
          textAlign: "center",
          border: `1px dashed ${COLORS.border}`,
          borderRadius: 3,
          bgcolor: COLORS.surface,
        }}
      >
        <Avatar
          sx={{
            width: 56,
            height: 56,
            mx: "auto",
            mb: 2,
            bgcolor: COLORS.primaryLight,
            color: COLORS.primary,
          }}
        >
          {icon}
        </Avatar>
        <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
        <Typography
          variant="body2"
          sx={{ color: COLORS.muted, mt: 0.5, maxWidth: 420, mx: "auto" }}
        >
          {description}
        </Typography>
      </Paper>
    </Reveal>
  );
}

function LegendDot({ color, label }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
      <Typography variant="caption" sx={{ color: COLORS.muted, fontWeight: 600 }}>
        {label}
      </Typography>
    </Stack>
  );
}

/* -------------------------------------------------------------------------- */
/*                         Horizontal comparison blocks                       */
/* -------------------------------------------------------------------------- */

/** Cycle label, animated horizontal bar, and animated value. */
function HorizontalBarRow({ label, sublabel, ratio, value, format, color, delay }) {
  return (
    <Reveal delay={delay}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 1.1 }}>
        <Box sx={{ width: 140, flexShrink: 0, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 14 }} noWrap>
            {label}
          </Typography>
          {sublabel && (
            <Typography variant="caption" sx={{ color: COLORS.muted }} noWrap>
              {sublabel}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            height: 24,
            borderRadius: 1.5,
            bgcolor: COLORS.slateLight,
            overflow: "hidden",
          }}
        >
          <AnimatedBar
            ratio={ratio}
            color={color}
            delay={delay + 150}
            sx={{ borderRadius: 1.5 }}
          />
        </Box>

        <Typography
          sx={{
            width: 130,
            flexShrink: 0,
            textAlign: "right",
            fontWeight: 800,
            fontSize: 13,
          }}
          noWrap
        >
          <AnimatedNumber value={value} format={format} />
        </Typography>
      </Stack>
    </Reveal>
  );
}

/**
 * One metric shown as horizontal bars, one row per cycle.
 * `absoluteMax` sets a fixed scale (e.g. 1 for ratios). Otherwise bars are
 * scaled to the largest value in the selection.
 */
function HorizontalMetric({
  icon,
  title,
  subtitle,
  cycles,
  getValue,
  format,
  absoluteMax,
}) {
  const values = cycles.map((c) => {
    const v = Number(getValue(c));
    return Number.isFinite(v) ? v : null;
  });

  const numeric = values.filter((v) => v !== null);
  const relativeMax = numeric.length ? Math.max(...numeric) : 0;
  const scaleMax = absoluteMax ?? relativeMax;

  const topIndex =
    numeric.length && relativeMax > 0 ? values.indexOf(relativeMax) : -1;

  return (
    <Reveal>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 3,
          bgcolor: COLORS.surface,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Box sx={{ color: COLORS.primary, display: "flex" }}>{icon}</Box>
          <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: COLORS.muted, ml: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Stack>

        <Divider sx={{ borderColor: COLORS.rowBorder, mb: 0.5 }} />

        {cycles.map((cycle, index) => {
          const value = values[index];
          const ratio = value === null || !scaleMax ? 0 : value / scaleMax;

          return (
            <HorizontalBarRow
              key={cycle.cycle_no}
              label={cycle.cycle_no}
              sublabel={`Controller ${cycle.controller_no || "—"}`}
              ratio={ratio}
              value={value}
              format={format}
              color={index === topIndex ? COLORS.primaryDark : COLORS.primaryMid}
              delay={index * 90}
            />
          );
        })}
      </Paper>
    </Reveal>
  );
}

/** Active vs not-active per cycle, drawn as one horizontal stacked bar. */
function ActivityStackedBars({ cycles }) {
  return (
    <Reveal>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 3,
          bgcolor: COLORS.surface,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          useFlexGap
          spacing={1}
          sx={{ mb: 1 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ color: COLORS.primary, display: "flex" }}>
              <GroupsRoundedIcon />
            </Box>
            <Typography sx={{ fontWeight: 800 }}>Participant activity</Typography>
            <Typography variant="caption" sx={{ color: COLORS.muted, ml: 0.5 }}>
              Active vs. not active, per cycle
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2}>
            <LegendDot color={COLORS.primary} label="Active" />
            <LegendDot color={COLORS.notActive} label="Not active" />
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: COLORS.rowBorder, mb: 0.5 }} />

        {cycles.map((cycle, index) => {
          const allocated = Number(cycle.summary.allocated_count) || 0;
          const active = Number(cycle.summary.active_count) || 0;
          const activeRatio = allocated > 0 ? active / allocated : 0;

          return (
            <Reveal key={cycle.cycle_no} delay={index * 90}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 1.1 }}>
                <Box sx={{ width: 140, flexShrink: 0, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 14 }} noWrap>
                    {cycle.cycle_no}
                  </Typography>
                  <Typography variant="caption" sx={{ color: COLORS.muted }} noWrap>
                    {allocated} allocated
                  </Typography>
                </Box>

                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    height: 24,
                    display: "flex",
                    borderRadius: 1.5,
                    overflow: "hidden",
                    bgcolor: COLORS.notActive,
                  }}
                >
                  <AnimatedBar
                    ratio={activeRatio}
                    color={COLORS.primary}
                    delay={index * 90 + 150}
                    sx={{ borderRadius: 0 }}
                  />
                </Box>

                <Typography
                  sx={{
                    width: 130,
                    flexShrink: 0,
                    textAlign: "right",
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                  noWrap
                >
                  {active} / {allocated}{" "}
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ color: COLORS.muted }}
                  >
                    (<AnimatedNumber value={activeRatio * 100} format={(v) => formatPercent(v / 100)} />)
                  </Typography>
                </Typography>
              </Stack>
            </Reveal>
          );
        })}
      </Paper>
    </Reveal>
  );
}

function HorizontalComparison({ cycles }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Reveal>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <BarChartRoundedIcon sx={{ color: COLORS.primary }} />
          <Typography sx={{ fontWeight: 800 }}>Horizontal comparison</Typography>
          <Typography variant="caption" sx={{ color: COLORS.muted, ml: 1 }}>
            Darkest bar marks the highest value in each metric
          </Typography>
        </Stack>
      </Reveal>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        <HorizontalMetric
          icon={<BoltRoundedIcon />}
          title="Power generated"
          cycles={cycles}
          getValue={(c) => c.summary.total_power_generated}
          format={formatNumber}
        />

        <HorizontalMetric
          icon={<PercentRoundedIcon />}
          title="Activity rate"
          subtitle="Active ÷ allocated"
          cycles={cycles}
          getValue={(c) =>
            c.summary.allocated_count > 0
              ? c.summary.active_count / c.summary.allocated_count
              : null
          }
          format={formatPercent}
          absoluteMax={1}
        />

        <HorizontalMetric
          icon={<TimerRoundedIcon />}
          title="Average duration"
          cycles={cycles}
          getValue={(c) => c.summary.average_duration_seconds}
          format={formatDuration}
        />

        <HorizontalMetric
          icon={<GroupsRoundedIcon />}
          title="Active participants"
          cycles={cycles}
          getValue={(c) => c.summary.active_count}
          format={formatInteger}
        />

        <Box sx={{ gridColumn: { xl: "1 / -1" } }}>
          <ActivityStackedBars cycles={cycles} />
        </Box>
      </Box>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Per-cycle                                 */
/* -------------------------------------------------------------------------- */

function CycleCard({ cycle, index }) {
  const { summary, participants } = cycle;

  const rate =
    summary.allocated_count > 0
      ? summary.active_count / summary.allocated_count
      : NaN;

  const maxPower = Math.max(
    0,
    ...participants
      .map((p) => Number(p.power_generated))
      .filter((v) => Number.isFinite(v))
  );

  const sorted = [...participants].sort((a, b) => {
    const pa = Number.isFinite(Number(a.power_generated)) ? Number(a.power_generated) : -1;
    const pb = Number.isFinite(Number(b.power_generated)) ? Number(b.power_generated) : -1;
    return pb - pa;
  });

  return (
    <Reveal delay={Math.min(index * 120, 480)}>
      <Paper
        elevation={0}
        sx={{
          mb: 2.5,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: COLORS.surface,
        }}
      >
        <Box sx={{ px: 2.5, py: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: COLORS.primary,
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                {cycle.cycle_no.replace(/\D/g, "").slice(-2) || "#"}
              </Avatar>

              <Box>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography sx={{ fontWeight: 800, fontSize: 16 }}>
                    {cycle.cycle_no}
                  </Typography>
                  <Chip
                    size="small"
                    label={`Controller ${cycle.controller_no || "—"}`}
                    sx={{
                      bgcolor: COLORS.slateLight,
                      color: COLORS.slate,
                      fontWeight: 700,
                    }}
                  />
                </Stack>
                <Typography variant="caption" sx={{ color: COLORS.muted }}>
                  {summary.active_count} of {summary.allocated_count} allocated
                  participants active
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ width: { xs: "100%", md: 240 } }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography
                  variant="caption"
                  sx={{ color: COLORS.muted, fontWeight: 600 }}
                >
                  Activity rate
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800 }}>
                  {formatPercent(rate)}
                </Typography>
              </Stack>
              <RatioBar ratio={rate} delay={200} />
            </Box>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
              },
              gap: 2,
              mt: 2.5,
              p: 2,
              borderRadius: 2,
              bgcolor: COLORS.background,
            }}
          >
            <StatBlock label="Allocated" value={summary.allocated_count} format={formatInteger} />
            <StatBlock label="Active" value={summary.active_count} format={formatInteger} />
            <StatBlock label="Power generated" value={summary.total_power_generated} />
            <StatBlock
              label="Avg duration"
              value={summary.average_duration_seconds}
              format={formatDuration}
            />
          </Box>
        </Box>

        <Divider sx={{ borderColor: COLORS.border }} />

        <TableContainer sx={{ maxHeight: 420, overflow: "auto" }}>
          <Table stickyHeader size="small" sx={{ minWidth: 960, ...tableSx }}>
            <TableHead>
              <TableRow>
                <TableCell>Participant</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Records</TableCell>
                <TableCell>First seen</TableCell>
                <TableCell>Last seen</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell align="right">Power generated</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" sx={{ color: COLORS.muted, py: 4 }}>
                      No participants allocated to this cycle.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((item, rowIndex) => (
                  <TableRow
                    key={item.participant_id}
                    hover
                    sx={{
                      transition: "background-color 200ms ease",
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.25}>
                        <Avatar
                          sx={{
                            width: 30,
                            height: 30,
                            fontSize: 12,
                            fontWeight: 800,
                            bgcolor: item.is_allocated
                              ? COLORS.primaryLight
                              : COLORS.amberLight,
                            color: item.is_allocated
                              ? COLORS.primaryDark
                              : COLORS.amber,
                          }}
                        >
                          {initialsOf(item.participant)}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {item.participant || "Unknown"}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        isAllocated={item.is_allocated}
                        hasActivity={item.has_activity}
                      />
                    </TableCell>

                    <TableCell align="right">
                      <AnimatedNumber value={item.record_count} format={formatInteger} />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: COLORS.muted }}>
                        {item.first_seen || "—"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: COLORS.muted }}>
                        {item.last_seen || "—"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Tooltip title={`${item.duration_seconds ?? 0} seconds`}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatDuration(item.duration_seconds)}
                        </Typography>
                      </Tooltip>
                    </TableCell>

                    <TableCell align="right">
                      <PowerCell
                        value={Number(item.power_generated)}
                        maxValue={maxPower}
                        delay={Math.min(rowIndex * 40, 600)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Reveal>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Main                                     */
/* -------------------------------------------------------------------------- */

function CycleComparision({ open, onClose }) {
  const [selectedCycles, setSelectedCycles] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Changing this key remounts the results, which replays every animation.
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    if (!open || selectedCycles.length === 0) {
      setCycles([]);
      setError("");
      return undefined;
    }

    const controller = new AbortController();

    const params = new URLSearchParams();
    selectedCycles.forEach((cycle) => params.append("cycle_nos", cycle));
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);

    async function loadComparison() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${COMPARISON_API_URL}?${params}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        const json = await response.json();

        if (!response.ok || json.success === false) {
          throw new Error(
            json.error ||
              `Unable to load comparison. Server returned ${response.status}.`
          );
        }

        setCycles(json.cycles || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setCycles([]);
        setError(err.message || "Unable to load comparison.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadComparison();

    return () => controller.abort();
  }, [open, selectedCycles, startDate, endDate]);

  const overview = useMemo(() => {
    const totals = cycles.reduce(
      (acc, cycle) => {
        acc.allocated += cycle.summary.allocated_count;
        acc.active += cycle.summary.active_count;
        acc.power += Number(cycle.summary.total_power_generated) || 0;
        return acc;
      },
      { allocated: 0, active: 0, power: 0 }
    );

    const durations = cycles
      .map((c) => c.summary.average_duration_seconds)
      .filter((d) => Number.isFinite(d));

    const avgDuration = durations.length
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : null;

    return {
      ...totals,
      activityRate: totals.allocated > 0 ? totals.active / totals.allocated : NaN,
      avgDuration,
    };
  }, [cycles]);

const handleExport = async () => {
  if (!selectedCycles.length) return;

  setError("");

  const params = new URLSearchParams();
  selectedCycles.forEach((cycle) => params.append("cycle_nos", cycle));
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);

  try {
    const response = await fetch(`${EXCEL_API_URL}?${params}`);

    if (!response.ok) {
      let message = `Export failed with status ${response.status}.`;
      try {
        const json = await response.json();
        message = json.error || message;
      } catch {
        // Response was not JSON; keep the default message.
      }
      throw new Error(message);
    }
function getFilenameFromDisposition(header) {
  if (!header) return null;

  // RFC 5987 form (filename*) takes priority when present.
  const extended = header.match(/filename\*\s*=\s*([^;]+)/i);
  if (extended) {
    const value = extended[1].trim().replace(/^UTF-8''/i, "").replace(/^"|"$/g, "");
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  // Quoted form: filename="report.xlsx"
  const quoted = header.match(/filename\s*=\s*"([^"]+)"/i);
  if (quoted) return quoted[1];

  // Unquoted form: filename=report.xlsx
  const plain = header.match(/filename\s*=\s*([^;]+)/i);
  if (plain) return plain[1].trim();

  return null;
}
    const blob = await response.blob();
    const filename =
      getFilenameFromDisposition(response.headers.get("Content-Disposition")) ||
      "cycle_comparison.xlsx";

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    setError(err.message || "Unable to download the Excel file.");
  } finally {
  }
};

  const resetFilters = () => {
    setSelectedCycles([]);
    setStartDate("");
    setEndDate("");
  };

  const hasFilters = selectedCycles.length > 0 || startDate || endDate;

  const dateLabel =
    startDate || endDate
      ? `${startDate || "Any date"} — ${endDate || "Any date"}`
      : "All available dates";

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      height="100vh"
      title="Cycle Comparison Report"
    >
      <Box sx={{ bgcolor: COLORS.background, color: COLORS.text }}>
        {/* Filter bar */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            mb: 2.5,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            bgcolor: COLORS.surface,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <FilterAltOutlinedIcon sx={{ color: COLORS.primary }} />
              <Typography sx={{ fontWeight: 800 }}>Compare cycles</Typography>
              {selectedCycles.length > 0 && (
                <Chip
                  size="small"
                  label={`${selectedCycles.length} selected`}
                  sx={{
                    bgcolor: COLORS.primaryLight,
                    color: COLORS.primaryDark,
                    fontWeight: 700,
                  }}
                />
              )}
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="text"
                onClick={resetFilters}
                disabled={!hasFilters}
                startIcon={<CloseRoundedIcon />}
                sx={{ textTransform: "none", color: COLORS.muted, fontWeight: 700 }}
              >
                Clear all
              </Button>

              <Button
                variant="outlined"
                onClick={() => setReplayKey((k) => k + 1)}
                disabled={!cycles.length || loading}
                startIcon={<ReplayRoundedIcon />}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  fontWeight: 700,
                  borderColor: COLORS.border,
                  color: COLORS.text,
                }}
              >
                Replay
              </Button>

              <Button
                variant="contained"
                onClick={handleExport}
                disabled={!cycles.length || loading}
                startIcon={<FileDownloadRoundedIcon />}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  fontWeight: 700,
                  boxShadow: "none",
                  bgcolor: COLORS.primary,
                  "&:hover": { bgcolor: COLORS.primaryDark, boxShadow: "none" },
                }}
              >
                Export Excel
              </Button>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: "flex",
           
              alignItems: "start",
              gap: 2,
            }}
          >
            <CycleSelect
              open={open}
              value={selectedCycles}
              onChange={setSelectedCycles}
            />

            
         
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mt: 2, color: COLORS.muted }}
          >
            <CalendarMonthRoundedIcon fontSize="small" />
            <Typography variant="body2">{dateLabel}</Typography>
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Body */}
        {selectedCycles.length === 0 ? (
          <EmptyState
            icon={<GroupsRoundedIcon />}
            title="No cycles selected"
            description="Choose one or more cycles above to compare allocation, activity, duration, and power generated."
          />
        ) : loading ? (
          <Paper
            elevation={0}
            sx={{
              py: 8,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 3,
              bgcolor: COLORS.surface,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
              <CircularProgress size={22} sx={{ color: COLORS.primary }} />
              <Typography variant="body2" sx={{ color: COLORS.muted }}>
                Building comparison...
              </Typography>
            </Stack>
          </Paper>
        ) : cycles.length === 0 ? (
          <EmptyState
            icon={<InsightsRoundedIcon />}
            title="No comparison data"
            description="The selected cycles returned no results. Try a different date range."
          />
        ) : (
          <Box key={replayKey}>
            {/* KPIs */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  xl: "repeat(4, minmax(0, 1fr))",
                },
                gap: 2,
                mb: 2.5,
              }}
            >
              <KpiCard
                icon={<GroupsRoundedIcon />}
                label="Allocated participants"
                value={overview.allocated}
                format={formatInteger}
                hint={`Across ${cycles.length} cycle${cycles.length > 1 ? "s" : ""}`}
                delay={0}
              />
              <KpiCard
                icon={<GroupsRoundedIcon />}
                label="Active participants"
                value={overview.active}
                format={formatInteger}
                hint={`${formatPercent(overview.activityRate)} activity rate`}
                delay={80}
              />
              <KpiCard
                icon={<BoltRoundedIcon />}
                label="Total power generated"
                value={overview.power}
                format={formatNumber}
                hint="Sum across selected cycles"
                highlight
                delay={160}
              />
              <KpiCard
                icon={<TimerRoundedIcon />}
                label="Average duration"
                value={overview.avgDuration}
                format={formatDuration}
                hint="Mean of cycle averages"
                delay={240}
              />
            </Box>

            {/* Horizontal comparison (only meaningful with 2+ cycles) */}
            {cycles.length > 1 && <HorizontalComparison cycles={cycles} />}

            {/* Per-cycle detail */}
            {cycles.map((cycle, index) => (
              <CycleCard key={cycle.cycle_no} cycle={cycle} index={index} />
            ))}
          </Box>
        )}
      </Box>
    </BottomSheet>
  );
}

export default CycleComparision;