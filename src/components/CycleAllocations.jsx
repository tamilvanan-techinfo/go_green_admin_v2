// src/components/allocations/CycleAllocations.jsx

import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import { alpha, useTheme } from "@mui/material/styles";

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GroupsIcon from "@mui/icons-material/Groups";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SearchIcon from "@mui/icons-material/Search";
import SensorsIcon from "@mui/icons-material/Sensors";

import { api, useToast, fmt2 } from "./Ui";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "allocated", label: "Allocated" },
  { key: "free", label: "Unallocated" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function capitalizeName(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}




function formatDuration(totalSeconds = 0) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}


function LoadingSpinner({ size = 16 }) {
  return <CircularProgress size={size} thickness={5} color="inherit" />;
}

/* ------------------------------------------------------------------ */
/* Readout                                                             */
/* ------------------------------------------------------------------ */

function Readout({ label, value, unit, accent = false }) {
  const theme = useTheme();

  return (
    <Stack spacing={0.25}>
      <Typography variant="overline">{label}</Typography>

      <Typography
        sx={{
          fontSize: "15px",
          lineHeight: 1.35,
          fontWeight: 650,
          color: accent
            ? theme.palette.secondary.main
            : theme.palette.text.primary,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmt2(value)}{" "}
        <Typography component="span" variant="overline" color="text.secondary">
          {unit}
        </Typography>
      </Typography>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Cycle Card                                                          */
/* ------------------------------------------------------------------ */

function CycleCard({ item, selected, onSelect, onAssign }) {
  const theme = useTheme();
  const { cycle, row } = item;
  const free = item.kind === "free";
  const roster = row?.other_participant_detail || [];

  return (
    <Card
      component={free ? "div" : "button"}
      type={free ? undefined : "button"}
      onClick={free ? undefined : onSelect}
      aria-pressed={free ? undefined : selected}
      sx={{
        width: "100%",
        textAlign: "left",
        cursor: free ? "default" : "pointer",
        opacity: free ? 0.9 : 1,
        transition: "box-shadow 140ms ease, border-color 140ms ease",
        border: selected
          ? `2px solid ${theme.palette.secondary.main}`
          : "1px solid transparent",
        boxShadow: selected
          ? `0 4px 16px ${alpha(theme.palette.secondary.main, 0.18)}`
          : undefined,
        "&:hover": free
          ? {}
          : {
              boxShadow: `0 5px 18px ${alpha(
                theme.palette.text.primary,
                0.08
              )}`,
            },
      }}
    >
      <CardContent
        sx={{
          p: 2,
          "&:last-child": { pb: 2 },
          position: "relative",
        }}
      >
        <Stack spacing={2}>
          {/* Header */}
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Box minWidth={0} sx={{ flex: 1 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                flexWrap="wrap"
              >
                <Typography
                  sx={{
                    fontSize: "15px",
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {cycle?.cycle_no ?? row?.cycle_no}
                </Typography>

                <Chip
                  size="small"
                  label={free ? "UNALLOCATED" : "ALLOCATED"}
                  color={free ? "default" : "success"}
                />
              </Stack>

              <Typography variant="overline">
                {cycle?.controller_no || "—"}
              </Typography>
            </Box>

            <Avatar
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 26,
                height: 26,
                bgcolor: "background.default",
                color: "text.secondary",
              }}
            >
              {free ? (
                <PauseCircleIcon sx={{ fontSize: 16 }} />
              ) : (
                <SensorsIcon sx={{ fontSize: 16 }} />
              )}
            </Avatar>
          </Stack>

          {/* Readouts */}
          {!free && (
            <Box
              sx={{
                p: 1.25,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.035),
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 1,
              }}
            >
              <Readout label="Power" value={row.total_power} unit="kW" />
              <Readout label="Voltage" value={row.total_voltage} unit="V" />
              <Readout
                label="Current"
                value={row.total_amperage}
                unit="A"
                accent
              />
            </Box>
          )}

          {/* Participant */}
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.text.primary, 0.025),
            }}
          >
            {free ? (
              <Box sx={{ position: "relative", pr: 11 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssign(cycle.id);
                  }}
                  sx={{ position: "absolute", top: 0, right: 0 }}
                >
                  Allocate
                </Button>
                <Typography variant="body2" color="text.secondary" noWrap>
                  No participants yet
                </Typography>
                <Typography variant="overline">
                  Ready to allocate
                </Typography>
              </Box>
            ) : (
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                minWidth={0}
              >
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: "primary.main",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {getInitials(row.participent_name)}
                </Avatar>

                <Box minWidth={0}>
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: "secondary.main",
                        flexShrink: 0,
                      }}
                    />

                    <Typography variant="body2" fontWeight={600} noWrap>
                      {capitalizeName(row.participent_name) || "Unassigned"}
                    </Typography>
                  </Stack>

                  <Typography
                    variant="overline"
                    sx={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {roster.length}{" "}
                    {roster.length === 1 ? "participant" : "participants"} on
                    this cycle
                  </Typography>
                </Box>
              </Stack>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

function CycleAllocations({ refreshTrigger, onNavigate }) {
  const theme = useTheme();
  const toast = useToast();

  const [allocations, setAllocations] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timerTick, setTimerTick] = useState(0);

  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [pickQuery, setPickQuery] = useState("");
  const [rosterQuery, setRosterQuery] = useState("");
  const [busyKey, setBusyKey] = useState(null);

  const [removeTarget, setRemoveTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [create, setCreate] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  /* ---------- data ---------- */

  const loadAll = useCallback(async () => {
  setLoading(true);

  try {
  const [a, c, p, d] = await Promise.all([
  api("/api/admin/participant-cycles/"),
  api("/api/admin/cycles/"),
  api("/api/admin/participants/available"),
  api("/api/admin/participant-cycles-duration/"),
  ]);

  
  if (!a.ok) {
    toast(a.data?.message || "Failed to load allocations", "error");
  }

  const rows = a.ok ? a.data?.data || [] : [];
  const durationRows = d.ok ? d.data?.data || [] : [];

  // Index duration data by allocation ID.
  const durationByAllocationId = new Map(
    durationRows.map((row) => [String(row.id), row])
  );

  // Merge duration fields into the existing allocation/roster data.
  const mergedRows = rows.map((row) => {
    const durationRow = durationByAllocationId.get(String(row.id));

    if (!durationRow) return row;

    const durationByParticipantId = new Map(
      (durationRow.other_participant_detail || []).map((participant) => [
        String(participant.id),
        participant,
      ])
    );

    return {
      ...row,
      participant_cycling_duration:
        durationRow.participant_cycling_duration,
      participant_cycling_duration_display:
        durationRow.participant_cycling_duration_display,
      participant_cycling_is_ended:
        durationRow.participant_cycling_is_ended,

      other_participant_detail: (
        row.other_participant_detail || []
      ).map((participant) => ({
        ...participant,
        ...(durationByParticipantId.get(String(participant.id)) || {}),
      })),
    };
  });

  if (a.ok) setAllocations(mergedRows);
  if (c.ok) setCycles(c.data?.data || []);
  if (p.ok) setAvailable(p.data?.data || []);

  if (!d.ok) {
    console.error("Failed to load participant durations:", d.data);
  }

  return mergedRows;
  

  } catch (error) {
  console.error("Failed to load cycle allocations:", error);
  toast("Failed to load cycle allocation data", "error");
  return [];
  } finally {
  setLoading(false);
  }
  }, [toast]);



  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimerTick((tick) => tick + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  // Refresh backend duration/session state periodically.
  // The local timer below handles the smooth one-second display.
  useEffect(() => {
    const timer = window.setInterval(() => {
      loadAll();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [loadAll]);

  useEffect(() => {
    loadAll();
  }, [loadAll, refreshTrigger]);

  useEffect(() => {
    if (allocations.length === 0) {
      setSelectedId(null);
    } else if (!allocations.some((a) => a.id === selectedId)) {
      setSelectedId(allocations[0].id);
    }
  }, [allocations, selectedId]);

  /* ---------- derived ---------- */

  const cycleById = useMemo(
    () => new Map(cycles.map((c) => [c.id, c])),
    [cycles]
  );

  const allocatedCycleIds = useMemo(
    () => new Set(allocations.map((a) => a.cycle)),
    [allocations]
  );

  const freeCycles = useMemo(
    () => cycles.filter((c) => !allocatedCycleIds.has(c.id)),
    [cycles, allocatedCycleIds]
  );

  const items = useMemo(() => {
    const all = [
      ...allocations.map((row) => ({
        kind: "alloc",
        key: `a${row.id}`,
        row,
        cycle: cycleById.get(row.cycle) || {
          id: row.cycle,
          cycle_no: row.cycle_no,
        },
      })),
      ...freeCycles.map((cycle) => ({
        kind: "free",
        key: `c${cycle.id}`,
        cycle,
      })),
    ];

    const q = query.trim().toLowerCase();

    return all.filter((it) => {
      if (filter === "allocated" && it.kind !== "alloc") return false;
      if (filter === "free" && it.kind !== "free") return false;
      if (!q) return true;

      const hay = [
        it.cycle?.cycle_no,
        it.cycle?.controller_no,
        it.row?.participent_name,
        ...(it.row?.other_participant_detail || []).map((p) => p.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [allocations, freeCycles, cycleById, query, filter]);

  const totals = useMemo(() => {
    const sum = (key) =>
      allocations.reduce((t, a) => t + (Number(a[key]) || 0), 0);

    return {
      power: sum("total_power"),
      voltage: allocations.length
        ? sum("total_voltage") / allocations.length
        : 0,
      amps: sum("total_amperage"),
    };
  }, [allocations]);


  const selected =
    allocations.find((a) => a.id === selectedId) || null;

  const roster = selected?.other_participant_detail || [];

  const activeParticipantId =
    selected?.active_participant ?? selected?.participent ?? null;

  const activeP =
    roster.find(
    (p) => String(p.id) === String(activeParticipantId)
    ) ||
    (selected
    ? {
    id: activeParticipantId,
    name:
    selected.active_participant_name ||
    selected.participent_name ||
    "Unknown participant",
    cycling_duration: 0,
    cycling_duration_display: null,
    cycling_is_ended: true,
    }
    : null);

  const activeDurationSeconds =
  Number(activeP?.cycling_duration) || 0;



    
  
 useEffect(() => {
  console.log("Selected allocation:", selected);
  console.log("Active participant:", activeP);
}, [selected, activeP]);

  
  const queue = roster.filter((p) => p.id !== selected?.participent);

  const filteredQueue = useMemo(() => {
    const q = rosterQuery.trim().toLowerCase();

    if (!q) return queue;

    return queue.filter((p) =>
      String(p.name).toLowerCase().includes(q)
    );
  }, [queue, rosterQuery]);

  const pickable = useMemo(() => {
    const onRoster = new Set(roster.map((p) => p.id));
    const q = pickQuery.trim().toLowerCase();

    return available.filter(
      (p) =>
        !onRoster.has(p.id) &&
        (!q || String(p.name).toLowerCase().includes(q))
    );
  }, [available, roster, pickQuery]);

  /* ---------- roster actions ---------- */

  const updateAllocation = async (
    key,
    alloc,
    payload,
    okMsg,
    failMsg
  ) => {
    setBusyKey(key);

    const { ok, data } = await api(
      `/api/admin/participant-cycles/${alloc.id}/`,
      {
        method: "PUT",
        json: payload,
      }
    );

    setBusyKey(null);

    if (!ok) {
      toast(data.message || failMsg, "error");
      return false;
    }

    toast(okMsg);
    await loadAll();
    return true;
  };

  const setActive = (alloc, p) => {
    if (alloc.participent === p.id) return;

    updateAllocation(
      `${alloc.id}:active:${p.id}`,
      alloc,
      { participent: p.id },
      `${p.name} is now active on ${alloc.cycle_no}`,
      "Failed to switch active participant"
    );
  };

  const addToRoster = async (alloc, p, makeActive) => {
    const ids = (alloc.other_participant_detail || []).map((x) => x.id);

    if (ids.includes(p.id)) {
      toast("Participant already on this cycle", "error");
      return;
    }

    const payload = { roster: [...ids, p.id] };

    if (makeActive) payload.participent = p.id;

    const done = await updateAllocation(
      `${alloc.id}:add:${p.id}`,
      alloc,
      payload,
      makeActive
        ? `${p.name} added and set active`
        : `${p.name} added to ${alloc.cycle_no}`,
      "Failed to add participant"
    );

    if (done) setPickQuery("");
  };

  const requestRemove = (alloc, p) => {
    if ((alloc.other_participant_detail || []).length <= 1) {
      toast(
        "A cycle needs at least one participant. Delete the allocation instead.",
        "error"
      );
      return;
    }

    setRemoveTarget({ alloc, p });
  };

  const confirmRemove = async () => {
    const { alloc, p } = removeTarget;

    const nextIds = (alloc.other_participant_detail || [])
      .filter((x) => x.id !== p.id)
      .map((x) => x.id);

    const payload = { roster: nextIds };

    if (alloc.participent === p.id) {
      payload.participent = nextIds[0];
    }

    setConfirmBusy(true);

    await updateAllocation(
      `${alloc.id}:remove:${p.id}`,
      alloc,
      payload,
      `${p.name} removed from ${alloc.cycle_no}`,
      "Failed to remove participant"
    );

    setConfirmBusy(false);
    setRemoveTarget(null);
  };

  const confirmDeleteAllocation = async () => {
    setConfirmBusy(true);

    const { ok, data } = await api(
      `/api/admin/participant-cycles/${deleteTarget.id}/`,
      {
        method: "DELETE",
      }
    );

    setConfirmBusy(false);

    const target = deleteTarget;
    setDeleteTarget(null);

    if (!ok) {
      toast(data.message || "Failed to delete allocation", "error");
      return;
    }

    toast(`Allocation for ${target.cycle_no} deleted`);
    loadAll();
  };

  /* ---------- create allocation ---------- */

  const openCreate = (cycleId = null) => {
    setCreate({
      cycleId,
      rosterIds: [],
      activeId: null,
      q: "",
    });

    setCreateError("");
  };

  const closeCreate = useCallback(() => {
    if (!creating) setCreate(null);
  }, [creating]);

  const toggleRoster = (id) =>
    setCreate((c) => {
      const has = c.rosterIds.includes(id);

      const rosterIds = has
        ? c.rosterIds.filter((x) => x !== id)
        : [...c.rosterIds, id];

      let activeId = c.activeId;

      if (has && activeId === id) activeId = null;
      if (!activeId && rosterIds.length) activeId = rosterIds[0];

      return { ...c, rosterIds, activeId };
    });

  const createValid =
    !!create?.cycleId &&
    create.rosterIds.length > 0 &&
    !!create.activeId;

  const submitCreate = async (e) => {
    e?.preventDefault();

    if (!createValid) return;

    setCreating(true);
    setCreateError("");

    const { ok, data } = await api("/api/admin/participant-cycles/", {
      method: "POST",
      json: {
        cycle: create.cycleId,
        participent: create.activeId,
        roster: create.rosterIds,
      },
    });

    setCreating(false);

    if (!ok) {
      setCreateError(data.message || "Failed to allocate cycle");
      return;
    }

    const cycleId = create.cycleId;

    setCreate(null);
    toast("Cycle allocated");

    const rows = await loadAll();
    const made = rows.find((r) => r.cycle === cycleId);

    if (made) setSelectedId(made.id);
  };

  const createPickList = useMemo(() => {
    if (!create) return [];

    const q = create.q.trim().toLowerCase();

    return available.filter(
      (p) => !q || String(p.name).toLowerCase().includes(q)
    );
  }, [available, create]);

  const rosterObjects = create
    ? create.rosterIds
        .map((id) => available.find((p) => p.id === id))
        .filter(Boolean)
    : [];

  const noCycles = !loading && cycles.length === 0;

  /* ---------- render ---------- */

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        flex: "1 1 0",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        gap: 2,
      }}
    >
      {/* ================================================================
          COMMAND STRIP
          ================================================================ */}

      <Paper sx={{ p: 2, borderRadius: 2, flexShrink: 0 }}>
        <Stack
          direction={{ xs: "column", xl: "row" }}
          alignItems={{ xs: "stretch", xl: "center" }}
          sx={{ width: "100%", }}
          spacing={2}
        >
          {/* Left: title and summary */}

          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            flexWrap="wrap"
            useFlexGap
            sx={{ minWidth: 0 ,flex: "1 1 auto", }}
          >
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
              >
                

                <Typography variant="h5">Cycle allocations</Typography>

                <Chip
                  size="small"
                  label={`${cycles.length} cycles · ${allocations.length} allocated`}
                />
              </Stack>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Open a cycle to switch who's active or manage its roster.
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={3}
              sx={{
                display: { xs: "none", "2xl": "flex" },
              }}
            >
              <Readout
                label="Total power"
                value={totals.power}
                unit="kW"
              />
              <Readout
                label="Avg voltage"
                value={totals.voltage}
                unit="V"
              />
              <Readout
                label="Total current"
                value={totals.amps}
                unit="A"
                accent
              />
            </Stack>
          </Stack>

          {/* Right: search, filters and new allocation */}

  


        <Stack direction={{ xs: "column", sm: "row" }} 
        spacing={2} alignItems={{ xs: "stretch", sm: "center" }} 
        justifyContent="flex-end" useFlexGap flexWrap="wrap" 
        sx={{ flex: "0 0 auto", ml: { xs: 0, xl: "auto" }, 
        width: { xs: "100%", xl: "auto" }, minWidth: 0, }} >
          <TextField
            type="search"
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by cycle or participant"
            aria-label="Filter cycles"
            sx={{
              width: { xs: "100%", sm: 230 },
              flexShrink: 0,
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Box
            sx={{
  display: "flex",
  alignItems: "center",
  bgcolor: "background.default",
  borderRadius: 1.5,
  p: 0.85,
  border: "1px solid",
  borderColor: "divider",
  width: "fit-content",
  maxWidth: "100%",
  flexShrink: 0,
}}
            role="group"
            aria-label="Filter by state"
          >
            {FILTERS.map((f) => {
              const isSelected = filter === f.key;

              return (
                <Button
                  key={f.key}
                  type="button"
                  size="small"
                  variant={isSelected ? "contained" : "text"}
                  color="primary"
                  aria-pressed={isSelected}
                  onClick={() => setFilter(f.key)}
                  sx={{
                    minHeight: 30,
                    px: { xs: 1, sm: 1.5 },
                    borderRadius: 0.75,
                    whiteSpace: "nowrap",
                    boxShadow: isSelected
                      ? "0 1px 4px rgba(15,23,42,0.10)"
                      : "none",
                  }}
                >
                  {f.label}
                </Button>
              );
            })}
          </Box>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => openCreate()}
            disabled={freeCycles.length === 0}
            sx={{
              flexShrink: 0,
              whiteSpace: "nowrap",
              px: 2.5,
              py: 1,
            }}
          >
            New allocation
          </Button>
        </Stack>


        </Stack>
      </Paper>

      {/* ================================================================
          MAIN CONTENT
          ================================================================ */}

      <Box

        sx={{
          flex: "1 1 0",
          minHeight: 0,
          minWidth: 0,
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "minmax(0, 1fr) 550px",
          },
          gap: 2,
          alignItems: "stretch",
          overflow: "hidden",
        }}
      >
        {/* ============================================================
            LEFT: CYCLE CARD GRID
            ============================================================ */}

        
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              overflow: "hidden",
            }}
          >
         
          {loading && items.length === 0 && (
            <Grid container spacing={1.5} sx={{ width: "100%", m: 0 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Grid
                  size={{ xs: 12, sm: 6 }}
                  key={i}
                  sx={{ minWidth: 0 }}
                >
                  <Card sx={{ width: "100%", height: "100%" }}>
                    <CardContent sx={{ p: 2 }}>
                      <Stack spacing={2}>
                        <Skeleton variant="text" width="55%" height={28} />
                        <Skeleton variant="text" width="35%" height={22} />
                        <Skeleton variant="rounded" height={65} />
                        <Skeleton variant="rounded" height={55} />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}



          {noCycles && (
            <Paper sx={{ p: 5, textAlign: "center" }}>
              <DirectionsBikeIcon
                sx={{ fontSize: 36, color: "text.disabled" }}
              />

              <Typography variant="h6" sx={{ mt: 1 }}>
                No cycles to allocate yet
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2, maxWidth: 500, mx: "auto" }}
              >
                Create a cycle first, then come back to assign participants.
              </Typography>

              <Button
                variant="contained"
                onClick={() => onNavigate?.("cycles")}
              >
                Go to Cycles
              </Button>
            </Paper>
          )}

          {!loading &&
            cycles.length > 0 &&
            allocations.length === 0 &&
            filter !== "free" &&
            !query && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Box>
                    <Typography variant="h6">
                      No cycles allocated yet
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Allocate a cycle to a group of participants and pick
                      who's active.
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openCreate()}
                  >
                    New allocation
                  </Button>
                </Stack>
              </Paper>
            )}

          {!loading && cycles.length > 0 && items.length === 0 && (
            <Paper sx={{ p: 5, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Nothing matches your filter.
              </Typography>
            </Paper>
          )}

          {items.length > 0 && (
            <Box

              sx={{
                flex: "1 1 0",
                minHeight: 0,
                minWidth: 0,
                height: "100%",
                overflowY: "auto",
                overflowX: "hidden",
                pr: 0.5,
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                "&::-webkit-scrollbar": {
                  display: "none",
                },
              }}
            >
              <Grid container spacing={1.5}>
                {items.map((it) => (
                  <Grid
                    size={{ xs: 12, md: 6 }}
                    key={it.key}
                    sx={{ maxWidth : 400,minWidth: 0 }}
                  >
                    <CycleCard
                      item={it}
                      selected={it.row?.id === selectedId}
                      onSelect={() => {
                        setSelectedId(it.row.id);
                        setPickQuery("");
                      }}
                      onAssign={openCreate}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>

        {/* ============================================================
            RIGHT: ROSTER INSPECTOR
            ============================================================ */}

        
          <Box
            sx={{
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              overflowX: "hidden",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": {
                display: "none",
              },
            }}
          >
          {!selected ? (
            <Paper sx={{ p: 5, textAlign: "center" }}>
              <GroupsIcon sx={{ fontSize: 32, color: "text.disabled" }} />

              <Typography variant="h6" sx={{ mt: 1 }}>
                Select an allocation
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Pick a cycle to see its roster and choose who's active.
              </Typography>
            </Paper>
          ) : (
            <Card sx={{
  height: "100%",
  minHeight: 0,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
}}>
              <CardContent sx={{
  flex: "1 1 0",
  minHeight: 0,
  minWidth: 0,
  overflowY: "auto",
  overflowX: "hidden",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  "&::-webkit-scrollbar": {
    display: "none",
  },
}}>
                <Stack spacing={2.5}>
                  {/* Header */}

                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      pr: 6,
                      bgcolor: alpha(theme.palette.primary.main, 0.025),
                      position: "relative",
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box minWidth={0} sx={{ flex: 1 }}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1}
                        >
                          

                          <Typography variant="h6" noWrap>
                            {selected.cycle_no}
                          </Typography>
                        </Stack>

                        <Typography variant="h6" >
                          {cycleById.get(selected.cycle)?.controller_no}
                        </Typography>
                      </Box>

                      <Box textAlign="right" sx={{ minWidth: 0, flexShrink: 0, pr: 0.5 }}>
                        <Typography variant="h6" sx={{ color: "secondary.main", fontVariantNumeric: "tabular-nums" }}>
                          {fmt2(selected.total_power)} kW
                        </Typography>
                        <Typography variant="overline" sx={{ color: "text.secondary" }}>
                          {fmt2(selected.total_voltage)} V ·{" "}
                          {fmt2(selected.total_amperage)} A
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Delete button pinned to the top-right corner */}

                    <Tooltip title="Delete allocation">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteTarget(selected)}
                        aria-label={`Delete allocation for ${selected.cycle_no}`}
                        sx={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Paper>

                 
{/* Active participant — above roster */}

{activeP && (
  <Paper
  sx={{
    p: 2,
    bgcolor: "background.paper",
    color: "text.primary",
    border: "1px solid",
    borderColor: "rgba(16,185,129,0.22)",
    borderRadius: 3,
    position: "relative",
    overflow: "hidden",
    isolation: "isolate",
    boxShadow: "0 8px 24px rgba(5,150,105,0.08)",

    // Soft emerald glow
    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      zIndex: 0,
      pointerEvents: "none",
      background: `
        radial-gradient(
          ellipse at top left,
          rgba(16, 185, 129, 0.22) 0%,
          rgba(16, 185, 129, 0.10) 45%,
          transparent 80%
        ),
        linear-gradient(
          135deg,
          rgba(16, 185, 129, 0.08),
          rgba(5, 150, 105, 0.04)
        )
      `,
    },

    // Animated gradient shine along the top
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: "-50%",
      width: "45%",
      height: "2px",
      background:
        "linear-gradient(90deg, transparent, rgba(16,185,129,0.6), transparent)",
      animation: "activeParticipantShine 7s ease-in-out infinite",
      pointerEvents: "none",

      "@keyframes activeParticipantShine": {
        "0%": { left: "-50%" },
        "45%, 100%": { left: "120%" },
      },
    },
  }}
>
    <Stack spacing={1.5} sx={{ position: "relative", zIndex: 1 }}>
      {/* STATUS */}
      <Stack direction="row" alignItems="center">
        <Chip
          size="small"
          label="Active"
          sx={{
            bgcolor: "secondary.main",
            color: "secondary.contrastText",
          }}
        />

        <Stack
          direction="row"
          alignItems="center"
          spacing={0.75}
          sx={{ ml: 1 }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              bgcolor: "success.main",
            }}
          />

          <Typography variant="overline" color="text.secondary">
            Riding now
          </Typography>
        </Stack>
      </Stack>

      {/* PARTICIPANT */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        minWidth={0}
        sx={{ pr: 4 }}
      >
        <Avatar
  sx={{
    width: 40,
    height: 40,
    bgcolor: "primary.main",
    color: "primary.contrastText",
    fontWeight: 700,
  }}
>
          {getInitials(activeP.name)}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" noWrap color="text.primary">
            {capitalizeName(activeP.name)}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              mt: 0.25,
              fontWeight: 600,
              color: "text.primary",
            }}
          >
            Duration: {formatDuration(activeDurationSeconds)}
          </Typography>
        </Box>
      </Stack>

      {/* REMOVE */}
      <IconButton
        size="small"
        disabled={!!busyKey}
        onClick={() => requestRemove(selected, activeP)}
        sx={{
          position: "absolute",
          top: -10,
          right: 8,
          color: "text.primary",
          "&:hover": {
            bgcolor: "action.hover",
          },
        }}
        aria-label={`Remove ${activeP.name}`}
      >
        {busyKey === `${selected.id}:remove:${activeP.id}`
          ? <LoadingSpinner />
          : <CloseIcon fontSize="small" />}
      </IconButton>
    </Stack>
  </Paper>
)}

                  {/* Roster Accordion */}

                  <Accordion defaultExpanded disableGutters elevation={0}
                    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, "&:before": { display: "none" } }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, mr: 1 }}>
                        <Typography variant="h6">Roster</Typography>
                        <Chip size="small" label={`${roster.length} ${roster.length === 1 ? "PARTICIPANT" : "PARTICIPANTS"}`} sx={{ ml: "auto" }} />
                      </Stack>
                    </AccordionSummary>

                    <AccordionDetails sx={{ pt: 0 }}>
                      <Stack spacing={1}>
                        {/* Roster search */}
                        {queue.length > 0 && (
                          <TextField fullWidth type="search" size="small"
                            value={rosterQuery} onChange={(e) => setRosterQuery(e.target.value)}
                            placeholder="Search roster" aria-label="Search roster"
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                          />
                        )}

                        {/* Queue */}
                        {queue.length === 0 ? (
                          <Box sx={{ px: 2, py: 2, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              {roster.length === 0 ? "Nobody on this cycle yet. Add someone below." : "Only the active participant is on this cycle."}
                            </Typography>
                          </Box>
                        ) : (
                          <List disablePadding sx={{ maxHeight: 240, overflowY: "auto", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                            {filteredQueue.map((p) => {
                              const settingActive = busyKey === `${selected.id}:active:${p.id}`;
                              const removing = busyKey === `${selected.id}:remove:${p.id}`;
                              return (
                                <ListItem key={p.id} disableGutters
                                  sx={{ p: 1, mb: 0.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.025) }}
                                  secondaryAction={
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                      <Button size="small" variant="contained" color="secondary" disabled={!!busyKey}
                                        onClick={() => setActive(selected, p)}
                                        startIcon={settingActive ? <LoadingSpinner size={14} /> : <PlayArrowIcon />}
                                      >
                                        Set active
                                      </Button>
                                      <Tooltip title="Remove from cycle">
                                        <IconButton size="small" disabled={!!busyKey} color="error"
                                          onClick={() => requestRemove(selected, p)} aria-label={`Remove ${p.name}`}
                                        >
                                          {removing ? <LoadingSpinner /> : <CloseIcon fontSize="small" />}
                                        </IconButton>
                                      </Tooltip>
                                    </Stack>
                                  }
                                >
                                  <ListItemAvatar>
                                    <Avatar sx={{ width: 32, height: 32, bgcolor: "background.paper", color: "primary.main", fontSize: "11px", fontWeight: 700 }}>
                                      {getInitials(p.name)}
                                    </Avatar>
                                  </ListItemAvatar>
                                  <ListItemText
                                    primary={<Typography variant="body2" fontWeight={600} noWrap>{capitalizeName(p.name)}</Typography>}
                                    sx={{ mr: 16 }}
                                  />
                                </ListItem>
                              );
                            })}
                          </List>
                        )}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>

                  {/* Add Participants Accordion */}

                  <Accordion defaultExpanded disableGutters elevation={0}
                    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, "&:before": { display: "none" } }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, mr: 1 }}>
                        <Typography variant="h6">Add participants</Typography>
                        <Chip size="small" label={`${pickable.length} AVAILABLE`} sx={{ ml: "auto" }} />
                      </Stack>
                    </AccordionSummary>

                    <AccordionDetails sx={{ pt: 0 }}>
                      <Stack spacing={1}>
                        <TextField fullWidth type="search" value={pickQuery}
                          onChange={(e) => setPickQuery(e.target.value)}
                          placeholder="Search available participants" aria-label="Search available participants"
                          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                        />

                        <List disablePadding sx={{ maxHeight: 280, overflowY: "auto", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                          {pickable.length === 0 && (
                            <Box sx={{ py: 2, textAlign: "center" }}>
                              <Typography variant="body2" color="text.secondary">
                                {available.length === 0 || !pickQuery ? "Everyone is already on a cycle." : "No one matches that search."}
                              </Typography>
                            </Box>
                          )}
                          {pickable.map((p) => {
                            const adding = busyKey === `${selected.id}:add:${p.id}`;
                            return (
                              <ListItem key={p.id} disableGutters
                                sx={{ p: 1, mb: 0.5, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}
                                secondaryAction={
                                  <Stack direction="row" spacing={0.5}>
                                    <Button size="small" variant="outlined" disabled={!!busyKey}
                                      onClick={() => addToRoster(selected, p, false)}
                                      startIcon={adding ? <LoadingSpinner size={14} /> : <AddIcon />}
                                    >
                                      Add
                                    </Button>
                                    <Button size="small" variant="contained" disabled={!!busyKey}
                                      onClick={() => addToRoster(selected, p, true)}
                                    >
                                      Add & set active
                                    </Button>
                                  </Stack>
                                }
                              >
                                <ListItemAvatar>
                                  <Avatar sx={{ width: 32, height: 32, fontSize: "11px", fontWeight: 700 }}>
                                    {getInitials(p.name)}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={<Typography variant="body2" fontWeight={600} noWrap>{capitalizeName(p.name)}</Typography>}
                                  sx={{ mr: 18 }}
                                />
                              </ListItem>
                            );
                          })}
                        </List>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      
{/* ================================================================
    CREATE ALLOCATION DRAWER — RIGHT SIDE
    ================================================================ */}

<Drawer
  anchor="right"
  open={!!create}
  onClose={closeCreate}
  PaperProps={{
    sx: {
      width: { xs: "100%", sm: 480, md: 540 },
      maxWidth: "100%",
      display: "flex",
      flexDirection: "column",
      bgcolor: "background.paper",
      top: 48,                 // <- your top bar height
      height: "calc(100% - 48px)",
    },
  }}
>
  {create && (
    <form
      onSubmit={submitCreate}
      noValidate
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >

{/* Drawer header */}
<Box
  sx={{
    px: 3,
    py: 4,
    pt:8,
    bgcolor: "background.default",
    borderBottom: "1px solid",
    borderColor: "divider",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
    flexShrink: 0,
    minHeight: 64,
    boxSizing: "border-box",
  }}
>
  <Box sx={{ minWidth: 0, flex: 1 }}>
    <Typography variant="h6" fontWeight={700}>
      New cycle allocation
    </Typography>

    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ mt: 0.5 }}
    >
      Choose a cycle, select participants, and set who's active.
    </Typography>
  </Box>

  <IconButton
    type="button"
    onClick={closeCreate}
    disabled={creating}
    aria-label="Close allocation drawer"
    size="small"
    sx={{
      flexShrink: 0,
      alignSelf: "center",
      width: 32,
      height: 32,
      p: 0.5,
    }}
  >
    <CloseIcon fontSize="small" />
  </IconButton>
</Box>



      {/* Drawer content */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          px: 3,
          py: 3,
        }}
      >
        <Stack spacing={3}>
          {/* Cycle selection */}
          <FormControl fullWidth required>
            <InputLabel id="create-cycle-label">
              1. Cycle
            </InputLabel>

            <Select
              labelId="create-cycle-label"
              value={create.cycleId ?? ""}
              label="1. Cycle"
              onChange={(e) =>
                setCreate((c) => ({
                  ...c,
                  cycleId: Number(e.target.value) || null,
                }))
              }
            >
              <MenuItem value="">
                {freeCycles.length === 0
                  ? "All cycles are already allocated"
                  : "Select an unallocated cycle"}
              </MenuItem>

              {freeCycles.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.cycle_no} · {c.controller_no}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Participants */}
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                2. Participants
                <Box
                  component="span"
                  sx={{ color: "error.main", ml: 0.5 }}
                >
                  *
                </Box>
              </Typography>

              <Chip
                size="small"
                color={create.rosterIds.length ? "success" : "default"}
                label={`${create.rosterIds.length} selected`}
              />
            </Stack>

            <TextField
              fullWidth
              type="search"
              size="small"
              value={create.q}
              onChange={(e) =>
                setCreate((c) => ({
                  ...c,
                  q: e.target.value,
                }))
              }
              placeholder="Search available participants"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <Paper
              variant="outlined"
              sx={{
                mt: 1.5,
                maxHeight: 320,
                overflowY: "auto",
                p: 1,
                borderRadius: 2,
              }}
            >
              {createPickList.length === 0 && (
                <Box sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    {available.length === 0
                      ? "No available participants. Add some in the Participants tab."
                      : "No one matches that search."}
                  </Typography>
                </Box>
              )}

              {createPickList.map((p) => {
                const checked = create.rosterIds.includes(p.id);

                return (
                  <Box
                    key={p.id}
                    onClick={() => toggleRoster(p.id)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 1.5,
                      py: 1,
                      mb: 0.5,
                      borderRadius: 1.5,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: checked
                        ? "secondary.main"
                        : "transparent",
                      bgcolor: checked
                        ? alpha(theme.palette.secondary.main, 0.08)
                        : "transparent",
                      "&:hover": {
                        bgcolor: alpha(
                          theme.palette.primary.main,
                          0.05
                        ),
                      },
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={checked}
                      onChange={() => toggleRoster(p.id)}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <Avatar
                      sx={{
                        width: 34,
                        height: 34,
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      {getInitials(p.name)}
                    </Avatar>

                    <Typography variant="body2" fontWeight={600} noWrap>
                      {capitalizeName(p.name)}
                    </Typography>
                  </Box>
                );
              })}
            </Paper>
          </Box>

          {/* Active participant */}
          <FormControl
            fullWidth
            required
            disabled={rosterObjects.length === 0}
          >
            <InputLabel id="create-active-label">
              3. Active participant
            </InputLabel>

            <Select
              labelId="create-active-label"
              value={create.activeId ?? ""}
              label="3. Active participant"
              onChange={(e) =>
                setCreate((c) => ({
                  ...c,
                  activeId: Number(e.target.value) || null,
                }))
              }
            >
              <MenuItem value="">
                {rosterObjects.length === 0
                  ? "Select participants first"
                  : "Who's active right now?"}
              </MenuItem>

              {rosterObjects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>

            {rosterObjects.length === 0 && (
              <FormHelperText>
                Select at least one participant first.
              </FormHelperText>
            )}
          </FormControl>

          {createError && (
            <Alert severity="error">{createError}</Alert>
          )}
        </Stack>
      </Box>

      {/* Fixed footer */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          flexShrink: 0,
        }}
      >
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {!create.cycleId
              ? "Choose a cycle to continue."
              : create.rosterIds.length === 0
              ? "Select at least one participant."
              : !create.activeId
              ? "Choose the active participant."
              : "Ready to allocate."}
          </Typography>

          <Stack direction="row" spacing={1.5}>
            <Button
              fullWidth
              variant="outlined"
              onClick={closeCreate}
              disabled={creating}
            >
              Cancel
            </Button>

            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={!createValid || creating}
              startIcon={
                creating ? <LoadingSpinner size={16} /> : <AddIcon />
              }
            >
              {creating ? "Allocating..." : "Allocate cycle"}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </form>
  )}
</Drawer>



      {/* Remove confirmation */}

      <Dialog
        open={!!removeTarget}
        onClose={() => {
          if (!confirmBusy) setRemoveTarget(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Remove from cycle?</DialogTitle>

        <DialogContent>
          {removeTarget && (
            <Typography variant="body2">
              <strong>{removeTarget.p.name}</strong> will be removed from{" "}
              <strong>{removeTarget.alloc.cycle_no}</strong>.
              {removeTarget.alloc.participent === removeTarget.p.id && (
                <>
                  {" "}
                  They're the active participant, so{" "}
                  <strong>
                    {(
                      removeTarget.alloc.other_participant_detail || []
                    ).find((x) => x.id !== removeTarget.p.id)?.name ||
                      "the next participant"}
                  </strong>{" "}
                  will become active.
                </>
              )}
            </Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setRemoveTarget(null)}
            disabled={confirmBusy}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={confirmRemove}
            disabled={confirmBusy}
            startIcon={
              confirmBusy ? (
                <LoadingSpinner size={16} />
              ) : (
                <DeleteIcon />
              )
            }
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}

      <Dialog
        open={!!deleteTarget}
        onClose={() => {
          if (!confirmBusy) setDeleteTarget(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete allocation?</DialogTitle>

        <DialogContent>
          <Typography variant="body2">
            <strong>{deleteTarget?.cycle_no}</strong> will be unallocated and
            its roster cleared. This cannot be undone.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={confirmBusy}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteAllocation}
            disabled={confirmBusy}
            startIcon={
              confirmBusy ? (
                <LoadingSpinner size={16} />
              ) : (
                <DeleteIcon />
              )
            }
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CycleAllocations;