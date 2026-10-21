import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  CardMedia,
  Chip,
  Typography,
  IconButton,
  Tooltip,
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
  Avatar,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { styled, keyframes } from "@mui/system";
import SettingsIcon from "@mui/icons-material/Settings";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/Delete";
import TvOffIcon from "@mui/icons-material/TvOff";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import MonitorIcon from "@mui/icons-material/Monitor";
import { useSocket } from "../../context/SocketContext";

// ─── Design tokens ───────────────────────────────────────────
const API_BASE = "http://localhost:8000";

const THUMB_H = 100;
const HEADER_H = 48;
const STATUS_H = 28;
const BTN_H = 38;

// ─── Live pulse animation ─────────────────────────────────────
const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.7); }
`;

// ─── Screen card ──────────────────────────────────────────────
const ScreenCard = styled("div", {
  shouldForwardProp: (prop) => prop !== "islive",
})(({ theme, islive }) => ({
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  width: "100%",
  height: 240,
  minHeight: 240,
  flexShrink: 0,
  overflow: "visible",
  borderRadius: 10,
  border: `2px solid ${islive ? "#10B981" : theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  boxShadow: islive
    ? `0 0 0 1px rgba(16,185,129,0.12),
       0 0 10px rgba(16,185,129,0.18),
       0 0 22px rgba(16,185,129,0.12)`
    : "0 1px 4px rgba(15,23,42,0.06)",
  transition: "border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease",
  "&:hover": {
    transform: "translateY(-2px)",
    borderColor: islive ? "#059669" : theme.palette.text.secondary,
    boxShadow: islive
      ? `0 0 0 1px rgba(16,185,129,0.18),
         0 0 14px rgba(16,185,129,0.24),
         0 0 28px rgba(16,185,129,0.16)`
      : "0 3px 10px rgba(15,23,42,0.10)",
  },
}));

// ─── Component ───────────────────────────────────────────────
export default function Screens({ handleControlFor }) {
  const theme = useTheme();
  const { send } = useSocket();

  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({
    id: null, name: "", path: "", is_live: false, thumbnail: null,
  });

  // ─── Fetch ────────────────────────────────────────────────
  const fetchScreens = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/screens/`);
      if (!res.ok) throw new Error("Failed to fetch screens");
      const data = await res.json();
      setScreens(data.data || []);
    } catch (error) {
      console.error("Error fetching screens:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchScreens(); }, []);

  // ─── Dialog helpers ───────────────────────────────────────
  const openAdd = () => {
    setForm({ id: null, name: "", path: "", is_live: false, thumbnail: null });
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
    setForm({ id: null, name: "", path: "", is_live: false, thumbnail: null });
  };

  const handleFormChange = (event) => {
    const { name, value, checked, files, type } = event.target;
    if (name === "thumbnail") {
      setForm((prev) => ({ ...prev, thumbnail: files?.[0] || null }));
    } else if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ─── Save ─────────────────────────────────────────────────
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
      formData.append("is_live", form.is_live ? "true" : "false");
      if (form.thumbnail) formData.append("thumbnail", form.thumbnail);
      const response = await fetch(url, { method: isEdit ? "PUT" : "POST", body: formData });
      const data = await response.json();
      if (!response.ok || !data.status) { alert(data.message || "Failed to save screen"); return; }
      closeDialog();
      await fetchScreens();
    } catch (error) {
      console.error("Error saving screen:", error);
      alert("Error saving screen");
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────
  const handleDelete = async (screen) => {
    if (!window.confirm(`Delete "${screen.name}"?`)) return;
    try {
      const response = await fetch(`${API_BASE}/api/admin/screens/${screen.id}/`, { method: "DELETE" });
      if (!response.ok) { alert("Failed to delete screen"); return; }
      setScreens((prev) => prev.filter((item) => item.id !== screen.id));
    } catch (error) {
      console.error("Error deleting screen:", error);
    }
  };

  // ─── Skeleton ─────────────────────────────────────────────
  const SkeletonCard = () => (
    <Box sx={{
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: 240,
      p: 1.5,
      gap: 0.75,
      borderRadius: "10px",
      border: `1px solid ${theme.palette.divider}`,
      bgcolor: "background.paper",
    }}>
      <Skeleton variant="text" width="55%" height={18} />
      <Skeleton variant="text" width="35%" height={13} />
      <Skeleton variant="rounded" sx={{ width: "100%", height: THUMB_H, borderRadius: "7px" }} />
      <Skeleton variant="text" width="40%" height={16} />
      <Skeleton variant="rounded" sx={{ width: "100%", height: 30, mt: "auto", borderRadius: "6px" }} />
    </Box>
  );

  // ─── Card renderer ────────────────────────────────────────
  const renderScreenCard = (screen) => (
    <ScreenCard key={screen.id} islive={Boolean(screen.is_live)}>

      {/* LIVE badge */}
      {screen.is_live && (
        <Box sx={{
          position: "absolute",
          top: -8,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 5,
          height: 17,
          minWidth: 100,
          px: 1,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.6,
          bgcolor: "#059669",
          color: "#FFFFFF",
          borderRadius: "7px",
          border: "1px solid #10B981",
          fontSize: 8.5,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: 0.3,
          whiteSpace: "nowrap",
          boxShadow: "0 2px 6px rgba(5,150,105,0.22)",
        }}>
          <Box sx={{
            width: 5,
            height: 5,
            flexShrink: 0,
            borderRadius: "50%",
            bgcolor: "#BBF7D0",
            animation: "livePulse 1.5s ease-in-out infinite",
            "@keyframes livePulse": {
              "0%, 100%": { opacity: 1, transform: "scale(1)" },
              "50%": { opacity: 0.55, transform: "scale(0.8)" },
            },
          }} />
          BROADCASTING
        </Box>
      )}

      {/* Title + path */}
      <Box sx={{
        boxSizing: "border-box",
        height: HEADER_H,
        minHeight: HEADER_H,
        flexShrink: 0,
        px: 1.5,
        pt: 1.25,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", pr: 5, minWidth: 0 }}>
          <Typography sx={{
            minWidth: 0,
            flex: 1,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            overflow: "hidden",
            fontWeight: 700,
            fontSize: 12,
            lineHeight: 1.3,
            color: "text.primary",
          }}>
            {screen.name}
          </Typography>
        </Stack>
        <Typography sx={{
          mt: 0.15,
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          overflow: "hidden",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9.5,
          lineHeight: 1.3,
          color: "text.secondary",
        }}>
          {screen.path}
        </Typography>
      </Box>

      {/* Edit / Delete */}
      <Stack direction="row" spacing={0} sx={{ position: "absolute", top: 6, right: 4, zIndex: 2 }}>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => openEdit(screen)} sx={{ p: "2px" }}>
            <EditOutlinedIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => handleDelete(screen)} sx={{ p: "2px" }}>
            <DeleteOutlineIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Thumbnail */}
      <Box sx={{
        mx: 1.5,
        height: THUMB_H,
        minHeight: THUMB_H,
        flexShrink: 0,
        boxSizing: "border-box",
        borderRadius: "7px",
        overflow: "hidden",
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 0.5,
        color: "text.disabled",
      }}>
        {screen.thumbnail ? (
          <CardMedia
            component="img"
            image={`${API_BASE}${screen.thumbnail}`}
            alt={screen.name}
            sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <>
            <ImageOutlinedIcon sx={{ fontSize: 22, opacity: 0.35 }} />
            <Typography sx={{ fontSize: 9.5, opacity: 0.45 }}>No thumbnail</Typography>
          </>
        )}
      </Box>

      {/* Status row */}
      <Box sx={{
        height: STATUS_H,
        minHeight: STATUS_H,
        px: 1.5,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 0.6,
        overflow: "hidden",
      }}>
        <Typography sx={{ flexShrink: 0, fontSize: 11, lineHeight: 1, color: "text.secondary" }}>
          Status:
        </Typography>
        <Chip
          label={screen.is_live ? "Live" : "Offline"}
          size="small"
          sx={{
            height: 18,
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 600,
            bgcolor: screen.is_live ? "#D1FAE5" : "background.default",
            color: screen.is_live ? "#047857" : "text.secondary",
            border: `1px solid ${screen.is_live ? "#6EE7B7" : theme.palette.divider}`,
            "& .MuiChip-label": { px: 0.6 },
          }}
        />
        {screen.resolution && (
          <Chip
            label={screen.resolution}
            size="small"
            sx={{
              ml: "auto",
              maxWidth: "45%",
              height: 18,
              fontSize: 9,
              fontWeight: 600,
              fontFamily: "'IBM Plex Mono', monospace",
              bgcolor: "background.default",
              color: "text.secondary",
              border: `1px solid ${theme.palette.divider}`,
              "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis", px: 0.5 },
            }}
          />
        )}
      </Box>

      {/* ✅ Bottom action — Control Screen only, full width */}
      <Box sx={{
        height: BTN_H,
        minHeight: BTN_H,
        mt: "auto",
        px: 1.5,
        pb: 1.25,
        boxSizing: "border-box",
        flexShrink: 0,
        display: "flex",
        alignItems: "flex-end",
      }}>
        <Button
          fullWidth
          size="small"
          variant={screen.is_live ? "contained" : "outlined"}
          startIcon={<SettingsIcon sx={{ fontSize: "13px !important" }} />}
          onClick={() => handleControlFor(screen.path)}
          sx={{
            height: 30,
            minHeight: 30,
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: 0.2,
            textTransform: "none",
            ...(screen.is_live
              ? {
                  bgcolor: "#065F46",
                  color: "#FFFFFF",
                  border: "1px solid #065F46",
                  boxShadow: "none",
                  "& .MuiButton-startIcon": { color: "#34D399", marginRight: "5px" },
                  "&:hover": {
                    bgcolor: "#064E3B",
                    borderColor: "#064E3B",
                    boxShadow: "0 2px 8px rgba(6,95,70,0.18)",
                  },
                }
              : {
                  borderColor: theme.palette.divider,
                  color: "text.secondary",
                  "& .MuiButton-startIcon": { marginRight: "5px" },
                  "&:hover": {
                    borderColor: theme.palette.text.primary,
                    color: "text.primary",
                    bgcolor: "transparent",
                  },
                }),
          }}
        >
          Control Screen
        </Button>
      </Box>
    </ScreenCard>
  );

  // ─── Main UI ──────────────────────────────────────────────
  return (
    <Box sx={{ boxSizing: "border-box", bgcolor: "background.default" }}>

      {/* ✅ Section header */}
      <Box sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: { xs: 1.5, sm: 2 },
        pt: { xs: 1.5, sm: 2 },
        pb: 1.25,
      }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Avatar
            variant="rounded"
            sx={{
              width: 30,
              height: 30,
              bgcolor: "#D1FAE5",
              color: "#047857",
              border: "1px solid #A7F3D0",
              borderRadius: "8px",
            }}
          >
            <MonitorIcon sx={{ fontSize: 17 }} />
          </Avatar>
          <Box>
            <Typography sx={{
              fontWeight: 800,
              fontSize: 13,
              lineHeight: 1.3,
              color: "text.primary",
              letterSpacing: "-0.2px",
            }}>
              Screens
            </Typography>
            <Typography sx={{
              fontSize: 10,
              color: "text.secondary",
              lineHeight: 1.3,
            }}>
              {screens.length} screen{screens.length !== 1 ? "s" : ""} available
            </Typography>
          </Box>
        </Stack>

        {/* ✅ Add Screen button */}
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 13 }} />}
          onClick={openAdd}
          sx={{
            height: 28,
            minHeight: 28,
            px: 1.2,
            borderRadius: "7px",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "none",
            boxShadow: "none",
            bgcolor: "#064E3B",
            "&:hover": { bgcolor: "#047857", boxShadow: "none" },
          }}
        >
          Add Screen
        </Button>
      </Box>

      {/* ✅ Grid */}
      <Box sx={{ px: { xs: 1.5, sm: 2 }, pb: { xs: 1.5, sm: 2 } }}>
        {loading ? (
          <Grid container spacing={1.5} alignItems="stretch">
            {Array.from({ length: 6 }).map((_, index) => (
              <Grid key={index} item xs={6} sm={4} md={3} lg={2} xl={2}>
                <SkeletonCard />
              </Grid>
            ))}
          </Grid>
        ) : screens.length === 0 ? (
          <Box sx={{
            py: 6,
            textAlign: "center",
            color: "text.secondary",
            border: `1px dashed ${theme.palette.divider}`,
            borderRadius: "10px",
          }}>
            <TvOffIcon sx={{ fontSize: 32, mb: 1, opacity: 0.3 }} />
            <Typography variant="body1" fontWeight={600} fontSize={13}>
              No screens yet
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, mb: 2, fontSize: 11 }}>
              Click "Add Screen" to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openAdd}
              size="small"
              sx={{ fontSize: 11, textTransform: "none" }}
            >
              Add Screen
            </Button>
          </Box>
        ) : (
          <Grid container spacing={1.5} alignItems="stretch">
            {screens.map((screen) => (
              <Grid key={screen.id} item xs={6} sm={4} md={3} lg={2} xl={2}>
                {renderScreenCard(screen)}
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Add / Edit dialog */}
      <Dialog open={formOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 1 }}>{form.id ? "Edit Screen" : "Add Screen"}</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="screen-form"
            onSubmit={handleSave}
            sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}
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
              {form.thumbnail ? "Change Thumbnail" : "Upload Thumbnail"}
              <input type="file" name="thumbnail" accept="image/*" hidden onChange={handleFormChange} />
            </Button>
            {form.thumbnail && (
              <Typography variant="caption" color="text.secondary">
                Selected: {form.thumbnail.name}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeDialog} color="inherit" disabled={formLoading}>
            Cancel
          </Button>
          <Button type="submit" form="screen-form" variant="contained" disabled={formLoading}>
            {formLoading ? "Saving…" : form.id ? "Update Screen" : "Save Screen"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}