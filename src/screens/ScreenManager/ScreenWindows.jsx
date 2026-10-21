import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";

import WindowOutlinedIcon from "@mui/icons-material/WindowOutlined";
import MonitorOutlinedIcon from "@mui/icons-material/MonitorOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import AddNewWindow from "./AddNewWindow";
import { useSocket } from "../../context/SocketContext";
import EditWindow from "./EditWindow";
import { invoke } from "@tauri-apps/api/core";
import api from "../../config.json";

const API_URL = `${api.apiBase}/screens/windows/?role=admin`;

const COLORS = {
  primary: "#064E3B",
  primaryLight: "#047857",
  background: "#F3F6FB",
  border: "#E2E8F0",
  text: "#172033",
  muted: "#64748B",
  success: "#059669",
};

const FONT = {
  pageTitle: { xs: "12px", sm: "13px", md: "14px", lg: "15px", xl: "16px" },
  cardTitle: { xs: "9px", sm: "9.5px", md: "10px", lg: "10.5px", xl: "11px" },
  body: { xs: "8px", sm: "8.5px", md: "9px", lg: "9.5px", xl: "10px" },
  button: { xs: "8px", sm: "8.5px", md: "9px", lg: "9.5px", xl: "10px" },
  caption: { xs: "7px", sm: "7.5px", md: "8px", lg: "8.5px", xl: "9px" },
  dialogTitle: { xs: "13px", sm: "14px", md: "15px", lg: "15px", xl: "16px" },
  dialogBody: { xs: "10px", sm: "10.5px", md: "11px", lg: "11.5px", xl: "12px" },
};

const getValue = (object, keys, fallback = "") => {
  for (const key of keys) {
    const value = object?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return fallback;
};

const getWindowName = (window, index) =>
  getValue(window, ["name", "window_name", "title", "label"], `Window ${index + 1}`);

const getScreenName = (window) =>
  getValue(
    window,
    ["screen_name", "assigned_screen_name", "screen_title", "active_screen_details.name"],
    window?.active_screen_details?.name || "Unassigned screen"
  );

const getScreenPath = (window) =>
  window?.active_screen_details?.path ||
  getValue(window, ["screen_path", "assigned_screen_path", "path"], "");

const getPort = (window) =>
  getValue(
    window,
    ["port", "display_port", "connector", "output_port"],
    "Port unavailable"
  );

const formatResolution = (window) => {
  const pos = window?.position_details;
  if (pos?.width && pos?.height) return `${pos.width} × ${pos.height}`;

  const resolution = getValue(window, ["resolution", "display_resolution", "screen_resolution"]);
  if (resolution) return String(resolution);

  const width = getValue(window, ["width", "screen_width", "resolution_width"]);
  const height = getValue(window, ["height", "screen_height", "resolution_height"]);
  if (width && height) return `${width} × ${height}`;

  return "Resolution unavailable";
};

// ✅ is_active added as first priority
const isOnline = (window) => {
  if (typeof window?.is_active === "boolean") return window.is_active;
  if (typeof window?.is_online === "boolean") return window.is_online;
  if (typeof window?.online === "boolean") return window.online;
  if (typeof window?.is_connected === "boolean") return window.is_connected;

  const status = getValue(window, ["status", "connection_status"], "");
  if (typeof status === "string") {
    return ["online", "connected", "active"].includes(status.toLowerCase());
  }

  return false;
};

const getWindowType = (window) =>
  getValue(window, ["display_type", "window_type", "type", "mode"], "DISPLAY");

const getScreens = (window) => {
  const screens = getValue(window, ["available_screens", "screens", "screen_options"]);
  return Array.isArray(screens) ? screens : [];
};

// ─── WindowCard ───────────────────────────────────────────────────────────────


function WindowCard({
  window,
  index,
  onChangeScreen,
  onFocus,
  onConfigure,
  onDetach,
  onToggleOnline,
}) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [focused, setFocused] = useState(false);

  const name = getWindowName(window, index);
  const screenName = getScreenName(window);
  const screenPath = getScreenPath(window);
  const online = isOnline(window);
  const port = getPort(window);
  const resolution = formatResolution(window);
  const screenOptions = getScreens(window);

  return (
    <Card
      elevation={0}
      sx={{
        width: 200,
        height: 155,
        minWidth: 250,
        maxWidth: 300,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${
          focused ? "#86DCC0" : COLORS.border
        }`,
        borderRadius: "10px",
        bgcolor: "#FFFFFF",
        overflow: "visible",
        transition: "border-color 180ms ease, box-shadow 180ms ease",
        "&:hover": {
          borderColor: "#A7DCCB",
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.055)",
        },
      }}
    >
      <CardContent
        sx={{
          p: 1.25,
          "&:last-child": { pb: 1.25 },
          width: "100%",
          height: "100%",
          minHeight: 0,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        {/* Window heading */}
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: 0.75,
            minWidth: 0,
          }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              gap: 0.75,
              minWidth: 0,
              flex: 1,
            }}
          >
            <Box
              component="span"
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: online ? "#34C9A0" : "#94A3B8",
                flexShrink: 0,
              }}
            />

            <Typography
              title={name}
              sx={{
                color: COLORS.primary,
                fontSize: FONT.cardTitle,
                fontWeight: 750,
                lineHeight: 1.4,
                minWidth: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {`Window #${index + 1}: ${name}`}
            </Typography>
          </Stack>

          <Tooltip
            title={online ? "Window is online" : "Window is offline"}
          >
            <Switch
              size="small"
              checked={Boolean(online)}
              onChange={(event) => {
                onToggleOnline?.(
                  window,
                  index,
                  event.target.checked
                );
              }}
              inputProps={{
                "aria-label": `Toggle ${name} online status`,
              }}
              sx={{
                width: 36,
                height: 22,
                p: 0,
                flexShrink: 0,
                "& .MuiSwitch-switchBase": {
                  p: "3px",
                  "&.Mui-checked": {
                    transform: "translateX(14px)",
                    color: "#FFFFFF",
                    "& + .MuiSwitch-track": {
                      bgcolor: "#047857",
                      opacity: 1,
                    },
                  },
                },
                "& .MuiSwitch-thumb": {
                  width: 16,
                  height: 16,
                  boxShadow: "0 1px 3px rgba(15,23,42,0.2)",
                },
                "& .MuiSwitch-track": {
                  borderRadius: 11,
                  bgcolor: "#CBD5E1",
                  opacity: 1,
                },
              }}
            />
          </Tooltip>
        </Stack>

        {/* Hardware output details */}
        <Typography
          title={`${port} • ${resolution}`}
          sx={{
            fontSize: FONT.body,
            color: "#8390A6",
            pl: 1.7,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {`${port} • ${resolution}`}
          {window?.refresh_rate
            ? ` @ ${window.refresh_rate}Hz`
            : ""}
        </Typography>

        {/* Assigned screen */}
        <Paper
          variant="outlined"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            minWidth: 0,
            p: 0.65,
            borderRadius: "7px",
            borderColor: "#E8EDF4",
            bgcolor: "#FBFCFE",
            boxSizing: "border-box",
          }}
        >
          <Avatar
            variant="rounded"
            sx={{
              width: 23,
              height: 23,
              bgcolor: "#071D1A",
              color: "#FFFFFF",
              fontSize: FONT.caption,
              fontWeight: 900,
              borderRadius: "4px",
              flexShrink: 0,
            }}
          >
            {String(
              getValue(
                window,
                ["screen_code", "screen_short_name"],
                "LIVE"
              )
            )
              .slice(0, 5)
              .toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <Typography
              title={screenName}
              sx={{
                color: "#182235",
                fontSize: FONT.body,
                fontWeight: 750,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                lineHeight: 1.35,
              }}
            >
              {screenName}
            </Typography>

            <Typography
              title={screenPath}
              sx={{
                color: "#64748B",
                fontSize: FONT.caption,
                lineHeight: 1.35,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {screenPath || "No screen route assigned"}
            </Typography>
          </Box>

          <Button
            size="small"
            variant="outlined"
            endIcon={
              screenOptions.length > 0 ? (
                <KeyboardArrowDownRoundedIcon
                  sx={{ fontSize: 14 }}
                />
              ) : null
            }
            onClick={(event) => {
              if (screenOptions.length > 0) {
                setMenuAnchor(event.currentTarget);
              } else {
                onChangeScreen(window, index);
              }
            }}
            sx={{
              flexShrink: 0,
              minWidth: 0,
              px: 0.7,
              py: 0.4,
              borderRadius: "5px",
              borderColor: "#E2E8F0",
              color: "#334155",
              bgcolor: "#F8FAFC",
              fontSize: FONT.button,
              fontWeight: 700,
              textTransform: "none",
              whiteSpace: "nowrap",
              "& .MuiButton-endIcon": {
                ml: 0.2,
                mr: -0.3,
              },
              "&:hover": {
                bgcolor: "#ECFDF5",
                borderColor: "#A7DCCB",
              },
            }}
          >
            Change
          </Button>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            slotProps={{
              paper: {
                sx: {
                  mt: 0.5,
                  minWidth: 220,
                  maxHeight: 300,
                  borderRadius: "9px",
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: "0 12px 35px rgba(15,23,42,0.12)",
                  zIndex: 99999,
                },
              },
            }}
          >
            <Typography
              sx={{
                px: 1.6,
                py: 1,
                fontSize: FONT.body,
                fontWeight: 800,
                color: COLORS.muted,
              }}
            >
              SELECT SCREEN
            </Typography>

            {screenOptions.map((screen, screenIndex) => {
              const label =
                typeof screen === "string"
                  ? screen
                  : getValue(
                      screen,
                      ["name", "title", "screen_name"],
                      `Screen ${screenIndex + 1}`
                    );

              return (
                <MenuItem
                  key={String(
                    typeof screen === "object"
                      ? getValue(
                          screen,
                          ["id", "pk", "path"],
                          label
                        )
                      : label
                  )}
                  onClick={() => {
                    setMenuAnchor(null);
                    onChangeScreen(window, index, screen);
                  }}
                  sx={{
                    fontSize: FONT.body,
                    py: 1,
                  }}
                >
                  <MonitorOutlinedIcon
                    sx={{
                      fontSize: 16,
                      mr: 1,
                      color: COLORS.primaryLight,
                    }}
                  />
                  {label}
                </MenuItem>
              );
            })}
          </Menu>
        </Paper>

        {/* Quick actions */}
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: 0.5,
            minWidth: 0,
          }}
        >
          <Button
            size="small"
            onClick={() => onConfigure(window, index)}
            startIcon={
              <SettingsOutlinedIcon sx={{ fontSize: 12 }} />
            }
            sx={{
              p: 0,
              minWidth: 0,
              color: "#64748B",
              fontSize: FONT.button,
              textTransform: "none",
              whiteSpace: "nowrap",
              "& .MuiButton-startIcon": { mr: 0.4 },
            }}
          >
            Edit Config
          </Button>

          <Button
            size="small"
            onClick={() => onDetach(window, index)}
            startIcon={<CloseIcon sx={{ fontSize: 11 }} />}
            sx={{
              p: 0,
              minWidth: 0,
              color: "#64748B",
              fontSize: FONT.button,
              textTransform: "none",
              whiteSpace: "nowrap",
              "& .MuiButton-startIcon": { mr: 0.3 },
              "&:hover": { color: "#DC2626" },
            }}
          >
            Delete
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}


// ─── ScreenWindows ────────────────────────────────────────────────────────────

function ScreenWindows() {
  const [windows, setWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const { send } = useSocket();
  const [selectedWindowData, setSelectedWindowData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedWindow, setSelectedWindow] = useState(null);
  const [openAddNewWindow, setOpenAddNewWindow] = useState(false);
  const [editWindow, setEditWindow] = useState(false);
  const [notice, setNotice] = useState("");

  const fetchWindows = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const response = await fetch(API_URL, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Unable to load windows (HTTP ${response.status}).`);
      }

      const data = await response.json();
      const result = Array.isArray(data)
        ? data
        : data?.results ?? data?.windows ?? data?.data;

      if (!Array.isArray(result)) {
        throw new Error(
          "Unexpected API response. Expected an array or a results/windows/data array."
        );
      }

      setWindows(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch display windows:", err);
      setError(err.message || "Unable to load display windows.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWindows();
  }, [fetchWindows]);

  const handleOnWindowCreated = useCallback(
   async (data) => {
      if (!data?.id) return;
      setWindows((prev) =>
        prev.some(({ id }) => id === data.id) ? prev : [...prev, data]
      );
      const running = await invoke('is_electron_running')
      console.log("is receiver is running",running)
      if(running){
        send({ type: "create_window", data });
      }
    },
    [send]
  );

  const onlineCount = useMemo(
    () => windows.filter((w) => isOnline(w)).length,
    [windows]
  );

  const handleChangeScreen = (window, index, screen = null) => {
    setSelectedWindow({ window, index, screen });
    if (screen) {
      setNotice(
        "Screen selected locally. Connect your screen-assignment API to save this change on the backend."
      );
    }
  };

  const handleSelectWindow = useCallback((item) => {
    setEditWindow(true);
    setSelectedWindowData(item);
  }, []);

  // ✅ Updates is_active in local state and sends via socket
  const handleIsOnline = useCallback(
   async (item, index, newOnlineStatus) => {
      setWindows((prev) =>
        prev.map((w, i) =>
          i === index ? { ...w, is_active: newOnlineStatus } : w
        )
      );

      send({
        type: "toggle_online",
        data: {
          id: item.id,
          index,
          is_active: newOnlineStatus,
          is_app_on:await invoke("is_electron_running")
        },
      });
    },
    [send]
  );

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "none",
        minWidth: 0,
        minHeight: "100%",
        boxSizing: "border-box",
        p: { xs: 0.75, sm: 1, md: 1.5 },
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      {/* Page header */}
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: "none",
          minWidth: 0,
          boxSizing: "border-box",
          mb: 1.5,
          p: { xs: 1, sm: 1.25, md: 1.8 },
          border: `1px solid ${COLORS.border}`,
          borderRadius: "10px",
          bgcolor: "#FFFFFF",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          sx={{
            width: "100%",
            minWidth: 0,
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Stack direction="row" sx={{ alignItems: "center", gap: 1, minWidth: 0, flex: 1 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: { xs: 28, md: 35 },
                height: { xs: 28, md: 35 },
                bgcolor: "#D1FAE5",
                color: COLORS.primaryLight,
                border: "1px solid #A7F3D0",
                borderRadius: "8px",
                flexShrink: 0,
              }}
            >
              <WindowOutlinedIcon sx={{ fontSize: { xs: 16, md: 20 } }} />
            </Avatar>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: FONT.pageTitle,
                  fontWeight: 800,
                  letterSpacing: "-0.25px",
                  color: COLORS.text,
                  lineHeight: 1.5,
                }}
              >
                Active Display Windows &amp; Hardware Output Mapping
              </Typography>

              <Stack direction="row" sx={{ alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
                <Typography sx={{ color: COLORS.muted, fontSize: FONT.body }}>
                  Live hardware monitors, projection ports, and multi-display setups
                </Typography>
                <Chip
                  size="small"
                  label={`${onlineCount} online outputs (Max ${windows.length})`}
                  sx={{
                    height: { xs: 17, md: 19 },
                    bgcolor: "#D1FAE5",
                    color: "#047857",
                    fontSize: FONT.caption,
                    fontWeight: 800,
                    borderRadius: "5px",
                    border: "1px solid #A7F3D0",
                  }}
                />
              </Stack>
            </Box>
          </Stack>

          <Stack
            direction="row"
            sx={{ alignItems: "center", gap: 0.8, justifyContent: "flex-end", flexShrink: 0 }}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={
                refreshing ? (
                  <CircularProgress size={13} color="inherit" />
                ) : (
                  <RefreshIcon sx={{ fontSize: 15 }} />
                )
              }
              onClick={() => fetchWindows({ silent: true })}
              disabled={loading || refreshing}
              sx={{
                minHeight: { xs: 25, md: 30 },
                px: { xs: 0.7, md: 1.1 },
                borderRadius: "6px",
                borderColor: "#A7F3D0",
                color: COLORS.primary,
                fontSize: FONT.button,
                fontWeight: 750,
                textTransform: "none",
                whiteSpace: "nowrap",
                "&:hover": { bgcolor: "#ECFDF5", borderColor: COLORS.primaryLight },
              }}
            >
              Refresh Outputs
            </Button>

            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => setOpenAddNewWindow(true)}
              sx={{
                minHeight: { xs: 25, md: 30 },
                px: { xs: 0.7, md: 1.2 },
                borderRadius: "6px",
                bgcolor: COLORS.primary,
                fontSize: FONT.button,
                fontWeight: 750,
                textTransform: "none",
                whiteSpace: "nowrap",
                boxShadow: "none",
                "&:hover": { bgcolor: COLORS.primaryLight, boxShadow: "none" },
              }}
            >
              Add New Window
            </Button>
          </Stack>
        </Stack>

        {lastUpdated && (
          <Typography sx={{ mt: 0.8, color: "#94A3B8", fontSize: FONT.caption }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
        )}
      </Paper>

      {/* API error */}
      {error && (
        <Alert
          severity="error"
          variant="outlined"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => fetchWindows()}
              sx={{ fontSize: FONT.button }}
            >
              Retry
            </Button>
          }
          sx={{
            width: "100%",
            boxSizing: "border-box",
            mb: 1.5,
            borderRadius: "8px",
            bgcolor: "#FFFFFF",
            fontSize: FONT.body,
          }}
        >
          {error}
        </Alert>
      )}

      {/* Information notice */}
      {notice && (
        <Alert
          severity="info"
          onClose={() => setNotice("")}
          sx={{ width: "100%", mb: 1.5, borderRadius: "8px", fontSize: FONT.body }}
        >
          {notice}
        </Alert>
      )}

      {/* Loading state */}
      {loading && (
        <Box
          sx={{
            width: "100%",
            minHeight: 220,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
          }}
        >
          <CircularProgress size={30} sx={{ color: COLORS.primaryLight }} />
          <Typography sx={{ color: COLORS.muted, fontSize: FONT.body }}>
            Loading display outputs...
          </Typography>
        </Box>
      )}

      {/* Empty state */}
      {!loading && !error && windows.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            boxSizing: "border-box",
            py: 7,
            px: 2,
            textAlign: "center",
            border: `1px dashed ${COLORS.border}`,
            borderRadius: "12px",
          }}
        >
          <MonitorOutlinedIcon sx={{ fontSize: 38, color: "#94A3B8", mb: 1 }} />
          <Typography sx={{ fontWeight: 750, color: COLORS.text, fontSize: FONT.pageTitle }}>
            No display windows found
          </Typography>
          <Typography sx={{ color: COLORS.muted, fontSize: FONT.body, mt: 0.5 }}>
            Connect a display output or refresh the API response.
          </Typography>
          <Button
            onClick={() => fetchWindows()}
            startIcon={<RefreshIcon />}
            sx={{ mt: 1.5, textTransform: "none", fontSize: FONT.button }}
          >
            Refresh windows
          </Button>
        </Paper>
      )}

      {/* Responsive window grid */}
      {!loading && windows.length > 0 && (
        <Grid
          container
          spacing={{ xs: 1, md: 1.5 }}
          sx={{ width: "100%", maxWidth: "none", minWidth: 0, m: 0 }}
        >
          {windows.map((window, index) => (
            <Grid
              item
              key={getValue(window, ["id", "pk", "window_id"], `window-${index}`)}
              xs={12}
              sm={6}
              md={4}
              lg={4}
              xl={3}
              sx={{ minWidth: 0 }}
            >
              <WindowCard
                window={window}
                index={index}
                onChangeScreen={handleChangeScreen}
                onFocus={(item, i) => setSelectedWindow({ window: item, index: i })}
                onConfigure={(item) => handleSelectWindow(item)}
                onDetach={(item, i) => setSelectedWindow({ window: item, index: i })}
                onToggleOnline={handleIsOnline}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {openAddNewWindow && (
        <AddNewWindow
          onClose={() => setOpenAddNewWindow(false)}
          onCreated={handleOnWindowCreated}
        />
      )}

      {editWindow && (
        <EditWindow
          onClose={() => setEditWindow(false)}
          selectedWindow={selectedWindowData}
        />
      )}
    </Box>
  );
}

export default ScreenWindows;