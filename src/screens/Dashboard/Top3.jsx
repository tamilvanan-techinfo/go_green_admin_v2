import React from "react";
import { Box, Paper, Typography, Chip } from "@mui/material";
import { motion } from "framer-motion";
import { C, fontFamily, cardTitleSx, bodyTextSx, METRIC_LABEL_SX, METRIC_VALUE_SX } from "./StatCard";

function Sparkline({ d, color }) {
  return (
    <Box sx={{ width: "100%", height: 72, mt: 2 }}>
      <svg width="100%" height="100%" viewBox="0 0 200 40" preserveAspectRatio="none">
        <motion.path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
        <path d={`${d} L200,40 L0,40 Z`} fill={color} opacity="0.12" />
      </svg>
    </Box>
  );
}

function PerformerCard({ performer, index }) {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
    >
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          overflow: "hidden",
          minWidth: 0,
          borderRadius: "14px",
          border: `1px solid ${C.border}`,
          backgroundColor: C.cardBg,
          boxShadow: "0 1px 2px rgba(17,24,39,0.04)",
          p: { xs: 1.75, sm: 2.25, md: 2.75 },
          transition: "transform 180ms ease, box-shadow 180ms ease",
          "&:hover": {
            transform: "translateY(-3px)",
            boxShadow: "0 10px 24px rgba(17,24,39,0.08)",
          },
        }}
      >
        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: performer.bar }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <Chip
            size="small"
            label={`#${performer.rank} ${performer.tier}`}
            sx={{
              fontFamily,
              fontSize: 12,
              fontWeight: 700,
              bgcolor: performer.bg,
              color: performer.text,
              flexShrink: 0,
            }}
          />
          <Chip
            size="small"
            label={performer.cycle}
            sx={{
              fontFamily,
              fontSize: 12,
              fontWeight: 600,
              bgcolor: "#f3f4f6",
              color: C.textPrimary,
              ml: "auto",
              maxWidth: "55%",
              "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
            }}
          />
        </Box>

        <Typography sx={{ ...cardTitleSx, fontSize: 18 }}>{performer.name}</Typography>
        <Typography sx={{ ...bodyTextSx, fontSize: 13 }}>{performer.team}</Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 1,
            mt: 2,
            p: { xs: 1, sm: 1.5 },
            bgcolor: "#f9fafb",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <Box>
            <Typography sx={METRIC_LABEL_SX}>Duration</Typography>
            <Typography sx={METRIC_VALUE_SX}>{performer.duration}</Typography>
          </Box>
          <Box>
            <Typography sx={METRIC_LABEL_SX}>Power</Typography>
            <Typography sx={{ ...METRIC_VALUE_SX, color: C.accentText }}>{performer.power}</Typography>
          </Box>
          <Box>
            <Typography sx={METRIC_LABEL_SX}>Voltage</Typography>
            <Typography sx={METRIC_VALUE_SX}>{performer.voltage}</Typography>
          </Box>
        </Box>

        <Sparkline d={performer.sparkline} color={C.accentText} />
      </Paper>
    </Box>
  );
}

export default function TopPerformers({ top3, loading }) {
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily, fontSize: { xs: 16, sm: 17 }, fontWeight: 700, color: C.textPrimary }}>
            Top Performers
          </Typography>
          <Typography sx={bodyTextSx}>Highest aggregate wattage &amp; sustained cadence</Typography>
        </Box>
        <Typography sx={{ fontFamily, fontSize: 12, color: C.labelColor }}>
          {loading ? "Updating…" : "Updated just now"}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
          gap: { xs: 1.5, md: 2 },
        }}
      >
        {top3.map((p, i) => (
          <PerformerCard key={p.rank} performer={p} index={i} />
        ))}
        {!loading && top3.length === 0 && (
          <Typography sx={{ fontFamily, fontSize: 13, color: C.labelColor, gridColumn: "1 / -1", p: 1 }}>
            No active sessions yet.
          </Typography>
        )}
      </Box>
    </Box>
  );
}