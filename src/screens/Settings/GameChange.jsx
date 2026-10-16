
import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useToast } from '../Allocations/Ui'

// ─── Design tokens: matched to BackendSettings.jsx ────────────────────────────
const C = {
  pageBg: "#edf0f7",
  cardBg: "#ffffff",
  border: "#e2e6ef",
  brandDark: "#1b3d2f",
  brandGreenText: "#22543d",
  activeChipBg: "#dcfce7",
  activeChipText: "#166534",
  accentText: "#16a34a",
  labelColor: "#6b7280",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
};

// ─── Available experiences ────────────────────────────────────────────────────
const GAMES = [
  {
    id: "go-green",
    title: "Go Green",
    subtitle: "Go Green Experience",
    description: "Select the Go Green experience.",
    icon: "eco",
    iconBg: "linear-gradient(135deg, #1b3d2f 0%, #16a34a 100%)",
    tag: "Go Green",
  },
  {
    id: "fanpower",
    title: "Fanpower",
    subtitle: "Fanpower Experience",
    description: "Select the Fanpower experience.",
    icon: "air",
    iconBg: "linear-gradient(135deg, #164e63 0%, #0891b2 100%)",
    tag: "Fanpower",
  },
  {
    id: "expo",
    title: "Expo",
    subtitle: "Expo Experience",
    description: "Select the Expo experience.",
    icon: "event",
    iconBg: "linear-gradient(135deg, #4338ca 0%, #818cf8 100%)",
    tag: "Expo",
  },
];

// ─── Shared typography ────────────────────────────────────────────────────────
const fontFamily = "'Inter', 'Segoe UI', system-ui, sans-serif";

const cardTitleSx = {
  fontFamily,
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.4,
  color: C.textPrimary,
};

const bodyTextSx = {
  fontFamily,
  fontSize: 13,
  lineHeight: 1.7,
  color: C.textSecondary,
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function GameChange() {
  const toast = useToast();
  const [selectedGame, setSelectedGame] = useState(null);

  const handleSelect = (game) => {
    setSelectedGame(game.id);
    toast(`${game.title} selected.`);
  };

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        minHeight: "100%",
        boxSizing: "border-box",
        backgroundColor: C.pageBg,
        padding: {
          xs: "16px 12px 32px",
          sm: "22px 20px 48px",
          md: "28px 32px 64px",
        },
        fontFamily,
        textAlign: "left",
        "& *": {
          boxSizing: "border-box",
        },
      }}
    >
     

      {/* Page heading */}
      <Typography
        variant="h6"
      >
        Change Game
      </Typography>

      <Typography
        sx={{
          ...bodyTextSx,
          mb: { xs: 2.5, md: 3 },
          maxWidth: 560,
        }}
      >
        Choose an experience from the available options.
      </Typography>

      {/* Selection status */}
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          p: { xs: 1.5, sm: 2 },
          mb: { xs: 2.5, md: 3 },
          backgroundColor: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: "10px",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ minWidth: 0, flex: "1 1 180px" }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              flexShrink: 0,
              borderRadius: "9px",
              backgroundColor: C.brandDark,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 22 }}
            >
              sports_esports
            </span>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography sx={cardTitleSx}>
              LED DISPLAY 
            </Typography>

            <Typography sx={{ ...bodyTextSx, fontSize: 12 }}>
              {selectedGame
                ? `Selected: ${
                    GAMES.find((game) => game.id === selectedGame)?.title
                  }`
                : "No experience selected"}
            </Typography>
          </Box>
        </Stack>

        <Chip
          size="small"
          label={selectedGame ? "Selected" : "3 Available"}
          sx={{
            fontFamily,
            fontSize: 11,
            fontWeight: 700,
            color: C.activeChipText,
            backgroundColor: C.activeChipBg,
            borderRadius: "20px",
          }}
        />
      </Paper>

      {/* Section heading */}
      <Box sx={{ mb: 2 }}>
        <Typography
          component="h2"
          sx={{
            fontFamily,
            fontSize: { xs: 17, sm: 19 },
            fontWeight: 750,
            color: C.textPrimary,
            mb: 0.5,
          }}
        >
          Available Experiences
        </Typography>

        <Typography sx={{ ...bodyTextSx, fontSize: 12 }}>
          Select one of the three available options.
        </Typography>
      </Box>

      {/* Responsive game cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: { xs: 2, sm: 2.5, md: 3 },
          alignItems: "stretch",
          width: "100%",
        }}
      >
        {GAMES.map((game) => {
          const isSelected = selectedGame === game.id;

          return (
            <Paper
              key={game.id}
              elevation={0}
              sx={{
                minWidth: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                backgroundColor: C.cardBg,
                border: `1px solid ${
                  isSelected ? C.brandDark : C.border
                }`,
                borderRadius: "14px",
                boxShadow: isSelected
                  ? "0 4px 16px rgba(27, 61, 47, 0.12)"
                  : "0 2px 8px rgba(17, 24, 39, 0.025)",
                transition:
                  "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
                "&:hover": {
                  transform: { xs: "none", md: "translateY(-3px)" },
                  boxShadow: "0 8px 24px rgba(17, 24, 39, 0.09)",
                },
              }}
            >
              {/* Card visual */}
              <Box
                sx={{
                  height: { xs: 135, sm: 145, md: 160 },
                  flexShrink: 0,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: game.iconBg,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={{
                    fontSize: 56,
                    color: "rgba(255,255,255,0.88)",
                  }}
                >
                  {game.icon}
                </span>

                <Box
                  sx={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: "20px",
                    backgroundColor: "rgba(255,255,255,0.94)",
                    color: C.textPrimary,
                    fontFamily,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {game.tag}
                </Box>

                {isSelected && (
                  <Chip
                    size="small"
                    icon={
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 15, color: C.activeChipText }}
                      >
                        check_circle
                      </span>
                    }
                    label="Selected"
                    sx={{
                      position: "absolute",
                      right: 10,
                      bottom: 10,
                      fontFamily,
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor: C.activeChipBg,
                      color: C.activeChipText,
                      "& .MuiChip-icon": { ml: 0.75 },
                    }}
                  />
                )}
              </Box>

              {/* Card content */}
              <Stack
                spacing={2}
                sx={{
                  p: { xs: 2, sm: 2.25, md: 2.5 },
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography sx={cardTitleSx}>
                    {game.title}
                  </Typography>

                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: 11,
                      fontWeight: 600,
                      color: C.accentText,
                      mt: 0.5,
                    }}
                  >
                    {game.subtitle}
                  </Typography>

                  <Typography sx={{ ...bodyTextSx, mt: 1.25 }}>
                    {game.description}
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant={isSelected ? "contained" : "outlined"}
                  onClick={() => handleSelect(game)}
                  startIcon={
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18 }}
                    >
                      {isSelected ? "check_circle" : "arrow_forward"}
                    </span>
                  }
                  sx={{
                    minHeight: 40,
                    px: 1.5,
                    borderRadius: "8px",
                    borderColor: C.brandDark,
                    backgroundColor: isSelected
                      ? C.brandDark
                      : "transparent",
                    color: isSelected ? "#fff" : C.brandDark,
                    fontFamily,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "none",
                    whiteSpace: "normal",
                    "&:hover": {
                      borderColor: C.brandDark,
                      backgroundColor: isSelected
                        ? "#153326"
                        : "#f0fdf4",
                    },
                  }}
                >
                  {isSelected ? "Selected" : "Select Experience"}
                </Button>
              </Stack>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
