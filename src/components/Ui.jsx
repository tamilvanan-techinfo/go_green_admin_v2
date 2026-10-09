// src/components/Ui.jsx
// Shared UI primitives — MUI only

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Avatar as MuiAvatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { alpha } from "@mui/material/styles";

import config from "../config.json";

export const API_BASE = config.apiBase;

// =========================================================
// API
// =========================================================

export async function api(path, { method = "GET", json, form } = {}) {
  const init = { method };

  if (json !== undefined) {
    init.headers = {
      "Content-Type": "application/json",
    };

    init.body = JSON.stringify(json);
  } else if (form) {
    init.body = form;
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, init);
    const data = await res.json().catch(() => ({}));

    return {
      ok: res.ok && data.status !== false,
      data,
      res,
    };
  } catch (err) {
    console.error(`API ${method} ${path} failed:`, err);

    return {
      ok: false,
      data: {
        message:
          "Can't reach the server. Check that the backend is running.",
      },
      res: null,
    };
  }
}

// =========================================================
// HELPERS
// =========================================================

export const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

export const fmt2 = (v) => (Number(v) || 0).toFixed(2);

// =========================================================
// ICON
// =========================================================

export function Icon({ name, size = 20, sx, ...props }) {
  return (
    <span
      className="material-symbols-outlined"
      aria-hidden="true"
      style={{
        fontSize: size,
        lineHeight: 1,
        ...sx,
      }}
      {...props}
    >
      {name}
    </span>
  );
}

// =========================================================
// SPINNER
// =========================================================

export function Spinner({ size = 18, ...props }) {
  return (
    <CircularProgress
      size={size}
      thickness={5}
      color="inherit"
      {...props}
    />
  );
}

// =========================================================
// AVATAR
// =========================================================

export function Avatar({
  name,
  src,
  size = 40,
  rounded = true,
  sx,
  ...props
}) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (src && !broken) {
    return (
      <MuiAvatar
        src={src}
        alt=""
        onError={() => setBroken(true)}
        sx={{
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: rounded ? "50%" : 1,
          objectFit: "cover",
          ...sx,
        }}
        {...props}
      />
    );
  }

  return (
    <MuiAvatar
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: rounded ? "50%" : 1,
        bgcolor: "secondary.light",
        color: "secondary.dark",
        fontSize: Math.max(11, size * 0.35),
        fontWeight: 700,
        ...sx,
      }}
      {...props}
    >
      {initials(name)}
    </MuiAvatar>
  );
}

// =========================================================
// TOAST
// =========================================================

const ToastCtx = createContext(() => {});

export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const push = useCallback((message, type = "success") => {
    clearTimeout(timer.current);

    setToast({
      message,
      type,
      id: Date.now(),
    });

    timer.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{
          mt: 7,
          zIndex: 1600,
        }}
      >
        {toast ? (
          <Alert
            severity={toast.type === "error" ? "error" : "success"}
            variant="filled"
            onClose={() => setToast(null)}
            icon={
              <Icon
                name={
                  toast.type === "error"
                    ? "error"
                    : "check_circle"
                }
                size={20}
              />
            }
            sx={{
              minWidth: 280,
              maxWidth: 420,
              alignItems: "center",
              fontWeight: 600,
            }}
          >
            {toast.message}
          </Alert>
        ) : null}
      </Snackbar>
    </ToastCtx.Provider>
  );
}

// =========================================================
// MODAL / DRAWER
// =========================================================

export function Modal({
  open,
  onClose,
  variant = "center",
  compact = false,
  labelledBy,
  widthClass = "max-w-md",
  children,
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) {
      setShown(false);
      return undefined;
    }

    const raf = requestAnimationFrame(() => {
      setShown(true);
    });

    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const drawer = variant === "drawer";

  // -------------------------------------------------------
  // Drawer
  // -------------------------------------------------------

  if (drawer) {
    return (
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 1500,
          bgcolor: "rgba(15, 23, 42, 0.40)",
          backdropFilter: "blur(2px)",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: compact ? "flex-start" : "stretch",
          p: compact ? 2 : 0,
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <Box
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          sx={{
            width: "100%",
            maxWidth: widthClass === "max-w-md" ? 448 : undefined,

            ...(compact
              ? {
                  maxHeight: "calc(100vh - 32px)",
                  borderRadius: 2,
                  overflow: "auto",
                }
              : {
                  height: "100%",
                }),

            bgcolor: "background.paper",
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.15)",

            transform: shown
              ? "translateX(0)"
              : "translateX(110%)",

            transition:
              "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {children}
        </Box>
      </Box>
    );
  }

  // -------------------------------------------------------
  // Center modal
  // -------------------------------------------------------

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1500,
        bgcolor: "rgba(15, 23, 42, 0.40)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Box
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        sx={{
          width: "100%",
          maxWidth: widthClass === "max-w-sm" ? 384 : 448,
          maxHeight: "90vh",
          overflow: "auto",
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.15)",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

// =========================================================
// CONFIRM DIALOG
// =========================================================

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Delete",
  danger = true,
  busy = false,
  error = "",
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onCancel}
      aria-labelledby="confirm-title"
      maxWidth="xs"
      fullWidth
    >
      <DialogContent>
        <Stack spacing={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: danger
                ? "error.light"
                : "rgba(6, 78, 59, 0.08)",
              color: danger
                ? "error.dark"
                : "primary.main",
            }}
          >
            <Icon
              name={danger ? "warning" : "help"}
              size={24}
            />
          </Box>

          <Box>
            <Typography
              id="confirm-title"
              variant="h6"
              sx={{
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {title}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: "text.secondary",
              }}
            >
              {children}
            </Typography>

            {error && (
              <Typography
                role="alert"
                variant="body2"
                sx={{
                  mt: 1,
                  color: "error.main",
                }}
              >
                {error}
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          type="button"
          variant="outlined"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>

        <Button
          type="button"
          variant="contained"
          color={danger ? "error" : "primary"}
          onClick={onConfirm}
          disabled={busy}
          autoFocus
          startIcon={
            busy ? <Spinner size={16} /> : undefined
          }
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// =========================================================
// KPI
// =========================================================

const KPI_TONES = {
  green: {
    background: "#ECFDF5",
    border: "#A7F3D0",
    tile: "#059669",
  },

  amber: {
    background: "#FFFBEB",
    border: "#FDE68A",
    tile: "#F59E0B",
  },

  blue: {
    background: "#EFF6FF",
    border: "#BFDBFE",
    tile: "#2563EB",
  },
};

export function Kpi({
  label,
  value,
  hint,
  icon,
  tone = "green",
  loading = false,
}) {
  const colors = KPI_TONES[tone] || KPI_TONES.green;

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.background,
        boxShadow: "0 2px 10px rgba(15, 23, 42, 0.035)",
      }}
    >
      <CardContent
        sx={{
          px: 2.5,
          py: 2,
          position: "relative",
          "&:last-child": {
            pb: 2,
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{width: "100%"}}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{
                display: "block",
              }}
            >
              {label}
            </Typography>

            <Stack
              direction="row"
              alignItems="baseline"
              spacing={1}
              sx={{ mt: 0.5 }}
            >
              {loading ? (
                <Box
                  sx={{
                    width: 56,
                    height: 36,
                    borderRadius: 1,
                    bgcolor: "divider",
                    opacity: 0.6,
                  }}
                />
              ) : (
                <Typography
                  sx={{
                    fontSize: 34,
                    lineHeight: 1,
                    fontWeight: 800,
                    color: "text.primary",
                  }}
                >
                  {value}
                </Typography>
              )}

              {hint && (
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                  }}
                >
                  {hint}
                </Typography>
              )}
            </Stack>
          </Box>

        </Stack>

        <Box
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 48,
            height: 48,
            borderRadius: 1.5,
            bgcolor: colors.tile,
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.12)",
          }}
        >
          <Icon name={icon} size={26} />
        </Box>
      </CardContent>
    </Card>
  );
}

// =========================================================
// FILTER PILLS
// =========================================================

export function FilterPills({
  options,
  value,
  onChange,
  label,
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      role="group"
      aria-label={label}
      flexWrap="wrap"
      useFlexGap
    >
      {options.map((f) => {
        const selected = value === f.key;

        return (
          <Button
            key={f.key}
            type="button"
            variant={selected ? "contained" : "outlined"}
            color="primary"
            aria-pressed={selected}
            onClick={() => onChange(f.key)}
            sx={{
              height: 40,
              px: 2.5,
              borderRadius: "999px",
              fontSize: 14,
              fontWeight: 700,

              ...(selected
                ? {
                    boxShadow:
                      "0 4px 12px rgba(6, 78, 59, 0.20)",
                  }
                : {
                    bgcolor: "background.paper",
                    color: "text.secondary",
                    borderColor: "divider",

                    "&:hover": {
                      bgcolor: "background.default",
                      color: "text.primary",
                      borderColor: "primary.main",
                    },
                  }),
            }}
          >
            {f.label}
          </Button>
        );
      })}
    </Stack>
  );
}

// =========================================================
// PAGER
// =========================================================

export function Pager({
  page,
  pageSize,
  total,
  onPage,
  onPageSizeChange,
}) {
  const pageCount = Math.max(
    1,
    Math.ceil(total / pageSize)
  );

  const from =
    total === 0 ? 0 : page * pageSize + 1;

  const to = Math.min(
    total,
    (page + 1) * pageSize
  );

  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        borderTop: "1px solid",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1.5,
        flexShrink: 0,
      }}
    >
      {/* Left: rows per page */}
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ whiteSpace: "nowrap", lineHeight: "32px" }}
        >
          Rows per page
        </Typography>
        <TextField
          select
          size="small"
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          aria-label="Rows per page"
          sx={{
            width: 78,
            "& .MuiInputBase-root": { height: 32, fontSize: 13 },
            "& .MuiSelect-select": { display: "flex", alignItems: "center", py: 0 },
          }}
        >
          {[10, 15, 20, 25].map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {/* Right: count + nav */}
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ whiteSpace: "nowrap", mr: 0.5, lineHeight: "36px" }}
        >
          {from}–{to} of {total}
        </Typography>

        <IconButton
          type="button"
          size="small"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
          sx={{
            width: 36,
            height: 36,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "background.paper",
          }}
        >
          <Icon name="chevron_left" size={20} />
        </IconButton>

        <Typography
          variant="body2"
          sx={{
            px: 1,
            fontWeight: 600,
            lineHeight: "36px",
          }}
        >
          {page + 1} / {pageCount}
        </Typography>

        <IconButton
          type="button"
          size="small"
          disabled={page >= pageCount - 1}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
          sx={{
            width: 36,
            height: 36,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "background.paper",
          }}
        >
          <Icon name="chevron_right" size={20} />
        </IconButton>
      </Stack>
    </Box>
  );
}