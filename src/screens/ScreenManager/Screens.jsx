import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  CardMedia,
  Chip,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Switch,
  FormControlLabel,
  Skeleton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { styled, keyframes } from "@mui/system";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import SettingsIcon from "@mui/icons-material/Settings";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/Delete";
import TvOffIcon from "@mui/icons-material/TvOff";
import SettingsRemoteIcon from "@mui/icons-material/SettingsRemote";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import WifiTetheringIcon from "@mui/icons-material/WifiTethering";

// ─── Design tokens ──────────────────────────────────────────
const TEAL = "#22D3C4";
const TEAL_DARK = "#0f9c90";
const TEAL_BG = "rgba(34,211,196,0.10)";
const TEAL_BORDER = "rgba(34,211,196,0.40)";
const TEAL_GLOW = "rgba(34,211,196,0.20)";
const TEAL_INK = "#032420";

// ─── Fixed card dimensions ──────────────────────────────────
const CARD_H = 290;
const THUMB_H = 130;
const HEADER_H = 54;
const STATUS_H = 32;
const BTN_H = 44;

const API_BASE = "http://localhost:8000";

// ─── Live animation ─────────────────────────────────────────
const pulse = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.4;
    transform: scale(0.7);
  }
`;

const Dot = styled("span")({
  display: "inline-block",
  width: 7,
  height: 7,
  borderRadius: "50%",
  backgroundColor: TEAL,
  animation: `${pulse} 2s ease-in-out infinite`,
  flexShrink: 0,
});

// ─── Screen card ────────────────────────────────────────────
// Prevent custom props from being forwarded to the DOM.
const ScreenCard = styled("div", {
  shouldForwardProp: (prop) => prop !== "islive",
})(({ theme, islive }) => ({
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  position: "relative",

  // Keep your existing responsive dimensions
  width: 180,
  height: 210,
  minWidth: 180,
  maxWidth: 180,
  minHeight: 210,
  maxHeight: 210,

  flexShrink: 0,
  overflow: "visible",
  borderRadius: 12,

  border: `2px solid ${
    islive ? "#10B981" : theme.palette.divider
  }`,

  backgroundColor: theme.palette.background.paper,

  boxShadow: islive
    ? `
        0 0 0 1px rgba(16, 185, 129, 0.12),
        0 0 10px rgba(16, 185, 129, 0.18),
        0 0 22px rgba(16, 185, 129, 0.12)
      `
    : "0 1px 5px rgba(15, 23, 42, 0.06)",

  transition:
    "border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease",

  "&:hover": {
    transform: "translateY(-2px)",
    borderColor: islive
      ? "#059669"
      : theme.palette.text.secondary,
    boxShadow: islive
      ? `
          0 0 0 1px rgba(16, 185, 129, 0.18),
          0 0 14px rgba(16, 185, 129, 0.24),
          0 0 28px rgba(16, 185, 129, 0.16)
        `
      : "0 3px 10px rgba(15, 23, 42, 0.10)",
  },

  // Desktop
  "@media (min-width: 1200px)": {
    width: 250,
    minWidth: 250,
    maxWidth: 250,
    height: 270,
    minHeight: 270,
    maxHeight: 270,
  },

  // Tablet
  "@media (min-width: 768px) and (max-width: 1199px)": {
    width: 190,
    minWidth: 190,
    maxWidth: 190,
    height: 210,
    minHeight: 210,
    maxHeight: 210,
  },

  // Mobile
  "@media (min-width: 401px) and (max-width: 767px)": {
    width: 300,
    minWidth: 300,
    maxWidth: 300,
    height: 250,
    minHeight: 250,
    maxHeight: 250,
  },

  // Small mobile
  "@media (max-width: 400px)": {
    width: 260,
    minWidth: 260,
    maxWidth: 260,
    height: 230,
    minHeight: 230,
    maxHeight: 230,
  },
}));



// ─── Reusable equal-width grid item ─────────────────────────
const gridItemSx = {
  display: "flex",
  minWidth: 0,
  alignItems: "stretch",
  "& > *": {
    width: "100%",
  },
};

// ─── Component ──────────────────────────────────────────────
export default function Screens() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState({
    id: null,
    name: "",
    path: "",
    is_live: false,
    thumbnail: null,
  });

  // ─── Fetch screens ────────────────────────────────────────
  const fetchScreens = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/screens/`);

      if (!res.ok) {
        throw new Error("Failed to fetch screens");
      }

      const data = await res.json();
      setScreens(data.data || []);
    } catch (error) {
      console.error("Error fetching screens:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreens();
  }, []);

  // ─── Add / edit dialogs ───────────────────────────────────
  const openAdd = () => {
    setForm({
      id: null,
      name: "",
      path: "",
      is_live: false,
      thumbnail: null,
    });

    setFormOpen(true);
  };

  const openEdit = (screen) => {
    setForm({
      id: screen.id,
      name: screen.name || "",
      path: screen.path || "",
      is_live: !!screen.is_live,
      thumbnail: null,
    });

    setFormOpen(true);
  };

  const closeDialog = () => {
    setFormOpen(false);

    setForm({
      id: null,
      name: "",
      path: "",
      is_live: false,
      thumbnail: null,
    });
  };

  const handleFormChange = (event) => {
    const {
      name,
      value,
      checked,
      files,
      type,
    } = event.target;

    if (name === "thumbnail") {
      setForm((previous) => ({
        ...previous,
        thumbnail: files?.[0] || null,
      }));
    } else if (type === "checkbox") {
      setForm((previous) => ({
        ...previous,
        [name]: checked,
      }));
    } else {
      setForm((previous) => ({
        ...previous,
        [name]: value,
      }));
    }
  };

  // ─── Save screen ──────────────────────────────────────────
  const handleSave = async (event) => {
    event.preventDefault();
    setFormLoading(true);

    try {
      const isEdit = Boolean(form.id);

      const url = isEdit
        ? `${API_BASE}/api/admin/screens/${form.id}/`
        : `${API_BASE}/api/admin/screens/`;

      const formData = new FormData();

      formData.append("name", form.name);
      formData.append("path", form.path);
      formData.append(
        "is_live",
        form.is_live ? "true" : "false"
      );

      if (form.thumbnail) {
        formData.append("thumbnail", form.thumbnail);
      }

      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        alert(data.message || "Failed to save screen");
        return;
      }

      closeDialog();
      await fetchScreens();
    } catch (error) {
      console.error("Error saving screen:", error);
      alert("Error saving screen");
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Delete screen ────────────────────────────────────────
  const handleDelete = async (screen) => {
    if (!window.confirm(`Delete "${screen.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/admin/screens/${screen.id}/`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        alert("Failed to delete screen");
        return;
      }

      setScreens((previous) =>
        previous.filter((item) => item.id !== screen.id)
      );
    } catch (error) {
      console.error("Error deleting screen:", error);
    }
  };

  // ─── Toggle live status ───────────────────────────────────
  const handleToggleLive = async (screen) => {
    const next = !screen.is_live;

    // Update the UI immediately.
    setScreens((previous) =>
      previous.map((item) => ({
        ...item,
        is_live:
          item.id === screen.id
            ? next
            : next
              ? false
              : item.is_live,
      }))
    );

    try {
      const response = await fetch(
        `${API_BASE}/api/admin/screens/${screen.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_live: next }),
        }
      );

      if (!response.ok) {
        await fetchScreens();
      }
    } catch (error) {
      console.error("Error updating live status:", error);
      await fetchScreens();
    }
  };

  // ─── Loading skeleton ─────────────────────────────────────
// ─── Loading skeleton ─────────────────────────────────────
const SkeletonCard = () => (
  <Box
    sx={{
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",

      // Default dimensions
      width: 180,
      minWidth: 180,
      maxWidth: 180,
      height: 210,
      minHeight: 210,
      maxHeight: 210,

      flexShrink: 0,
      p: 1.5,
      gap: 0.75,
      borderRadius: "10px",
      border: `1px solid ${theme.palette.divider}`,
      bgcolor: "background.paper",

      // Desktop
      "@media (min-width: 1200px)": {
        width: 250,
        minWidth: 250,
        maxWidth: 250,
        height: 270,
        minHeight: 270,
        maxHeight: 270,
        p: 1.75,
        gap: 1,
      },

      // Tablet
      "@media (min-width: 768px) and (max-width: 1199px)": {
        width: 190,
        minWidth: 190,
        maxWidth: 190,
        height: 210,
        minHeight: 210,
        maxHeight: 210,
        p: 1.25,
        gap: 0.75,
      },

      // Mobile
      "@media (min-width: 401px) and (max-width: 767px)": {
        width: 300,
        minWidth: 300,
        maxWidth: 300,
        height: 250,
        minHeight: 250,
        maxHeight: 250,
        p: 1.5,
        gap: 0.75,
      },

      // Small mobile
      "@media (max-width: 400px)": {
        width: 260,
        minWidth: 260,
        maxWidth: 260,
        height: 230,
        minHeight: 230,
        maxHeight: 230,
        p: 1.25,
        gap: 0.5,
      },
    }}
  >
    {/* Screen title */}
    <Skeleton variant="text" width="55%" height={20} />

    {/* Screen path */}
    <Skeleton variant="text" width="35%" height={14} />

    {/* Thumbnail */}
    <Skeleton
      variant="rounded"
      sx={{
        width: "100%",
        height: {
          xs: 100,
          sm: 110,
          md: 100,
          lg: 130,
        },
        minHeight: 70,
        flexShrink: 0,
        borderRadius: "8px",
      }}
    />

    {/* Status */}
    <Skeleton variant="text" width="40%" height={18} />

    {/* Bottom action button */}
    <Skeleton
      variant="rounded"
      sx={{
        width: "100%",
        height: 30,
        mt: "auto",
        flexShrink: 0,
        borderRadius: "7px",
      }}
    />
  </Box>
);


  // ─── Screen card content ──────────────────────────────────
  const     renderScreenCard = (screen) => (
    <ScreenCard
      key={screen.id}
      islive={Boolean(screen.is_live)}
    >
     

      {/* Screen title and path */}
      <Box
        sx={{
          boxSizing: "border-box",
          height: HEADER_H,
          minHeight: HEADER_H,
          flexShrink: 0,
          px: 1.75,
          pt: 1.5,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Stack
          direction="row"
          spacing={0.6}
          sx={{
            alignItems: "center",
            pr: screen.is_live ? 10 : 4,
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              minWidth: 0,
              flex: 1,
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 700,
              fontSize: 13,
              lineHeight: 1.3,
              color: "text.primary",
            }}
          >
            {screen.name}
          </Typography>

          
        </Stack>

        <Typography
          sx={{
            mt: 0.2,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10.5,
            lineHeight: 1.3,
            color: "text.secondary",
          }}
        >
          {screen.path}
        </Typography>
      </Box>

      {/* Edit and delete actions */}
      {!screen.is_live &&(
        <Stack
          direction="row"
          spacing={0}
          sx={{
            position: "absolute",
            top: 8,
            right: screen.is_live ? 116 : 6,
            zIndex: 2,
          }}
        >
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => openEdit(screen)}
              sx={{ p: "3px" }}
            >
              <EditOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDelete(screen)}
              sx={{ p: "3px" }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Stack>
        )}

      {/* Thumbnail: identical height on every card */}
      <Box
        sx={{
          mx: 1.75,
          height: THUMB_H,
          minHeight: THUMB_H,
          flexShrink: 0,
          boxSizing: "border-box",
          borderRadius: "8px",
          overflow: "hidden",
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: "background.default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 0.75,
          color: "text.disabled",
        }}
      >
        {screen.thumbnail ? (
          <CardMedia
            component="img"
            image={`${API_BASE}${screen.thumbnail}`}
            alt={screen.name}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <>
            <ImageOutlinedIcon
              sx={{ fontSize: 26, opacity: 0.35 }}
            />
            <Typography sx={{ fontSize: 10.5, opacity: 0.45 }}>
              No thumbnail
            </Typography>
          </>
        )}
      </Box>

      {/* Status row */}
      <Box
        sx={{
          height: STATUS_H,
          minHeight: STATUS_H,
          px: 1.75,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          overflow: "hidden",
        }}
      >
        <Typography
          sx={{
            flexShrink: 0,
            fontSize: 12,
            lineHeight: 1,
            color: "text.secondary",
          }}
        >
          Status:
        </Typography>

        <Chip
          label={screen.is_live ? "Live" : "Offline"}
          size="small"
          sx={{
            height: 20,
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 600,
            bgcolor: screen.is_live
              ? "#D1FAE5"
              : "background.default",
            color: screen.is_live
              ? "#047857"
              : "text.secondary",
            border: `1px solid ${
              screen.is_live ? "#6EE7B7" : theme.palette.divider
            }`,
            "& .MuiChip-label": { px: 0.75 },
          }}
        />

        {screen.resolution && (
          <Chip
            label={screen.resolution}
            size="small"
            sx={{
              ml: "auto",
              maxWidth: "45%",
              height: 20,
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "'IBM Plex Mono', monospace",
              bgcolor: "background.default",
              color: "text.secondary",
              border: `1px solid ${theme.palette.divider}`,
              "& .MuiChip-label": {
                overflow: "hidden",
                textOverflow: "ellipsis",
                px: 0.6,
              },
            }}
          />
        )}
      </Box>

      {/* Bottom action: aligned at the same position */}
      <Box
        sx={{
          height: BTN_H,
          minHeight: BTN_H,
          mt: "auto",
          px: 1.75,
          pb: 1.5,
          boxSizing: "border-box",
          flexShrink: 0,
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        {screen.is_live ? (
          <Button
            fullWidth
            size="small"
            variant="contained"
            startIcon={
              <SettingsIcon
                sx={{ fontSize: "15px !important" }}
              />
            }
            sx={{
              height: 34,
              minHeight: 34,
              borderRadius: "7px",
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: 0.3,

              bgcolor: "#065F46",
              color: "#FFFFFF",
              border: "1px solid #065F46",
              boxShadow: "none",

              "& .MuiButton-startIcon": {
                color: "#34D399",
                marginRight: "6px",
              },

              "&:hover": {
                bgcolor: "#064E3B",
                borderColor: "#064E3B",
                boxShadow: "0 2px 8px rgba(6, 95, 70, 0.18)",
              },

              "&:active": {
                bgcolor: "#064E3B",
                boxShadow: "none",
              },
            }}
          >
            CONTROL SCREEN
          </Button>

        ) : (
          <Button
            fullWidth
            size="small"
            variant="contained"
            startIcon={
              <CreditCardIcon
                sx={{ fontSize: "15px !important" }}
              />
            }
            onClick={() => handleToggleLive(screen)}
            sx={{
              height: 34,
              fontWeight: 700,
              fontSize: 12,
              bgcolor: "primary.main",
              color: "#fff",
              "&:hover": {
                bgcolor: "primary.dark",
              },
            }}
          >
            Set Live
          </Button>
        )}
      </Box>
{screen.is_live && (
  <Box
    sx={{
      position: "absolute",
      top: -8,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 5,

      height: 19,
      minWidth: 112,
      px: 1.25,
      boxSizing: "border-box",

      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 0.75,

      bgcolor: "#059669",
      color: "#FFFFFF",

      borderRadius: "8px",
      border: "1px solid #10B981",

      fontSize: 9,
      fontWeight: 800,
      lineHeight: 1,
      letterSpacing: 0.3,
      whiteSpace: "nowrap",

      boxShadow: `
        0 2px 6px rgba(5, 150, 105, 0.22),
        0 0 4px rgba(16, 185, 129, 0.12)
      `,
    }}
  >
    {/* Glowing live dot */}
    <Box
      sx={{
        width: 6,
        height: 6,
        flexShrink: 0,
        borderRadius: "50%",
        bgcolor: "#BBF7D0",
        boxShadow: `
          0 0 4px #BBF7D0,
          0 0 8px #34D399,
          0 0 12px rgba(52, 211, 153, 0.8)
        `,
        animation: "livePulse 1.5s ease-in-out infinite",

        "@keyframes livePulse": {
          "0%, 100%": {
            opacity: 1,
            transform: "scale(1)",
            boxShadow: "0 0 4px #BBF7D0, 0 0 8px #34D399",
          },
          "50%": {
            opacity: 0.55,
            transform: "scale(0.8)",
            boxShadow: "0 0 2px #BBF7D0, 0 0 4px #34D399",
          },
        },
      }}
    />

    BROADCASTING
  </Box>
)}
    </ScreenCard>
  );

  // ─── Main UI ──────────────────────────────────────────────
  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        boxSizing: "border-box",
        bgcolor: "background.default",
      }}
    >
    
      {/* Screen grid */}
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 12 }).map((_, index) => (
            <Grid
              key={index}
              item
              xs={12}
              sm={6}
              md={4}
              lg={3}
              sx={gridItemSx}
            >
              <SkeletonCard />
            </Grid>
          ))}
        </Grid>
      ) : screens.length === 0 ? (
        <Box
          sx={{
            mt: 8,
            py: 8,
            textAlign: "center",
            color: "text.secondary",
            border: `1px dashed ${theme.palette.divider}`,
            borderRadius: "14px",
          }}
        >
          <TvOffIcon sx={{ fontSize: 40, mb: 1.5, opacity: 0.3 }} />

          <Typography variant="body1" fontWeight={600}>
            No screens yet
          </Typography>

          <Typography variant="body2" sx={{ mt: 0.5, mb: 2 }}>
            Click "Add Screen" to get started
          </Typography>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAdd}
            size="small"
          >
            Add Screen
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2} alignItems="stretch">
          {screens.map((screen) => (
            <Grid
              key={screen.id}
              item
              xs={12}
              sm={6}
              md={4}
              lg={3}
              sx={gridItemSx}
            >
              {renderScreenCard(screen)}
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add / Edit dialog */}
      <Dialog
        open={formOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1 }}>
          {form.id ? "Edit Screen" : "Add Screen"}
        </DialogTitle>

        <DialogContent>
          <Box
            component="form"
            id="screen-form"
            onSubmit={handleSave}
            sx={{
              mt: 1,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <TextField
              label="Screen Name"
              name="name"
              value={form.name}
              onChange={handleFormChange}
              required
              size="small"
              fullWidth
              placeholder="e.g. Welcome Screen"
            />

            <TextField
              label="Path"
              name="path"
              value={form.path}
              onChange={handleFormChange}
              required
              size="small"
              fullWidth
              placeholder="/welcome"
              helperText="URL route where this screen is accessible"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.is_live}
                  onChange={handleFormChange}
                  name="is_live"
                  color="success"
                />
              }
              label="Set as Live"
            />

            <Button
              variant="outlined"
              component="label"
              size="small"
              sx={{ alignSelf: "flex-start" }}
            >
              {form.thumbnail
                ? "Change Thumbnail"
                : "Upload Thumbnail"}

              <input
                type="file"
                name="thumbnail"
                accept="image/*"
                hidden
                onChange={handleFormChange}
              />
            </Button>

            {form.thumbnail && (
              <Typography variant="caption" color="text.secondary">
                Selected: {form.thumbnail.name}
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={closeDialog}
            color="inherit"
            disabled={formLoading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form="screen-form"
            variant="contained"
            disabled={formLoading}
          >
            {formLoading
              ? "Saving…"
              : form.id
                ? "Update Screen"
                : "Save Screen"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
