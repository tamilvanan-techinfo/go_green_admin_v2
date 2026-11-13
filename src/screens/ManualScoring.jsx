// src/Screens/ManualScoring.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";

import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";

import AppLayout from "../components/AppLayout";
import config from "../config.json";

const API_BASE = String(config.apiBase || "").replace(/\/+$/, "");

const NUMBER_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

const INITIAL_TOAST = {
  open: false,
  message: "",
  severity: "success",
};

const formatNumber = (value) => {
  const number = Number.parseFloat(value ?? 0);

  return Number.isFinite(number) ? number.toFixed(2) : "0.00";
};

function ManualScoring() {
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDark = theme.palette.mode === "dark";

  // ------------------------------------------------------------
  // State
  // ------------------------------------------------------------

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(INITIAL_TOAST);
  const [flashRowId, setFlashRowId] = useState(null);

  // Uncontrolled inputs avoid a render on every keystroke.
  const powerRef = useRef(null);
  const voltageRef = useRef(null);
  const amperageRef = useRef(null);

  const flashTimeoutRef = useRef(null);
  const requestRef = useRef(false);

  // ------------------------------------------------------------
  // Notifications
  // ------------------------------------------------------------

  const showToast = useCallback((message, severity = "success") => {
    setToast({
      open: true,
      message,
      severity,
    });
  }, []);

  const closeToast = () => {
    setToast((previous) => ({
      ...previous,
      open: false,
    }));
  };

  // ------------------------------------------------------------
  // Fetch participants
  // ------------------------------------------------------------

  const fetchParticipants = useCallback(async () => {
    if (requestRef.current) return;

    requestRef.current = true;
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/admin/participant-cycles/`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to load participant data."
        );
      }

      const rows = Array.isArray(data.data) ? data.data : [];

      setParticipants(rows);

      // Keep the currently selected participant synchronized.
      setSelected((previous) => {
        if (!previous) return null;

        return rows.find((row) => row.id === previous.id) || null;
      });
    } catch (error) {
      console.error("Error fetching participants:", error);

      showToast(
        error.message || "Failed to load participant data.",
        "error"
      );
    } finally {
      requestRef.current = false;
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchParticipants();

    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, [fetchParticipants]);

  // ------------------------------------------------------------
  // Search
  // ------------------------------------------------------------

  const filteredParticipants = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return participants;

    return participants.filter((participant) => {
      const name = String(
        participant.participent_name || ""
      ).toLowerCase();

      const cycle = String(
        participant.cycle_no ?? ""
      ).toLowerCase();

      const controller = String(
        participant.controller_no ?? ""
      ).toLowerCase();

      return (
        name.includes(query) ||
        cycle.includes(query) ||
        controller.includes(query)
      );
    });
  }, [participants, search]);

  // ------------------------------------------------------------
  // Input helpers
  // ------------------------------------------------------------

  const clearInputs = useCallback(() => {
    if (powerRef.current) {
      powerRef.current.value = "";
    }

    if (voltageRef.current) {
      voltageRef.current.value = "";
    }

    if (amperageRef.current) {
      amperageRef.current.value = "";
    }
  }, []);

  const readValues = () => ({
    power: powerRef.current?.value?.trim() || "",
    voltage: voltageRef.current?.value?.trim() || "",
    amperage: amperageRef.current?.value?.trim() || "",
  });

  const handleSelectParticipant = (participant) => {
    setSelected(participant);
    setErrors({});

    clearInputs();

    // Focus power input after selecting a participant.
    requestAnimationFrame(() => {
      powerRef.current?.focus();
    });
  };

  const handleClearSelection = () => {
    setSelected(null);
    setErrors({});
    clearInputs();
  };

  const handleInput = (field) => () => {
    setErrors((previous) => {
      if (!previous[field]) return previous;

      return {
        ...previous,
        [field]: "",
      };
    });
  };

  // ------------------------------------------------------------
  // Keyboard navigation
  // Power -> Voltage -> Amperage -> SubmitBott
  // ------------------------------------------------------------

  const handleKeyDown = (nextRef) => (event) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    if (nextRef) {
      nextRef.current?.focus();
    } else {
      handleAddReading();
    }
  };

  // ------------------------------------------------------------
  // Validation
  // ------------------------------------------------------------

  const validate = (values) => {
    const fields = ["power", "voltage", "amperage"];

    const nextErrors = {};
    let hasValue = false;

    for (const field of fields) {
      const value = values[field];

      if (value !== "") {
        hasValue = true;

        if (!NUMBER_PATTERN.test(value)) {
          nextErrors[field] = "Enter a value up to 999.99";
        }
      }
    }

    setErrors(nextErrors);

    if (!hasValue) {
      showToast(
        "Enter at least one reading before adding.",
        "error"
      );

      return false;
    }

    return Object.values(nextErrors).every(
      (error) => !error
    );
  };

  // ------------------------------------------------------------
  // Add reading
  // ------------------------------------------------------------

  const handleAddReading = async () => {
    if (!selected || saving) return;

    const values = readValues();

    if (!validate(values)) return;

    setSaving(true);

    try {
      const payload = {};

      if (values.power !== "") {
        payload.power = Number.parseFloat(values.power);
      }

      if (values.voltage !== "") {
        payload.voltage = Number.parseFloat(values.voltage);
      }

      if (values.amperage !== "") {
        payload.amperage = Number.parseFloat(values.amperage);
      }

      const response = await fetch(
        `${API_BASE}/api/admin/participant-cycles/${selected.id}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.status) {
        showToast(
          data.message || "Failed to add reading.",
          "error"
        );

        return;
      }

      // Use the latest row returned by Django when available.
      // Otherwise, update the existing displayed totals locally.
      const updatedParticipant = data.row
        ? data.row
        : {
            ...selected,
            total_power:
              (Number.parseFloat(selected.total_power) || 0) +
              (payload.power || 0),

            total_voltage:
              (Number.parseFloat(selected.total_voltage) || 0) +
              (payload.voltage || 0),

            total_amperage:
              (Number.parseFloat(selected.total_amperage) || 0) +
              (payload.amperage || 0),
          };

      setParticipants((previous) =>
        previous.map((participant) =>
          participant.id === selected.id
            ? updatedParticipant
            : participant
        )
      );

      setSelected(updatedParticipant);

      // Brief success flash on the participant row.
      setFlashRowId(selected.id);

      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }

      flashTimeoutRef.current = setTimeout(() => {
        setFlashRowId(null);
      }, 900);

      showToast(
        `Reading added to ${selected.participent_name}'s total.`
      );

      clearInputs();
      setErrors({});

      // Ready for the next reading.
      powerRef.current?.focus();
    } catch (error) {
      console.error("Error adding reading:", error);

      showToast(
        error.message || "Error adding reading.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------
  // Theme styles
  // ------------------------------------------------------------

  const surfaceStyle = {
    bgcolor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 2.5,
    boxShadow: "none",
  };

  const selectedRowBackground = isDark
    ? "rgba(16, 185, 129, 0.12)"
    : "rgba(6, 78, 59, 0.055)";

  const flashRowBackground = isDark
    ? "rgba(16, 185, 129, 0.24)"
    : "rgba(16, 185, 129, 0.16)";

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <AppLayout title="Manual Scoring"
    
    >
      <Box
        sx={{
          width: "100%",
          height: "100%",
          minHeight: 0,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          p: {
            xs: 1.5,
            sm: 2.5,
            md: 3,
          },
        }}
      >
        {/* ======================================================
            QUICK SCORING PANEL
        ====================================================== */}

        <Paper
          sx={{
            ...surfaceStyle,
            p: {
              xs: 1.75,
              sm: 2.5,
            },
            flexShrink: 0,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            flexWrap="wrap"
            sx={{ mb: 2 }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.25}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.5,
                  bgcolor: theme.palette.primary.main,
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <BoltRoundedIcon />
              </Box>

              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 750,
                    fontSize: "1rem",
                    color: theme.palette.text.primary,
                  }}
                >
                  Add Reading
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: "12px",
                  }}
                >
                  Enter a new manual scoring measurement
                </Typography>
              </Box>
            </Stack>

            {selected && (
              <Chip
                color="primary"
                variant="outlined"
                avatar={
                  <Avatar
                    src={selected.profile || undefined}
                    sx={{
                      width: 25,
                      height: 25,
                      fontSize: 11,
                    }}
                  >
                    {selected.participent_name?.[0]?.toUpperCase() ||
                      "P"}
                  </Avatar>
                }
                label={`${selected.participent_name} · Cycle ${selected.cycle_no}`}
                onDelete={handleClearSelection}
                deleteIcon={<CloseRoundedIcon />}
                sx={{
                  maxWidth: "100%",
                  "& .MuiChip-label": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                }}
              />
            )}
          </Stack>

          {!selected && (
            <Alert
              severity="info"
              icon={<PersonOutlineRoundedIcon />}
              sx={{
                mb: 2,
                py: 0,
                fontSize: "12px",
              }}
            >
              Select a participant from the table below to begin.
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              handleAddReading();
            }}
          >
            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              spacing={1.5}
              alignItems="stretch"
            >
              <TextField
                inputRef={powerRef}
                label="Current Power (W)"
                placeholder="0.00"
                disabled={!selected || saving}
                error={Boolean(errors.power)}
                helperText={errors.power || " "}
                onInput={handleInput("power")}
                onKeyDown={handleKeyDown(voltageRef)}
                fullWidth
                type="number"
                slotProps={{
                  htmlInput: {
                    step: "0.01",
                    min: "0",
                    max: "999.99",
                  },
                }}
              />

              <TextField
                inputRef={voltageRef}
                label="Current Voltage (V)"
                placeholder="0.00"
                disabled={!selected || saving}
                error={Boolean(errors.voltage)}
                helperText={errors.voltage || " "}
                onInput={handleInput("voltage")}
                onKeyDown={handleKeyDown(amperageRef)}
                fullWidth
                type="number"
                slotProps={{
                  htmlInput: {
                    step: "0.01",
                    min: "0",
                    max: "999.99",
                  },
                }}
              />

              <TextField
                inputRef={amperageRef}
                label="Current Amperage (A)"
                placeholder="0.00"
                disabled={!selected || saving}
                error={Boolean(errors.amperage)}
                helperText={errors.amperage || " "}
                onInput={handleInput("amperage")}
                onKeyDown={handleKeyDown(null)}
                fullWidth
                type="number"
                slotProps={{
                  htmlInput: {
                    step: "0.01",
                    min: "0",
                    max: "999.99",
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!selected || saving}
                startIcon={
                  saving ? (
                    <CircularProgress
                      size={15}
                      color="inherit"
                    />
                  ) : (
                    <AddCircleOutlineRoundedIcon />
                  )
                }
                sx={{
                  height: 40,
                  minWidth: {
                    xs: "100%",
                    sm: 145,
                  },
                  alignSelf: {
                    xs: "stretch",
                    sm: "flex-start",
                  },
                  flexShrink: 0,
                  mt: {
                    xs: 0,
                    sm: 0.25,
                  },
                }}
              >
                {saving ? "Adding..." : "Add to Total"}
              </Button>
            </Stack>
          </Box>

          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 1,
              color: theme.palette.text.secondary,
              fontSize: "11px",
            }}
          >
            Press Enter to move between fields. Press Enter on
            Amperage to submit. New readings are added to the
            participant's existing totals.
          </Typography>
        </Paper>

        {/* ======================================================
            PARTICIPANT TABLE
        ====================================================== */}

        <Card
          sx={{
            ...surfaceStyle,
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <CardHeader
            title={
              <Typography
                sx={{
                  fontSize: "15px",
                  fontWeight: 750,
                  color: theme.palette.text.primary,
                }}
              >
                Participants
              </Typography>
            }
            subheader={
              selected
                ? "Selected participant is ready for scoring."
                : "Choose a participant to enter a reading."
            }
            action={
              <Button
                size="small"
                color="primary"
                onClick={fetchParticipants}
                disabled={loading}
                startIcon={
                  loading ? (
                    <CircularProgress
                      size={14}
                      color="inherit"
                    />
                  ) : (
                    <RefreshRoundedIcon fontSize="small" />
                  )
                }
                sx={{
                  mt: 0.5,
                  mr: {
                    xs: 0,
                    sm: 0.5,
                  },
                }}
              >
                Refresh
              </Button>
            }
            sx={{
              px: {
                xs: 1.75,
                sm: 2.5,
              },
              pt: 2.25,
              pb: 1,
              flexShrink: 0,
              "& .MuiCardHeader-subheader": {
                fontSize: "12px",
                color: theme.palette.text.secondary,
                mt: 0.5,
              },
            }}
          />

          <Divider />

          {/* Search */}
          <Box
            sx={{
              p: {
                xs: 1.5,
                sm: 2,
              },
              flexShrink: 0,
            }}
          >
            <TextField
              fullWidth
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, cycle, or controller..."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon
                        fontSize="small"
                        sx={{
                          color: theme.palette.text.secondary,
                        }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          {/* Table */}
          <CardContent
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              p: {
                xs: 1.5,
                sm: 2,
              },
              pt: 0,
              "&:last-child": {
                pb: 2,
              },
            }}
          >
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{
                flex: 1,
                minHeight: 0,
                borderRadius: 1.5,
                overflow: "auto",
                bgcolor: theme.palette.background.paper,
              }}
            >
              <Table
                stickyHeader
                size="small"
                sx={{
                  minWidth: isMobile ? 620 : 760,
                  "& .MuiTableCell-root": {
                    borderColor: theme.palette.divider,
                    py: 1.25,
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        minWidth: 220,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Participant
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        minWidth: 90,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Cycle
                    </TableCell>

                    {!isMobile && (
                      <TableCell
                        align="center"
                        sx={{
                          minWidth: 110,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Controller
                      </TableCell>
                    )}

                    <TableCell
                      align="right"
                      sx={{
                        minWidth: 110,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Power (W)
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        minWidth: 110,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Voltage (V)
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        minWidth: 120,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Amperage (A)
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {/* Loading */}
                  {loading && participants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isMobile ? 5 : 6}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="center"
                          spacing={1.5}
                          sx={{
                            py: 5,
                            color: theme.palette.text.secondary,
                          }}
                        >
                          <CircularProgress size={20} />
                          <Typography variant="body2">
                            Loading participants...
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Empty state */}
                  {!loading && filteredParticipants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isMobile ? 5 : 6}>
                        <Stack
                          alignItems="center"
                          justifyContent="center"
                          spacing={1}
                          sx={{
                            py: 5,
                            color: theme.palette.text.secondary,
                          }}
                        >
                          <PersonOutlineRoundedIcon
                            sx={{
                              fontSize: 32,
                              opacity: 0.5,
                            }}
                          />

                          <Typography
                            variant="body2"
                            fontWeight={600}
                          >
                            {search
                              ? "No participants found"
                              : "No participants available"}
                          </Typography>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {search
                              ? "Try a different search term."
                              : "Refresh to load participant data."}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Participant rows */}
                  {filteredParticipants.map((participant) => {
                    const isSelected =
                      selected?.id === participant.id;

                    const isFlashing =
                      flashRowId === participant.id;

                    return (
                      <TableRow
                        key={participant.id}
                        hover
                        onClick={() =>
                          handleSelectParticipant(participant)
                        }
                        selected={isSelected}
                        sx={{
                          cursor: "pointer",
                          transition: "background-color 180ms ease",
                          bgcolor: isFlashing
                            ? flashRowBackground
                            : isSelected
                              ? selectedRowBackground
                              : undefined,

                          "&:hover": {
                            bgcolor: isFlashing
                              ? flashRowBackground
                              : isSelected
                                ? selectedRowBackground
                                : theme.palette.action.hover,
                          },

                          "&.Mui-selected": {
                            bgcolor: selectedRowBackground,
                          },

                          "&.Mui-selected:hover": {
                            bgcolor: selectedRowBackground,
                          },
                        }}
                      >
                        {/* Participant */}
                        <TableCell>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1.25}
                          >
                            <Avatar
                              src={participant.profile || undefined}
                              sx={{
                                width: 32,
                                height: 32,
                                fontSize: 12,
                                bgcolor: theme.palette.primary.main,
                                color: "#FFFFFF",
                                flexShrink: 0,
                              }}
                            >
                              {!participant.profile &&
                                (participant.participent_name?.[0]
                                  ?.toUpperCase() || "P")}
                            </Avatar>

                            <Box sx={{ minWidth: 0 }}>
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={0.5}
                                sx={{ minWidth: 0 }}
                              >
                                <Typography
                                  variant="body2"
                                  fontWeight={650}
                                  sx={{
                                    color: theme.palette.text.primary,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxWidth: {
                                      xs: 150,
                                      sm: 250,
                                    },
                                  }}
                                >
                                  {participant.participent_name ||
                                    "Unnamed Participant"}
                                </Typography>

                                {isSelected && (
                                  <CheckCircleRoundedIcon
                                    sx={{
                                      fontSize: 14,
                                      color: theme.palette.primary.main,
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                              </Stack>

                              {isSelected && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: theme.palette.primary.main,
                                    fontSize: "10px",
                                  }}
                                >
                                  Selected for scoring
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>

                        {/* Cycle */}
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={participant.cycle_no ?? "-"}
                            variant="outlined"
                            sx={{
                              fontWeight: 650,
                              bgcolor: isSelected
                                ? theme.palette.primary.main
                                : "transparent",
                              color: isSelected
                                ? "#FFFFFF"
                                : theme.palette.text.primary,
                              borderColor: isSelected
                                ? theme.palette.primary.main
                                : theme.palette.divider,
                            }}
                          />
                        </TableCell>

                        {/* Controller */}
                        {!isMobile && (
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: "12px",
                                color: theme.palette.text.secondary,
                              }}
                            >
                              {participant.controller_no ?? "-"}
                            </Typography>
                          </TableCell>
                        )}

                        {/* Power */}
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 650,
                              fontVariantNumeric: "tabular-nums",
                              color: theme.palette.text.primary,
                            }}
                          >
                            {formatNumber(participant.total_power)}
                          </Typography>
                        </TableCell>

                        {/* Voltage */}
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 650,
                              fontVariantNumeric: "tabular-nums",
                              color: theme.palette.text.primary,
                            }}
                          >
                            {formatNumber(participant.total_voltage)}
                          </Typography>
                        </TableCell>

                        {/* Amperage */}
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 650,
                              fontVariantNumeric: "tabular-nums",
                              color: theme.palette.text.primary,
                            }}
                          >
                            {formatNumber(participant.total_amperage)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Table footer */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
              sx={{
                pt: 1.25,
                px: 0.5,
                flexShrink: 0,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: "11px",
                }}
              >
                {filteredParticipants.length} participant
                {filteredParticipants.length !== 1 ? "s" : ""}
                {search ? " found" : ""}
              </Typography>

              {selected && (
                <Button
                  size="small"
                  color="inherit"
                  onClick={handleClearSelection}
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: "11px",
                  }}
                >
                  Clear selection
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* ======================================================
            TOAST
        ====================================================== */}

        <Snackbar
          open={toast.open}
          autoHideDuration={2500}
          onClose={closeToast}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "center",
          }}
        >
          <Alert
            severity={toast.severity}
            variant="filled"
            onClose={closeToast}
            icon={
              toast.severity === "success" ? (
                <CheckCircleRoundedIcon fontSize="small" />
              ) : undefined
            }
            sx={{
              width: "100%",
            }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </AppLayout>
  );
}

export default ManualScoring;