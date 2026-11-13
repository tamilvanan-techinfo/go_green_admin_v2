import React, { useCallback, useState, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import { ToastProvider } from "./Ui";
import CycleSection from "./CycleSection";
import ParticipantSection from "./ParticipantSection";
import CycleAllocations from "./CycleAllocations";
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import {
  Box,
  Typography,
  Button,
  Stack,
  Tooltip,
} from "@mui/material";

import { driver } from "driver.js";
import "driver.js/dist/driver.css";

import { keyframes } from "@mui/material/styles";
import { COMPACT } from '../../components/Layout';

import GroupsIcon from "@mui/icons-material/Groups";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineRounded";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
`;

const TABS = [
  { key: "cycles",       label: "Cycles",           icon: DirectionsBikeIcon },
  { key: "participants", label: "Participants",      icon: GroupsIcon         },
  { key: "allocations",  label: "Cycle Allocations", icon: AccountTreeIcon   },
];

const STORAGE_KEY     = "allocations.activeTab";
const TOUR_DONE_KEY   = "allocations.tourDone";

function getInitialTab() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return TABS.some((t) => t.key === saved) ? saved : "allocations";
  } catch {
    return "allocations";
  }
}

// ─── tour definition ────────────────────────────────────────────────────────
function startAllocationsTour(goTo) {
  const driverObj = driver({
    showProgress:    true,
    animate:         true,
    overlayOpacity:  0.6,
    smoothScroll:    true,
    allowClose:      true,

    // Go to the right tab before each step so the element is in the DOM
    onNextClick: (element, step, { config }) => {
      const nextIndex = config.steps.indexOf(step) + 1;
      const next = config.steps[nextIndex];
      if (next?.tabKey) goTo(next.tabKey);
      // small delay so the tab panel mounts before driver tries to highlight it
      setTimeout(() => driverObj.moveNext(), 150);
    },

    onDestroyStarted: () => {
      localStorage.setItem(TOUR_DONE_KEY, "true");
      driverObj.destroy();
    },

    steps: [
      // ── Step 0: page title (no tab switch needed) ──
      {
        element: "#alloc-page-title",
        popover: {
          title:       "👋 Welcome to Allocations",
          description: "This is your central hub for managing cycles, participants, and how power is distributed across your team.",
          side:        "bottom",
          align:       "start",
        },
      },

      // ── Step 1: tab bar ──
      {
        element: "#alloc-tab-bar",
        popover: {
          title:       "🗂️ Three Sections",
          description: "Switch between Cycles, Participants, and Cycle Allocations using these tabs. Each tab saves your last position automatically.",
          side:        "bottom",
          align:       "start",
        },
      },

      // ── Step 2: Cycles tab ──
      {
        tabKey:  "cycles",
        element: "#alloc-tab-cycles",
        popover: {
          title:       "🚴 Cycles",
          description: "Create and manage your training or power cycles here. A cycle defines a time window and targets for your team.",
          side:        "bottom",
        },
      },

      // ── Step 3: Participants tab ──
      {
        tabKey:  "participants",
        element: "#alloc-tab-participants",
        popover: {
          title:       "👥 Participants",
          description: "Add or remove the people taking part in your cycles. Each participant can be assigned to one or more cycles.",
          side:        "bottom",
        },
      },

      // ── Step 4: Allocations tab ──
      {
        tabKey:  "allocations",
        element: "#alloc-tab-allocations",
        popover: {
          title:       "🔀 Cycle Allocations",
          description: "This is where you map participants to cycles and set their power/effort allocations. Changes here refresh the dashboard automatically.",
          side:        "bottom",
        },
      },

      // ── Step 5: help button ──
      {
        element: "#alloc-tour-btn",
        popover: {
          title:       "💡 Need a reminder?",
          description: "Click this button any time to replay this tour.",
          side:        "left",
        },
      },
    ],
  });

  // Start on the first tab so elements exist
  goTo("cycles");
  setTimeout(() => driverObj.drive(), 160);
}
// ────────────────────────────────────────────────────────────────────────────

function Allocations() {
  const [tab, setTab]                     = useState(getInitialTab);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDataChange = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
  }, []);

  const goTo = useCallback((key) => {
    setTab(key);
    try { localStorage.setItem(STORAGE_KEY, key); } catch { /* ignore */ }
  }, []);

  // Auto-start tour on first visit
  useEffect(() => {
    const done = localStorage.getItem(TOUR_DONE_KEY);
    if (!done) {
      // slight delay so the DOM is fully painted
      const t = setTimeout(() => startAllocationsTour(goTo), 400);
      return () => clearTimeout(t);
    }
  }, [goTo]);

  return (
    <AppLayout title="">
      <ToastProvider>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "calc(100dvh - 11rem)",
            minHeight: 0,
            minWidth: 0,
            color: "text.primary",
            overflow: "hidden",
            [COMPACT]: { height: "auto", overflow: "visible" },
          }}
        >
          {/* Page title  ← give it an id */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, mb: 1 }}>
            <Typography
              id="alloc-page-title"           // ← driver target
              component="h1"
              variant="h4"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "1.4rem", sm: "1.75rem", lg: "2.125rem" },
              }}
            >
              Allocations
            </Typography>

            {/* Replay tour button */}
            <Tooltip title="Take a tour">
              <Button
                id="alloc-tour-btn"           // ← driver target
                size="small"
                variant="outlined"
                startIcon={<HelpOutlineIcon />}
                onClick={() => startAllocationsTour(goTo)}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                Tour
              </Button>
            </Tooltip>
          </Box>

  
          
          {/* Section tabs — Settings-style responsive card navigation */}
          <Box
            id="alloc-tab-bar"
            component="nav"
            role="tablist"
            aria-label="Allocations sections"
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: { xs: 0.5, md: 0.75, lg: 1, xl: 1.25 },
              p: { xs: 0.5, md: 0.75, lg: 1 },
              mb: { xs: 1.5, md: 2, lg: 2.5 },
              bgcolor: "#F4F6FF",
              border: "1px solid #D9DEEE",
              borderRadius: "12px",
              width: "100%",
              boxSizing: "border-box",
              flexShrink: 0,
            }}
          >
            {TABS.map((t) => {
              const selected = tab === t.key;
              const IconComponent = t.icon;

              const descriptions = {
                cycles: "Manage cycling sessions",
                participants: "Manage participants",
                allocations: "Assign participants to cycles",
              };

              return (
                <Box
                  key={t.key}
                  component="button"
                  type="button"
                  role="tab"
                  id={`alloc-tab-${t.key}`}
                  aria-controls={`alloc-panel-${t.key}`}
                  aria-selected={selected}
                  onClick={() => goTo(t.key)}
                  sx={{
                    appearance: "none",
                    WebkitTapHighlightColor: "transparent",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: { xs: 1, sm: 1.5 },
                    minWidth: 0,
                    minHeight: { xs: 62, sm: 72, md: 74 },
                    px: { xs: 1.25, sm: 2, md: 2.25 },
                    py: { xs: 1.25, sm: 1.75 },
                    borderRadius: { xs: "9px", sm: "12px" },
                    border: "1px solid",
                    borderColor: selected
                      ? "#A7DCC5"
                      : "transparent",
                    bgcolor: selected ? "#FFFFFF" : "transparent",
                    color: selected ? "#064E3B" : "#475569",
                    boxShadow: selected
                      ? "0 3px 10px rgba(6,78,59,0.09), 0 1px 3px rgba(15,23,42,0.04)"
                      : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    font: "inherit",
                    transition: [
                      "background-color 220ms ease",
                      "border-color 220ms ease",
                      "box-shadow 240ms ease",
                      "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                    ].join(", "),

                    "&:hover": {
                      bgcolor: "#FFFFFF",
                      borderColor: selected
                        ? "#A7DCC5"
                        : "#D9E7DF",
                      boxShadow:
                        "0 5px 14px rgba(6,78,59,0.08)",
                      transform: "translateY(-2px)",

                      "& .alloc-tab-icon": {
                        transform: "scale(1.07)",
                        bgcolor: "#D1FAE5",
                        color: "#064E3B",
                      },

                      "& .alloc-tab-label": {
                        color: "#064E3B",
                      },
                    },

                    "&:focus-visible": {
                      outline: "2px solid #047857",
                      outlineOffset: 2,
                    },

                    "&:active": {
                      transform: "translateY(0) scale(0.985)",
                    },

                    "@media (prefers-reduced-motion: reduce)": {
                      transition: "none",
                      "&:hover, &:active": {
                        transform: "none",
                      },
                    },
                  }}
                >
                  {/* Icon */}
                  <Box
                    className="alloc-tab-icon"
                    sx={{
                      width: { xs: 34, sm: 42 },
                      height: { xs: 34, sm: 42 },
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: { xs: "8px", sm: "10px" },
                      bgcolor: selected ? "#D1FAE5" : "#E9ECF7",
                      color: selected ? "#064E3B" : "#64748B",
                      transition: [
                        "background-color 240ms ease",
                        "color 240ms ease",
                        "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                      ].join(", "),
                    }}
                  >
                    <IconComponent
                      sx={{
                        fontSize: { xs: 20, sm: 23 },
                      }}
                    />
                  </Box>

                  {/* Label and description */}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      className="alloc-tab-label"
                      sx={{
                        fontSize: {
                          xs: "13px",
                          sm: "15px",
                          md: "17px",
                        },
                        fontWeight: selected ? 700 : 600,
                        color: selected ? "#064E3B" : "#334155",
                        lineHeight: 1.4,
                        overflowWrap: "anywhere",
                        transition: "color 220ms ease",
                      }}
                    >
                      {t.label}
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
                      {descriptions[t.key]}
                    </Typography>
                  </Box>

                </Box>
              );
            })}
          </Box>


          {/* Tab content — unchanged */}
          <Box
            role="tabpanel"
            id={`alloc-panel-${tab}`}
            aria-labelledby={`alloc-tab-${tab}`}
            key={tab}
            sx={{
              flex: "1 1 0",
              minHeight: 0,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              p: 0,
              "& > *": {
                flex: "1 1 0",
                minHeight: 0,
                minWidth: 0,
                animation: `${fadeIn} 160ms ease-out`,
              },
              [COMPACT]: {
                flex: "0 0 auto",
                overflow: "visible",
                "& > *": { flex: "0 0 auto", minHeight: 0 },
              },
            }}
          >
            {tab === "cycles"       && <CycleSection       onDataChange={handleDataChange} />}
            {tab === "participants" && <ParticipantSection  onDataChange={handleDataChange} />}
            {tab === "allocations"  && <CycleAllocations    refreshTrigger={refreshTrigger} onNavigate={goTo} />}
          </Box>
        </Box>
      </ToastProvider>
    </AppLayout>
  );
}

export default Allocations;