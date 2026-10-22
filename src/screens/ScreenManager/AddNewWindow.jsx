import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DesktopWindowsRoundedIcon from "@mui/icons-material/DesktopWindowsRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import AspectRatioRoundedIcon from "@mui/icons-material/AspectRatioRounded";
import SettingsSuggestRoundedIcon from "@mui/icons-material/SettingsSuggestRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import MonitorRoundedIcon from "@mui/icons-material/MonitorRounded";

import BottomSheet from "../../components/BottonSheet";
import { useSocket } from "../../context/SocketContext";

const API_BASE = "http://127.0.0.1:8000";
const SCREENS_URL = `${API_BASE}/api/admin/screens/`;
const WINDOWS_URL = `${API_BASE}/screens/windows/`;

const GREEN = "#047857";
const DARK_GREEN = "#064E3B";
const LIGHT_GREEN = "#ECFDF5";
const BORDER = "#E2E8F0";

const initialForm = {
  name: "",
  activee_screen: "",
  is_active: true,
  position_details: {
    name: "",
    x: 0,
    y: 0,
    width: 1200,
    height: 900,
    fullscreen: false,
    always_on_top: false,
    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: true,
    visible: true,
    menu_bar_visible: false,
    auto_hide_menu_bar: true,
    opacity: 1,
  },
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    backgroundColor: "#FFFFFF",
    transition: "background-color 160ms ease, box-shadow 160ms ease",
    "& fieldset": {
      borderColor: BORDER,
    },
    "&:hover fieldset": {
      borderColor: "#94A3B8",
    },
    
   
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.875rem",
    color: "#64748B",
   
  },
  "& .MuiInputBase-input": {
    fontSize: "0.875rem",
  },
};

const sectionPaperSx = {
  p: { xs: 2, sm: 2.5 },
  border: `1px solid ${BORDER}`,
  borderRadius: "14px",
  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.025)",
  backgroundColor: "#FFFFFF",
};

const switchItems = [
  ["fullscreen", "Fullscreen", "Use the entire display"],
  ["always_on_top", "Always on top", "Keep above other windows"],
 
];

function SectionHeading({ icon, title, description, action }) {
  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      spacing={1.5}
      sx={{ mb: 2.5 }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: "10px",
          display: "grid",
          placeItems: "center",
          color: GREEN,
          backgroundColor: LIGHT_GREEN,
        }}
      >
        {icon}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: "0.95rem",
            fontWeight: 750,
            color: "#0F172A",
            lineHeight: 1.5,
          }}
        >
          {title}
        </Typography>

        {description && (
          <Typography
            sx={{
              mt: 0.35,
              color: "#64748B",
              fontSize: "0.79rem",
              lineHeight: 1.6,
            }}
          >
            {description}
          </Typography>
        )}
      </Box>

      {action}
    </Stack>
  );
}

function SettingTile({ field, label, description, checked, onChange }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        p: 1.4,
        minHeight: 76,
        border: `1px solid ${BORDER}`,
        borderRadius: "11px",
        backgroundColor: checked ? "#F6FCF9" : "#FFFFFF",
        transition: "background-color 160ms ease, border-color 160ms ease",
        borderColor: checked ? "#B7E4D2" : BORDER,
        "&:hover": {
          borderColor: "#A7CDBD",
        },
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: "0.81rem",
            fontWeight: 650,
            color: "#1E293B",
            lineHeight: 1.4,
          }}
        >
          {label}
        </Typography>

        <Typography
          sx={{
            mt: 0.4,
            fontSize: "0.7rem",
            color: "#94A3B8",
            lineHeight: 1.4,
          }}
        >
          {description}
        </Typography>
      </Box>

      <Switch
        size="small"
        checked={checked}
        onChange={(event) => onChange(field, event.target.checked)}
        color="success"
        inputProps={{ "aria-label": label }}
        sx={{
          ml: 0.5,
          "& .MuiSwitch-switchBase.Mui-checked": {
            color: GREEN,
          },
          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
            backgroundColor: GREEN,
          },
        }}
      />
    </Box>
  );
}

function AddNewWindow({ onClose, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [screens, setScreens] = useState([]);
  const [loadingScreens, setLoadingScreens] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const {send} = useSocket()
  const selectedScreen = useMemo(
    () =>
      screens.find(
        (screen) => String(screen.id) === String(form.activee_screen)
      ),
    [screens, form.activee_screen]
  );

  // Correctly handles the API response:
  // { status: true, message: "...", data: [...] }
  const fetchScreens = useCallback(async () => {
    setLoadingScreens(true);
    setError("");

    try {
      const response = await fetch(SCREENS_URL);
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.status === false) {
        throw new Error(
          result?.message ||
            result?.detail ||
            result?.error ||
            "Unable to load available screens."
        );
      }

      console.log("Fetched screens:", result?.data);

      const screenList = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.results)
          ? result.results
          : Array.isArray(result)
            ? result
            : [];

      setScreens(screenList);

      if (screenList.length === 0) {
        setError(
          "No screens are available. Create a screen before adding a window."
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the backend while loading screens."
      );
    } finally {
      setLoadingScreens(false);
    }
  }, []);

  useEffect(() => {
    fetchScreens();
  }, [fetchScreens]);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updatePosition = (field, value) => {
    setForm((previous) => ({
      ...previous,
      position_details: {
        ...previous.position_details,
        [field]: value,
      },
    }));
  };

  const handleWindowNameChange = (value) => {
    setForm((previous) => ({
      ...previous,
      name: value,
      position_details: {
        ...previous.position_details,
        name:
          !previous.position_details.name ||
          previous.position_details.name === previous.name
            ? value
            : previous.position_details.name,
      },
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter a window name.");
      return;
    }

    if (!form.activee_screen) {
      setError("Please select a screen to assign to this window.");
      return;
    }

    const position = form.position_details;
    const width = Number(position.width);
    const height = Number(position.height);
    const opacity = Number(position.opacity);

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < 1 ||
      height < 1
    ) {
      setError("Width and height must be valid numbers greater than zero.");
      return;
    }

    if (
      !Number.isFinite(opacity) ||
      opacity < 0 ||
      opacity > 1
    ) {
      setError("Opacity must be between 0 and 1.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      activee_screen: Number(form.activee_screen),
      is_active: form.is_active,
      position_details: {
        ...position,
        name: position.name.trim() || form.name.trim(),
        x: Number(position.x),
        y: Number(position.y),
        width,
        height,
        opacity,
      },
    };

    setSaving(true);

    try {
      const response = await fetch(WINDOWS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.status === false) {
        const message =
          result?.error ||
          (typeof result === "object"
            ? Object.entries(result)
                .filter(([key]) => key !== "existing_window")
                .map(([key, value]) => {
                  const detail = Array.isArray(value)
                    ? value.join(", ")
                    : typeof value === "string"
                      ? value
                      : JSON.stringify(value);

                  return `${key}: ${detail}`;
                })
                .join("\n")
            : "Failed to create the window.");

        throw new Error(message || "Failed to create the window.");
      }

      onCreated?.(result);
      onClose?.();
    } catch (err) {
      setError(
        err.message || "Unable to create the window. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const position = form.position_details;
  const previewWidth = Math.max(1, Number(position.width) || 1);
  const previewHeight = Math.max(1, Number(position.height) || 1);
  const previewRatio = Math.min(previewWidth / previewHeight, 2.2);

  return (
    <BottomSheet
      width="min(750px, 96vw)"
      height="min(900px, 92vh)"
      onClose={saving ? undefined : onClose}
      title="Add New Window"
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          height: "100%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: "#F8FAFC",
          color: "#0F172A",
          fontFamily: "Inter, sans-serif",
        }}
      >
        
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            px: { xs: 2, sm: 3 },
            py: 2.5,
            "&::-webkit-scrollbar": {
              width: 7,
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#CBD5E1",
              borderRadius: 10,
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "transparent",
            },
          }}
        >
          {error && (
            <Alert
              severity="error"
              onClose={() => setError("")}
              sx={{
                mb: 2.5,
                borderRadius: "11px",
                alignItems: "center",
                whiteSpace: "pre-line",
                "& .MuiAlert-message": {
                  fontSize: "0.82rem",
                },
              }}
            >
              {error}
            </Alert>
          )}

          <Grid container spacing={2.5}>
            {/* Main form */}
            <Grid item xs={12} md={8}>
              <Stack spacing={2.5}>
                <Paper variant="outlined" sx={sectionPaperSx}>
                  <SectionHeading
                    icon={<DesktopWindowsRoundedIcon fontSize="small" />}
                    title="Window Information"
                    description="Set a name and choose which screen this window displays."
                  />

                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      required
                      label="Window name"
                      value={form.name}
                      onChange={(event) =>
                        handleWindowNameChange(event.target.value)
                      }
                      placeholder="e.g. Dashboard Window"
                      inputProps={{ maxLength: 200 }}
                      sx={fieldSx}
                    />

                    <FormControl
                      fullWidth
                      required
                      disabled={loadingScreens || saving}
                      sx={fieldSx}
                    >
                      <InputLabel id="screen-select-label">
                        Assign screen
                      </InputLabel>

                      <Select
                            labelId="screen-select-label"
                            label="Assign screen"
                            value={form.activee_screen}
                            onChange={(event) =>
                                updateField("activee_screen", event.target.value)
                            }
                            MenuProps={{
                                sx: {
                                zIndex: 100000,
                                "& .MuiPaper-root": {
                                    zIndex: 100000,
                                },
                                },
                                PaperProps: {
                                sx: {
                                    zIndex: 100000,
                                    borderRadius: "12px",
                                    mt: 1,
                                    border: "1px solid #E2E8F0",
                                    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.16)",
                                },
                                },
                            }}
                            >
                            {screens.map((screen) => (
                                <MenuItem key={screen.id} value={String(screen.id)}>
                                <Stack direction="row" alignItems="center" spacing={1.2}>
                                    <MonitorRoundedIcon sx={{ color: GREEN, fontSize: 19 }} />

                                    <Box>
                                    <Typography
                                        sx={{
                                        fontSize: "0.86rem",
                                        fontWeight: 600,
                                        }}
                                    >
                                        {screen.name}
                                    </Typography>

                                    
                                    </Box>
                                </Stack>
                                </MenuItem>
                            ))}
                            </Select>
                    </FormControl>

                    {loadingScreens && (
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ color: "#64748B" }}
                      >
                        <CircularProgress size={16} color="success" />
                        <Typography sx={{ fontSize: "0.8rem" }}>
                          Loading available screens...
                        </Typography>
                      </Stack>
                    )}

                    {!loadingScreens && screens.length === 0 && (
                      <Button
                        type="button"
                        onClick={fetchScreens}
                        disabled={saving}
                        sx={{
                          alignSelf: "flex-start",
                          textTransform: "none",
                          color: GREEN,
                        }}
                      >
                        Retry loading screens
                      </Button>
                    )}
                  </Stack>
                </Paper>

                {/* Position and dimensions */}
                <Paper variant="outlined" sx={sectionPaperSx}>
                  <SectionHeading
                    icon={<AspectRatioRoundedIcon fontSize="small" />}
                    title="Position & Dimensions"
                    description="Define where the window opens and how much screen space it occupies."
                  />

                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Position name"
                      value={position.name}
                      onChange={(event) =>
                        updatePosition("name", event.target.value)
                      }
                      placeholder={form.name || "e.g. Dashboard Position"}
                      sx={fieldSx}
                    />

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="X coordinate"
                          value={position.x}
                          onChange={(event) =>
                            updatePosition("x", event.target.value)
                          }
                          helperText="Horizontal position (px)"
                          sx={fieldSx}
                        />
                      </Grid>

                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Y coordinate"
                          value={position.y}
                          onChange={(event) =>
                            updatePosition("y", event.target.value)
                          }
                          helperText="Vertical position (px)"
                          sx={fieldSx}
                        />
                      </Grid>

                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          required
                          type="number"
                          label="Width"
                          value={position.width}
                          onChange={(event) =>
                            updatePosition("width", event.target.value)
                          }
                          inputProps={{ min: 1, max: 20000 }}
                          helperText="Width in pixels"
                          sx={fieldSx}
                        />
                      </Grid>

                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          required
                          type="number"
                          label="Height"
                          value={position.height}
                          onChange={(event) =>
                            updatePosition("height", event.target.value)
                          }
                          inputProps={{ min: 1, max: 20000 }}
                          helperText="Height in pixels"
                          sx={fieldSx}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </Paper>

                {/* Window behavior */}
                <Paper variant="outlined" sx={sectionPaperSx}>
                  <SectionHeading
                    icon={<SettingsSuggestRoundedIcon fontSize="small" />}
                    title="Window Behavior"
                    description="Control visibility, window controls, and desktop behavior."
                  />

                  <Grid container spacing={1.2}>
                    {switchItems.map(([field, label, description]) => (
                      <Grid item xs={12} sm={6} key={field}>
                        <SettingTile
                          field={field}
                          label={label}
                          description={description}
                          checked={Boolean(position[field])}
                          onChange={updatePosition}
                        />
                      </Grid>
                    ))}
                  </Grid>

                  <Divider sx={{ my: 2.5, borderColor: "#EEF2F6" }} />
                </Paper>
              </Stack>
            </Grid>

            
          </Grid>
        </Box>

        {/* Fixed footer */}
        <Divider />

        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1.8,
            flexShrink: 0,
            backgroundColor: "#FFFFFF",
            boxShadow: "0 -5px 18px rgba(15, 23, 42, 0.035)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            spacing={1.5}
          >
            <Button
              type="button"
              onClick={resetForm}
              disabled={saving}
              startIcon={<RestartAltRoundedIcon />}
              sx={{
                alignSelf: { xs: "flex-start", sm: "center" },
                color: "#64748B",
                textTransform: "none",
                fontSize: "0.83rem",
                fontWeight: 650,
                borderRadius: "9px",
                "&:hover": {
                  color: "#0F172A",
                  backgroundColor: "#F1F5F9",
                },
              }}
            >
              Reset settings
            </Button>

            <Stack
              direction="row"
              spacing={1.2}
              justifyContent="flex-end"
            >
              <Button
                type="button"
                onClick={onClose}
                disabled={saving}
                variant="outlined"
                sx={{
                  px: 2.2,
                  minHeight: 42,
                  borderRadius: "9px",
                  borderColor: "#CBD5E1",
                  color: "#475569",
                  textTransform: "none",
                  fontWeight: 650,
                  "&:hover": {
                    borderColor: "#94A3B8",
                    backgroundColor: "#F8FAFC",
                  },
                }}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="contained"
                disabled={saving || loadingScreens || screens.length === 0}
                startIcon={
                  saving ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <AddRoundedIcon />
                  )
                }
                sx={{
                  px: 2.5,
                  minHeight: 42,
                  borderRadius: "9px",
                  backgroundColor: GREEN,
                  color: "#FFFFFF",
                  textTransform: "none",
                  fontWeight: 750,
                  boxShadow: "0 4px 10px rgba(4, 120, 87, 0.15)",
                  "&:hover": {
                    backgroundColor: DARK_GREEN,
                    boxShadow: "0 5px 14px rgba(4, 120, 87, 0.22)",
                  },
                  "&.Mui-disabled": {
                    backgroundColor: "#A7CDBD",
                    color: "#FFFFFF",
                  },
                }}
              >
                {saving ? "Creating window..." : "Create window"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </BottomSheet>
  );
}

export default AddNewWindow;