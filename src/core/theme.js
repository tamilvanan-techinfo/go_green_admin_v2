import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  // =========================================================
  // PALETTE
  // =========================================================
  palette: {
    mode: "light",

    // -------------------------------------------------------
    // Primary - Deep Forest Green
    // -------------------------------------------------------
    primary: {
      main: "#064E3B",
      light: "#047857",
      dark: "#043D2E",
      contrastText: "#FFFFFF",
    },

    // -------------------------------------------------------
    // Secondary - Emerald
    // -------------------------------------------------------
    secondary: {
      main: "#047857",
      light: "#10B981",
      dark: "#065F46",
      contrastText: "#FFFFFF",
    },

    // -------------------------------------------------------
    // Background
    // -------------------------------------------------------
    background: {
      default: "#EFF1FF",
      paper: "#FFFFFF",
    },

    // -------------------------------------------------------
    // Text
    // -------------------------------------------------------
    text: {
      primary: "#0F172A",
      secondary: "#475569",
      disabled: "#94A3B8",
    },

    // -------------------------------------------------------
    // Divider / Border
    // -------------------------------------------------------
    divider: "#D9DEEE",

    // -------------------------------------------------------
    // Success
    // -------------------------------------------------------
    success: {
      main: "#10B981",
      light: "#6EE7B7",
      dark: "#047857",
      contrastText: "#FFFFFF",
    },

    // -------------------------------------------------------
    // Warning
    // -------------------------------------------------------
    warning: {
      main: "#F59E0B",
      light: "#FBBF24",
      dark: "#D97706",
      contrastText: "#FFFFFF",
    },

    // -------------------------------------------------------
    // Error
    // -------------------------------------------------------
    error: {
      main: "#DC2626",
      light: "#EF4444",
      dark: "#B91C1C",
      contrastText: "#FFFFFF",
    },

    // -------------------------------------------------------
    // Info
    // -------------------------------------------------------
    info: {
      main: "#2563EB",
      light: "#60A5FA",
      dark: "#1D4ED8",
      contrastText: "#FFFFFF",
    },
  },

  // =========================================================
  // TYPOGRAPHY
  // =========================================================
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Helvetica Neue",
      "Arial",
      "sans-serif",
    ].join(","),

    // -------------------------------------------------------
    // Headings
    // -------------------------------------------------------
    h1: {
      fontFamily: "Inter, sans-serif",
      fontSize: "2.25rem",
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: "-0.03em",
      color: "#0F172A",
    },

    h2: {
      fontFamily: "Inter, sans-serif",
      fontSize: "2rem",
      fontWeight: 700,
      lineHeight: 1.25,
      letterSpacing: "-0.025em",
      color: "#0F172A",
    },

    h3: {
      fontFamily: "Inter, sans-serif",
      fontSize: "1.75rem",
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: "-0.02em",
      color: "#0F172A",
    },

    h4: {
      fontFamily: "Inter, sans-serif",
      fontSize: "1.5rem",
      fontWeight: 700,
      lineHeight: 1.35,
      letterSpacing: "-0.015em",
      color: "#0F172A",
    },

    h5: {
      fontFamily: "Inter, sans-serif",
      fontSize: "1.25rem",
      fontWeight: 650,
      lineHeight: 1.4,
      color: "#0F172A",
    },

    h6: {
      fontFamily: "Inter, sans-serif",
      fontSize: "1.1rem",
      fontWeight: 650,
      lineHeight: 1.45,
      color: "#0F172A",
    },

    // -------------------------------------------------------
    // Body
    // -------------------------------------------------------
    body1: {
      fontFamily: "Inter, sans-serif",
      fontSize: "14px",
      fontWeight: 400,
      lineHeight: 1.6,
      color: "#0F172A",
    },

    body2: {
      fontFamily: "Inter, sans-serif",
      fontSize: "13px",
      fontWeight: 400,
      lineHeight: 1.5,
      color: "#475569",
    },

    // -------------------------------------------------------
    // Buttons
    // -------------------------------------------------------
    button: {
      fontFamily: "Inter, sans-serif",
      fontSize: "13px",
      fontWeight: 600,
      lineHeight: 1.4,
      textTransform: "none",
    },

    // -------------------------------------------------------
    // Caption
    // -------------------------------------------------------
    caption: {
      fontFamily: "Inter, sans-serif",
      fontSize: "11px",
      fontWeight: 500,
      lineHeight: 1.4,
      color: "#64748B",
    },

    // -------------------------------------------------------
    // Technical / Label text
    // -------------------------------------------------------
    overline: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: "10px",
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "#64748B",
    },
  },

  // =========================================================
  // SHAPE
  // =========================================================
  shape: {
    borderRadius: 10,
  },

  // =========================================================
  // COMPONENTS
  // =========================================================
  components: {
    // =======================================================
    // BUTTON
    // =======================================================
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },

      styleOverrides: {
        root: {
          minHeight: 36,
          padding: "8px 15px",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: "13px",
        },

        containedPrimary: {
          backgroundColor: "#064E3B",
          color: "#FFFFFF",

          "&:hover": {
            backgroundColor: "#047857",
          },

          "&:active": {
            backgroundColor: "#043D2E",
          },
        },

        outlinedPrimary: {
          borderColor: "#064E3B",
          color: "#064E3B",

          "&:hover": {
            backgroundColor: "rgba(6, 78, 59, 0.06)",
            borderColor: "#047857",
          },
        },

        textPrimary: {
          color: "#064E3B",

          "&:hover": {
            backgroundColor: "rgba(6, 78, 59, 0.06)",
          },
        },
      },
    },

    // =======================================================
    // ICON BUTTON
    // =======================================================
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          color: "#475569",

          "&:hover": {
            backgroundColor: "rgba(6, 78, 59, 0.07)",
            color: "#064E3B",
          },
        },
      },
    },

    // =======================================================
    // CARD
    // =======================================================
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: "1px solid #D9DEEE",
          backgroundColor: "#FFFFFF",
          backgroundImage: "none",
          boxShadow: "0 2px 10px rgba(15, 23, 42, 0.035)",
        },
      },
    },

    // =======================================================
    // PAPER
    // =======================================================
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },

        rounded: {
          borderRadius: 14,
        },
      },
    },

    // =======================================================
    // TEXT FIELD
    // =======================================================
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },

    // =======================================================
    // OUTLINED INPUT
    // =======================================================
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: 38,
          borderRadius: 8,
          backgroundColor: "#FFFFFF",

          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#CBD5E1",
          },

          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#94A3B8",
          },

          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#064E3B",
            borderWidth: 1.5,
          },

          "&.Mui-disabled": {
            backgroundColor: "#F1F5F9",
          },
        },

        input: {
          fontFamily: "Inter, sans-serif",
          fontSize: "13px",
          color: "#0F172A",

          "&::placeholder": {
            color: "#94A3B8",
            opacity: 1,
          },
        },
      },
    },

    // =======================================================
    // INPUT LABEL
    // =======================================================
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: "Inter, sans-serif",
          fontSize: "13px",
          color: "#64748B",

          "&.Mui-focused": {
            color: "#064E3B",
          },
        },
      },
    },

    // =======================================================
    // SELECT
    // =======================================================
    MuiSelect: {
      styleOverrides: {
        select: {
          fontFamily: "Inter, sans-serif",
          fontSize: "13px",
        },
      },
    },

    // =======================================================
    // CHIP
    // =======================================================
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 7,
          height: 26,
          fontFamily: "Inter, sans-serif",
          fontSize: "11px",
          fontWeight: 600,
        },

        colorPrimary: {
          backgroundColor: "#D1FAE5",
          color: "#064E3B",
        },

        colorSuccess: {
          backgroundColor: "#D1FAE5",
          color: "#047857",
        },

        colorWarning: {
          backgroundColor: "#FEF3C7",
          color: "#92400E",
        },

        colorError: {
          backgroundColor: "#FEE2E2",
          color: "#B91C1C",
        },
      },
    },

    // =======================================================
    // DIVIDER
    // =======================================================
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "#D9DEEE",
        },
      },
    },

    // =======================================================
    // TOOLTIP
    // =======================================================
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#0F172A",
          color: "#FFFFFF",
          borderRadius: 6,
          padding: "6px 9px",
          fontFamily: "Inter, sans-serif",
          fontSize: "11px",
          fontWeight: 500,
        },

        arrow: {
          color: "#0F172A",
        },
      },
    },

    // =======================================================
    // TABLE
    // =======================================================
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#F4F6FF",

          "& .MuiTableCell-head": {
            color: "#475569",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "10px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            borderBottom: "1px solid #D9DEEE",
          },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "#E2E8F0",
          fontFamily: "Inter, sans-serif",
          fontSize: "13px",
          color: "#0F172A",
        },
      },
    },

    // =======================================================
    // TABLE ROW
    // =======================================================
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color 120ms ease",

          "&:hover": {
            backgroundColor: "#F8FAFC",
          },
        },
      },
    },

    // =======================================================
    // TABS
    // =======================================================
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 40,
        },

        indicator: {
          height: 2,
          borderRadius: 2,
          backgroundColor: "#064E3B",
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 40,
          padding: "8px 14px",
          fontFamily: "Inter, sans-serif",
          fontSize: "13px",
          fontWeight: 600,
          textTransform: "none",
          color: "#64748B",

          "&.Mui-selected": {
            color: "#064E3B",
          },
        },
      },
    },

    // =======================================================
    // BADGE
    // =======================================================
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontFamily: "Inter, sans-serif",
          fontSize: "9px",
          fontWeight: 700,
          minWidth: 16,
          height: 16,
          padding: "0 4px",
        },
      },
    },

    // =======================================================
    // SWITCH
    // =======================================================
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "&.Mui-checked": {
            color: "#064E3B",

            "& + .MuiSwitch-track": {
              backgroundColor: "#10B981",
              opacity: 1,
            },
          },
        },

        track: {
          backgroundColor: "#CBD5E1",
          opacity: 1,
        },
      },
    },

    // =======================================================
    // CHECKBOX
    // =======================================================
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: "#94A3B8",

          "&.Mui-checked": {
            color: "#064E3B",
          },
        },
      },
    },

    // =======================================================
    // RADIO
    // =======================================================
    MuiRadio: {
      styleOverrides: {
        root: {
          color: "#94A3B8",

          "&.Mui-checked": {
            color: "#064E3B",
          },
        },
      },
    },

    // =======================================================
    // ALERT
    // =======================================================
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontFamily: "Inter, sans-serif",
          fontSize: "13px",
        },

        standardSuccess: {
          backgroundColor: "#ECFDF5",
          color: "#065F46",
        },

        standardWarning: {
          backgroundColor: "#FFFBEB",
          color: "#92400E",
        },

        standardError: {
          backgroundColor: "#FEF2F2",
          color: "#991B1B",
        },

        standardInfo: {
          backgroundColor: "#EFF6FF",
          color: "#1E40AF",
        },
      },
    },

    // =======================================================
    // DIALOG
    // =======================================================
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: "1px solid #D9DEEE",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.15)",
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: "Inter, sans-serif",
          fontSize: "18px",
          fontWeight: 700,
          color: "#0F172A",
        },
      },
    },

    MuiDialogContent: {
      styleOverrides: {
        root: {
          fontFamily: "Inter, sans-serif",
        },
      },
    },

    // =======================================================
    // DRAWER
    // =======================================================
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#FFFFFF",
          borderColor: "#D9DEEE",
          backgroundImage: "none",
        },
      },
    },

    // =======================================================
    // MENU
    // =======================================================
    MuiMenu: {
      styleOverrides: {
        paper: {
          marginTop: 4,
          borderRadius: 10,
          border: "1px solid #D9DEEE",
          boxShadow: "0 8px 25px rgba(15, 23, 42, 0.08)",
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 36,
          borderRadius: 6,
          margin: "2px 4px",
          fontFamily: "Inter, sans-serif",
          fontSize: "13px",

          "&:hover": {
            backgroundColor: "#F0FDF4",
            color: "#064E3B",
          },

          "&.Mui-selected": {
            backgroundColor: "#ECFDF5",
            color: "#064E3B",

            "&:hover": {
              backgroundColor: "#D1FAE5",
            },
          },
        },
      },
    },

    // =======================================================
    // SKELETON
    // =======================================================
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: "#E2E8F0",
        },
      },
    },

    // =======================================================
    // APP BAR
    // =======================================================
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          color: "#0F172A",
          backgroundImage: "none",
          boxShadow: "none",
          borderBottom: "1px solid #D9DEEE",
        },
      },
    },
  },
});

export default theme;