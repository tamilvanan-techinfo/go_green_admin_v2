import React from "react";
import { Box, Paper, Typography, Chip } from "@mui/material";
import { motion } from "framer-motion";




export const C = {
  pageBg: "#edf0f7",
  cardBg: "#ffffff",
  border: "#e2e6ef",
  brandDark: "#1b3d2f",
  activeChipBg: "#dcfce7",
  activeChipText: "#166534",
  accentText: "#16a34a",
  labelColor: "#6b7280",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
};
export const fontFamily = "'Inter', 'Segoe UI', system-ui, sans-serif";
export const cardTitleSx = {
  fontFamily, fontSize: { xs: 15, sm: 16, md: 17 }, fontWeight: 700,
  lineHeight: 1.4, color: C.textPrimary, minWidth: 0, overflowWrap: "anywhere",
};
export const bodyTextSx = {
  fontFamily, fontSize: { xs: 12, sm: 13 }, lineHeight: 1.7,
  color: C.textSecondary, overflowWrap: "anywhere",
};
export const labelSx = {
  fontFamily, fontSize: 12, fontWeight: 600, color: C.labelColor,
  textTransform: "uppercase", letterSpacing: "0.04em",
};
export const PANEL_SX = {
  minWidth: 0, p: { xs: 1.5, sm: 2, md: 2.5 }, borderRadius: "14px",
  border: `1px solid ${C.border}`, backgroundColor: C.cardBg,
  boxShadow: "0 1px 2px rgba(17,24,39,0.04)", boxSizing: "border-box",
};
export const METRIC_LABEL_SX = { fontFamily, fontSize: { xs: 10, sm: 11 }, color: C.labelColor, overflowWrap: "anywhere" };
export const METRIC_VALUE_SX = { fontFamily, fontSize: { xs: 13, sm: 15, md: 16 }, fontWeight: 700, color: C.textPrimary, overflowWrap: "anywhere" };


function AnimatedValue({ value }) {
  const [display, setDisplay] = React.useState(value);
  React.useEffect(() => {
    let frame;
    const start = display;
    const startTime = performance.now();
    function tick(now) {
      const t = Math.min((now - startTime) / 500, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (value - start) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display}</>;
}

function Card({ stat, index }) {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.75, sm: 2, md: 2.25 },
          minWidth: 0,
          borderRadius: "14px",
          border: `1px solid ${C.border}`,
          backgroundColor: C.cardBg,
          boxShadow: "0 1px 2px rgba(17,24,39,0.04)",
          transition: "transform 180ms ease, box-shadow 180ms ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 8px 20px rgba(17,24,39,0.07)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={labelSx}>{stat.label}</Typography>
            <Typography
              sx={{
                fontFamily,
                fontSize: { xs: 24, sm: 27, lg: 30 },
                fontWeight: 800,
                color: C.textPrimary,
                mt: 0.5,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <AnimatedValue value={Number(stat.value) || 0} />
            </Typography>
          </Box>
          <Box
            sx={{
              width: { xs: 36, sm: 42 },
              height: { xs: 36, sm: 42 },
              borderRadius: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: C.brandDark,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              {stat.icon}
            </span>
          </Box>
        </Box>

        <Box sx={{ mt: 1.5 }}>
          {stat.chip ? (
            <Chip
              size="small"
              label={stat.note}
              sx={{
                fontFamily,
                fontSize: 11,
                fontWeight: 700,
                bgcolor: C.activeChipBg,
                color: C.activeChipText,
                height: "auto",
                minHeight: 22,
                "& .MuiChip-label": { whiteSpace: "normal", py: 0.5 },
              }}
            />
          ) : (
            <Typography sx={{ fontFamily, fontSize: 12, color: C.labelColor }}>
              {stat.note}
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

export default function StatsGrid({ stats }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
        },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
      }}
    >
      {stats.map((stat, i) => (
        <Card key={stat.label} stat={stat} index={i} />
      ))}
    </Box>
  );
}