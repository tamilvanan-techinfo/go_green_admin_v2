import React, { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";

import {
  DashboardRounded,
  AccountTreeRounded,
  BusinessCenterRounded,
  GroupsRounded,
  TvRounded,
  AssessmentRounded,
  Settings,
  Description,
  TextFields
} from "@mui/icons-material";

import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    icon: DashboardRounded,
    path: "/dashboard",
  },
  {
    label: "Allocations",
    icon: AccountTreeRounded,
    path: "/allocations",
  },
 
  {
    label: "Screens",
    icon: TvRounded,
    path: "/screen",
  },
  {
    label: "Reports",
    icon: AssessmentRounded,
    path: "/reports",
  },
  {
    label: "CMS",
    icon: TextFields,
    path: "/cms",
  },
  {
    label: "Logs",
    icon: Description,
    path: "/logs",
  },
  {
    label: "Settings",
    icon: Settings,
    path: "/settings",
  },
];

function Footer() {
  const theme = useTheme();

  const location = useLocation();
  const navigate = useNavigate();

  const [hoveredPath, setHoveredPath] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  // Timer reference
  const hideTimerRef = useRef(null);

  /*
   * How long the footer remains visible after navigation.
   * 3000 = 3 seconds
   */
  const NAVIGATION_VISIBLE_TIME = 3000;

  const isActive = (path) => {
    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  // =========================================================
  // CLEAR EXISTING HIDE TIMER
  // =========================================================

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  // =========================================================
  // SHOW FOOTER FOR A FEW SECONDS WHEN ROUTE CHANGES
  // =========================================================

  useEffect(() => {
    /*
     * Clear any previous timer.
     */
    clearHideTimer();

    /*
     * Show footer immediately.
     */
    setIsVisible(true);

    /*
     * Hide footer after the configured duration.
     */
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setHoveredPath(null);
      hideTimerRef.current = null;
    }, NAVIGATION_VISIBLE_TIME);

    /*
     * Cleanup timer when component unmounts
     * or when another navigation happens.
     */
    return () => {
      clearHideTimer();
    };
  }, [location.pathname]);

  // =========================================================
  // MOUSE ENTER
  // =========================================================

  const handleFooterMouseEnter = () => {
    /*
     * Cancel the navigation timer.
     *
     * As long as the mouse is inside the footer,
     * keep it visible.
     */
    clearHideTimer();

    setIsVisible(true);
  };

  // =========================================================
  // MOUSE LEAVE
  // =========================================================

  const handleFooterMouseLeave = () => {
    setHoveredPath(null);

    /*
     * Hide shortly after leaving the footer.
     */
    clearHideTimer();

    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      hideTimerRef.current = null;
    }, 400);
  };

  // =========================================================
  // NAVIGATION
  // =========================================================

  const handleNavigation = (path) => {
    if (location.pathname === path) {
      return;
    }

    navigate(path);
  };

  return (
    <>
      {/* =========================================================
          INVISIBLE FOOTER HIT AREA

          The footer is normally hidden.

          When the mouse enters this area:
          → Footer appears.

          When the route changes:
          → Footer automatically appears for 3 seconds.
      ========================================================= */}
      <Box
        onMouseEnter={handleFooterMouseEnter}
        onMouseLeave={handleFooterMouseLeave}
        sx={{
          position: "fixed",

          bottom: 24,
          left: "50%",

          transform: "translateX(-50%)",

          width: "620px",
          height: "105px",

          maxWidth: "calc(100vw - 40px)",

          zIndex: 1300,

          background: "transparent",

          pointerEvents: "auto",
        }}
      >
        {/* =======================================================
            ACTUAL FOOTER
        ======================================================= */}
        <Box
          sx={{
            position: "absolute",

            left: "50%",
            bottom: 0,

            width: "max-content",

            transform: isVisible
              ? "translateX(-50%) translateY(0)"
              : "translateX(-50%) translateY(18px)",

            opacity: isVisible ? 1 : 0,

            pointerEvents: isVisible ? "auto" : "none",

            transition:
              "opacity 220ms ease, transform 350ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* =====================================================
              OUTER AMBIENT GLOW
          ===================================================== */}
          <Box
            sx={{
              position: "absolute",

              inset: "-10px",

              borderRadius: "26px",

              background:
                "linear-gradient(90deg, rgba(16,185,129,0.04), rgba(5,150,105,0.12), rgba(16,185,129,0.04))",

              filter: "blur(18px)",

              opacity: isVisible ? 0.8 : 0,

              transition: "opacity 300ms ease",

              zIndex: -1,

              pointerEvents: "none",
            }}
          />

          {/* =====================================================
              FOOTER
          ===================================================== */}
          <Box
            sx={{
              position: "relative",

              display: "flex",
              alignItems: "center",

              gap: 0.7,

              px: 1.25,
              py: 1.15,

              background:
                theme.palette.mode === "dark"
                  ? "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(17,24,39,0.96))"
                  : "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))",

              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",

              border:
                theme.palette.mode === "dark"
                  ? "1px solid rgba(255,255,255,0.09)"
                  : "1px solid rgba(15,23,42,0.08)",

              borderRadius: "22px",

              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 22px 60px rgba(0,0,0,0.42)"
                  : "0 22px 60px rgba(15,23,42,0.14), 0 4px 12px rgba(15,23,42,0.05)",

              overflow: "hidden",

              "&::before": {
                content: '""',

                position: "absolute",

                top: 0,
                left: "-100%",

                width: "45%",
                height: "1px",

                background:
                  "linear-gradient(90deg, transparent, rgba(16,185,129,0.6), transparent)",

                animation:
                  "footerShine 7s ease-in-out infinite",

                pointerEvents: "none",

                "@keyframes footerShine": {
                  "0%": {
                    left: "-50%",
                  },

                  "45%, 100%": {
                    left: "120%",
                  },
                },
              },
            }}
          >
            {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
              const active = isActive(path);
              const hovered = hoveredPath === path;

              return (
                <Box
                  key={path}
                  onClick={() => handleNavigation(path)}
                  onMouseEnter={() => setHoveredPath(path)}
                  onMouseLeave={() => setHoveredPath(null)}
                  sx={{
                    position: "relative",

                    width: 92,
                    minWidth: 92,

                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",

                    cursor: "pointer",

                    userSelect: "none",
                  }}
                >
                  {/* =================================================
                      ICON
                  ================================================= */}
                  <Box
                    sx={{
                      position: "relative",

                      width: 52,
                      height: 52,

                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",

                      borderRadius: "14px",

                      overflow: "hidden",

                      background: active
                        ? "linear-gradient(135deg, #059669 0%, #10B981 50%, #047857 100%)"
                        : hovered
                        ? theme.palette.mode === "dark"
                          ? "linear-gradient(135deg, rgba(16,185,129,0.17), rgba(5,150,105,0.08))"
                          : "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.04))"
                        : theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.045)"
                        : "rgba(15,23,42,0.035)",

                      border: active
                        ? "1px solid rgba(255,255,255,0.16)"
                        : theme.palette.mode === "dark"
                        ? "1px solid rgba(255,255,255,0.05)"
                        : "1px solid rgba(15,23,42,0.06)",

                      boxShadow: active
                        ? "0 8px 24px rgba(5,150,105,0.30), inset 0 1px 0 rgba(255,255,255,0.20)"
                        : hovered
                        ? "0 6px 18px rgba(5,150,105,0.10)"
                        : "none",

                      transform:
                        active || hovered
                          ? "translateY(-3px) scale(1.03)"
                          : "translateY(0) scale(1)",

                      transition:
                        "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), background 300ms ease, box-shadow 300ms ease, border-color 300ms ease",

                      "&::before": {
                        content: '""',

                        position: "absolute",

                        inset: 0,

                        background:
                          "linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.20) 50%, transparent 80%)",

                        backgroundSize: "220% 100%",

                        opacity: active ? 1 : 0,

                        animation: active
                          ? "iconShine 3s ease-in-out infinite"
                          : "none",

                        pointerEvents: "none",

                        "@keyframes iconShine": {
                          "0%": {
                            backgroundPosition: "200% 0",
                          },

                          "50%": {
                            backgroundPosition: "0% 0",
                          },

                          "100%": {
                            backgroundPosition: "-200% 0",
                          },
                        },
                      },

                      "&::after": {
                        content: '""',

                        position: "absolute",

                        width: 70,
                        height: 70,

                        left: "50%",
                        top: "50%",

                        transform: "translate(-50%, -50%)",

                        borderRadius: "50%",

                        background:
                          "radial-gradient(circle, rgba(16,185,129,0.20) 0%, transparent 70%)",

                        opacity: hovered && !active ? 1 : 0,

                        transition: "opacity 250ms ease",

                        pointerEvents: "none",
                      },
                    }}
                  >
                    <Icon
                      sx={{
                        position: "relative",

                        zIndex: 2,

                        fontSize: 27,

                        color: active
                          ? "#FFFFFF"
                          : hovered
                          ? theme.palette.primary.main
                          : theme.palette.text.secondary,

                        transform:
                          active || hovered
                            ? "scale(1.10) translateY(-1px)"
                            : "scale(1) translateY(0)",

                        transition:
                          "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), color 220ms ease",

                        filter: active
                          ? "drop-shadow(0 2px 4px rgba(0,0,0,0.12))"
                          : "none",
                      }}
                    />
                  </Box>

                  {/* =================================================
                      LABEL
                  ================================================= */}
                  <Typography
                    sx={{
                      marginTop: 0.9,

                      fontFamily: theme.typography.fontFamily,

                      fontSize: "11px",

                      lineHeight: 1,

                      fontWeight: active ? 700 : 600,

                      letterSpacing: "0.015em",

                      color: active
                        ? theme.palette.primary.main
                        : hovered
                        ? theme.palette.primary.main
                        : theme.palette.text.secondary,

                      whiteSpace: "nowrap",

                      transition:
                        "color 220ms ease, transform 220ms ease",

                      transform:
                        active || hovered
                          ? "translateY(-1px)"
                          : "translateY(0)",

                      opacity: active ? 1 : 0.88,
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </>
  );
}

export default Footer;