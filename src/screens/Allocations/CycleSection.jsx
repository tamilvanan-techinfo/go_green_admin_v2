// src/components/allocations/CycleSection.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
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
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";

import { alpha, useTheme } from "@mui/material/styles";

import { COMPACT } from "../../components/Layout";

import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike";
import SyncIcon from "@mui/icons-material/Sync";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { api, useToast, Pager } from "./Ui";

const EMPTY = {
  id: null,
  cycle_no: "",
  controller_no: "",
};

/* =========================================================
   KPI CARD
   — shrinks again at `lg` (laptop widths, ~1200–1536px) so it
     doesn't eat the same vertical space it does on a big
     monitor, then grows back at `xl`; stacks into a horizontal
     scroller on phones (swiggy-style chip row)
   ========================================================= */

function KpiCard({ label, value, hint, icon, loading, color = "primary" }) {
  const iconMap = {
    directions_bike: DirectionsBikeIcon,
    sync: SyncIcon,
    pause_circle: PauseCircleIcon,
  };

  const IconComponent = iconMap[icon] || DirectionsBikeIcon;

  return (
    <Card
      sx={{
        height: "100%",
        minWidth: { xs: 180, sm: "auto" },
        borderLeft: "4px solid",
        borderLeftColor: `${color}.main`,
        backgroundColor: (theme) => alpha(theme.palette[color].main, 0.07),
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.75, sm: 2.5, lg: 1.5, xl: 2.5 },
          "&:last-child": { pb: { xs: 1.75, sm: 2.5, lg: 1.5, xl: 2.5 } },
          position: "relative",
        }}
      >
        {/* Icon — top right corner */}
        <Box
          sx={{
            position: "absolute",
            top: { xs: 10, sm: 16, lg: 10, xl: 16 },
            right: { xs: 10, sm: 16, lg: 10, xl: 16 },
            width: { xs: 34, sm: 44, lg: 32, xl: 44 },
            height: { xs: 34, sm: 44, lg: 32, xl: 44 },
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: `${color}.main`,
            backgroundColor: (theme) => alpha(theme.palette[color].main, 0.12),
            "& svg": { fontSize: { xs: 18, sm: 24, lg: 16, xl: 24 } },
          }}
        >
          <IconComponent />
        </Box>

        <Box sx={{ pr: { xs: 5, sm: 7, lg: 5, xl: 7 } }}>
          <Typography
            variant="overline"
            sx={{ display: "block", mb: 0.5, fontSize: { xs: 10, sm: 11, lg: 10, xl: 11 } }}
          >
            {label}
          </Typography>

          {loading ? (
            <Skeleton variant="text" width={60} height={40} />
          ) : (
            <Typography
              variant="h3"
              sx={{
                lineHeight: 1.1,
                fontWeight: 700,
                fontSize: { xs: "1.75rem", sm: "2.5rem", lg: "1.6rem", xl: "2.5rem" },
              }}
            >
              {value}
            </Typography>
          )}

          {hint && (
            <Typography
              variant="overline"
              sx={{
                display: "block",
                mt: 0.5,
                fontSize: { xs: 9, sm: 11, lg: 9, xl: 11 },
                color: `${color}.main`,
              }}
            >
              {hint}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

/* =========================================================
   MOBILE ROW — card representation of a cycle (below `lg`)
   ========================================================= */

function CycleCard({ c, allocated, onEdit, onDelete }) {
  return (
    <Paper
      variant="outlined"
      onClick={onEdit}
      sx={{
        p: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        cursor: "pointer",
        "&:active": { bgcolor: "action.selected" },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "action.hover",
          color: "text.secondary",
        }}
      >
        <DirectionsBikeIcon fontSize="small" />
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              px: 1,
              py: 0.3,
              borderRadius: 1,
              backgroundColor: "action.hover",
              color: "text.primary",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            {c.cycle_no}
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {c.controller_no}
          </Typography>
          <Chip
            size="small"
            label={allocated ? "Allocated" : "Unallocated"}
            color={allocated ? "success" : "default"}
            variant={allocated ? "filled" : "outlined"}
            sx={{ height: 20, fontSize: 11, flexShrink: 0 }}
          />
        </Stack>
      </Box>

      <Stack direction="row" spacing={0.5}>
        <IconButton
          size="small"
          aria-label={`Edit ${c.cycle_no}`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          aria-label={`Delete ${c.cycle_no}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Paper>
  );
}

/* =========================================================
   CONFIRM DELETE DIALOG
   ========================================================= */

function DeleteCycleDialog({ open, cycle, busy, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "error.main",
              backgroundColor: (theme) => alpha(theme.palette.error.main, 0.1),
            }}
          >
            <WarningAmberIcon fontSize="small" />
          </Box>

          <Typography component="span" variant="h6">
            Delete cycle?
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          <strong>{cycle?.cycle_no}</strong> will be removed. This action cannot be undone.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>

        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
        >
          {busy ? "Deleting..." : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

function CycleSection({ onDataChange }) {
  const toast = useToast();
  const theme = useTheme();

  // breakpoints — same pattern as ParticipantSection
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // < 600
  const isTablet = useMediaQuery(theme.breakpoints.down("lg")); // < 1200

  const [cycles, setCycles] = useState([]);
  const [allocatedIds, setAllocatedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [panel, setPanel] = useState("new");
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* =======================================================
     LOAD DATA
     ======================================================= */

  const load = useCallback(async () => {
    setLoading(true);

    const [c, a] = await Promise.all([
      api("/api/admin/cycles/"),
      api("/api/admin/participant-cycles/"),
    ]);

    if (c.ok) {
      setCycles(c.data.data || []);
    } else {
      toast(c.data.message || "Failed to load cycles", "error");
    }

    if (a.ok) {
      setAllocatedIds(new Set((a.data.data || []).map((x) => x.cycle)));
    }

    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  /* =======================================================
     DERIVED DATA
     ======================================================= */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      return cycles;
    }

    return cycles.filter(
      (c) =>
        String(c.cycle_no).toLowerCase().includes(q) ||
        String(c.controller_no).toLowerCase().includes(q)
    );
  }, [cycles, query]);

  const rows = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const allocatedCount = cycles.filter((c) => allocatedIds.has(c.id)).length;

  /* =======================================================
     DUPLICATE CHECK
     ======================================================= */

  const dup = useMemo(() => {
    const no = form.cycle_no.trim().toLowerCase();
    const ctrl = form.controller_no.trim().toLowerCase();

    const others = cycles.filter((c) => c.id !== form.id);

    return {
      cycle_no: !!no && others.some((c) => String(c.cycle_no).toLowerCase() === no),
      controller_no:
        !!ctrl && others.some((c) => String(c.controller_no).toLowerCase() === ctrl),
    };
  }, [cycles, form]);

  const cycleNoError =
    errors.cycle_no || (dup.cycle_no ? `"${form.cycle_no.trim()}" already exists` : "");

  const controllerError =
    errors.controller_no ||
    (dup.controller_no ? `"${form.controller_no.trim()}" already exists` : "");

  /* =======================================================
     PANEL HANDLERS
     ======================================================= */

  const openNew = () => {
    setForm(EMPTY);
    setErrors({});
    setPanel("new");
    setPage(0);
  };

  const openEdit = (c) => {
    setForm({
      id: c.id,
      cycle_no: c.cycle_no,
      controller_no: c.controller_no,
    });

    setErrors({});
    setPanel("edit");
  };

  const closePanel = () => {
    setPanel("new");
    setForm(EMPTY);
    setErrors({});
  };

  const onField = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));

    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  };

  /* =======================================================
     SUBMIT
     ======================================================= */

  const submit = async (e) => {
    e?.preventDefault();

    const cycle_no = form.cycle_no.trim();
    const controller_no = form.controller_no.trim();

    const next = {};

    if (!cycle_no) {
      next.cycle_no = "Cycle No is required";
    } else if (dup.cycle_no) {
      next.cycle_no = `"${cycle_no}" already exists`;
    }

    if (!controller_no) {
      next.controller_no = "Controller No is required";
    } else if (dup.controller_no) {
      next.controller_no = `"${controller_no}" already exists`;
    }

    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setSaving(true);
    setErrors({});

    const isEdit = !!form.id;

    const { ok, data } = await api(
      isEdit ? `/api/admin/cycles/${form.id}/` : "/api/admin/cycles/",
      {
        method: isEdit ? "PUT" : "POST",
        json: { cycle_no, controller_no },
      }
    );

    setSaving(false);

    if (!ok) {
      if (data.errors?.cycle_no) {
        setErrors({ cycle_no: `"${cycle_no}" already exists` });
      } else if (data.errors?.controller_no) {
        setErrors({ controller_no: `"${controller_no}" already exists` });
      } else {
        setErrors({ form: data.message || "Failed to save cycle" });
      }

      return;
    }

    toast(isEdit ? `${cycle_no} updated` : `${cycle_no} created`);

    closePanel();

    load();

    onDataChange?.();
  };

  /* =======================================================
     DELETE
     ======================================================= */

  const confirmDelete = async () => {
    setDeleting(true);

    const { ok, data } = await api(`/api/admin/cycles/${deleteTarget.id}/`, {
      method: "DELETE",
    });

    setDeleting(false);

    const target = deleteTarget;

    setDeleteTarget(null);

    if (!ok) {
      toast(data.message || "Failed to delete cycle", "error");
      return;
    }

    if (form.id === target.id) {
      closePanel();
    }

    toast(`${target.cycle_no} deleted`);

    load();

    onDataChange?.();
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <Stack
      spacing={{ xs: 1.5, sm: 2, lg: 1.25, xl: 2 }}
      sx={{
        width: "100%",
        height: isTablet ? "auto" : "100%",
        minHeight: 0,
        boxSizing: "border-box",
        overflow: isTablet ? "visible" : "hidden",
        [COMPACT]: { height: "auto", overflow: "visible" },
      }}
    >
      {/* ===================================================
          KPIs
          — scrollable row of fixed-width cards on phones,
            a normal 3-up grid from sm upward
          =================================================== */}

      <Box
        sx={{
          display: { xs: "flex", sm: "grid" },
          gridTemplateColumns: { sm: "repeat(3, 1fr)" },
          gap: { xs: 2, lg: 1.25, xl: 2 },
          overflowX: { xs: "auto", sm: "visible" },
          scrollSnapType: { xs: "x mandatory", sm: "none" },
          pb: { xs: 0.5, sm: 0 },
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        <Box sx={{ flex: { xs: "0 0 72%", sm: "auto" }, scrollSnapAlign: "start" }}>
          <KpiCard
            label="Total cycles"
            value={cycles.length}
            icon="directions_bike"
            loading={loading}
            color="primary"
          />
        </Box>

        <Box sx={{ flex: { xs: "0 0 72%", sm: "auto" }, scrollSnapAlign: "start" }}>
          <KpiCard
            label="Allocated"
            value={allocatedCount}
            hint="IN USE"
            icon="sync"
            loading={loading}
            color="success"
          />
        </Box>

        <Box sx={{ flex: { xs: "0 0 72%", sm: "auto" }, scrollSnapAlign: "start" }}>
          <KpiCard
            label="Unallocated"
            value={cycles.length - allocatedCount}
            hint="AVAILABLE"
            icon="pause_circle"
            loading={loading}
            color="warning"
          />
        </Box>
      </Box>

      {/* ===================================================
          MAIN CONTENT
          — below `lg` the layout flows normally (auto height,
            page scrolls) instead of being boxed into a fixed
            height, and the inspector always stays visible,
            stacked full-width under the list
          =================================================== */}

      <Grid
        container
        spacing={2}
        alignItems="stretch"
        sx={{
          width: "100%",
          flex: isTablet ? "0 0 auto" : "1 1 0",
          minHeight: 0,
          display: "flex",
          alignItems: "stretch",
          overflow: isTablet ? "visible" : "hidden",
          [COMPACT]: { flex: "0 0 auto", overflow: "visible" },
        }}
      >
        {/* =================================================
            TABLE / LIST COLUMN — full width below `lg`
            ================================================= */}

        <Grid
          size={{ xs: 12, lg: 8 }}
          sx={{
            minWidth: 0,
            minHeight: 0,
            height: isTablet ? "auto" : "100%",
            display: "flex",
            flexDirection: "column",
            overflow: isTablet ? "visible" : "hidden",
            [COMPACT]: { height: "auto", overflow: "visible" },
          }}
        >
          <Stack
            spacing={{ xs: 1.5, sm: 2 }}
            sx={{
              flex: isTablet ? "0 0 auto" : "1 1 0",
              minWidth: 0,
              minHeight: 0,
              height: isTablet ? "auto" : "100%",
              display: "flex",
              flexDirection: "column",
              overflow: isTablet ? "visible" : "hidden",
              [COMPACT]: { flex: "0 0 auto", height: "auto", overflow: "visible" },
            }}
          >
            {/* TABLE HEADER / TOOLBAR */}

            <Paper
              sx={{
                p: { xs: 1.5, sm: 2, lg: 1.25, xl: 2 },
                border: 1,
                borderColor: "divider",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <Stack spacing={{ xs: 1.5, lg: 1, xl: 1.5 }}>
                {/* Title row */}
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      sx={{ fontSize: { lg: "1.1rem", xl: "1.5rem" } }}
                      variant={isMobile ? "h6" : "h5"}
                    >
                      Cycles
                    </Typography>

                    <Chip label={`${cycles.length} total`} size="small" variant="outlined" />
                  </Stack>

                  {/* On phones, "New cycle" collapses to a round icon
                      button next to the title so the toolbar stays on
                      one line */}
                  {isMobile && (
                    <IconButton
                      color="primary"
                      onClick={openNew}
                      aria-label="New cycle"
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        "&:hover": { bgcolor: "primary.dark" },
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

                {/* Search + new cycle, wraps freely */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    gap: 1,
                  }}
                >
                  <TextField
                    type="search"
                    size="small"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(0);
                    }}
                    placeholder="Search cycles..."
                    aria-label="Search cycles"
                    fullWidth
                    sx={{ maxWidth: { sm: 280 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />

                  {!isMobile && (
                    <Button
                      type="button"
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={openNew}
                      sx={{ flexShrink: 0, whiteSpace: "nowrap", ml: { sm: "auto" } }}
                    >
                      New cycle
                    </Button>
                  )}
                </Box>
              </Stack>
            </Paper>

            {/* LIST — table from `lg` up, card list below it */}

            <Paper
              sx={{
                border: 1,
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                flex: isTablet ? "0 0 auto" : "1 1 0",
                minHeight: 0,
                minWidth: 0,
                overflow: isTablet ? "visible" : "hidden",
                [COMPACT]: { flex: "0 0 auto" },
              }}
            >
              <Box
                sx={{
                  flex: isTablet ? "0 0 auto" : 1,
                  minHeight: 0,
                  maxHeight: isTablet ? "none" : undefined,
                  overflowY: isTablet ? "visible" : "auto",
                  overflowX: "auto",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  "&::-webkit-scrollbar": { display: "none" },
                  [COMPACT]: { flex: "0 0 auto", maxHeight: 420 },
                }}
              >
                {/* LOADING */}
                {loading && cycles.length === 0 && (
                  <Stack spacing={1} sx={{ p: 1.5 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} variant="rounded" height={isMobile ? 64 : 22} />
                    ))}
                  </Stack>
                )}

                {/* NO CYCLES */}
                {!loading && cycles.length === 0 && (
                  <Stack alignItems="center" spacing={1} sx={{ py: 8, px: 2 }}>
                    <DirectionsBikeIcon sx={{ fontSize: 36, color: "text.disabled" }} />
                    <Typography variant="h6">No cycles yet</Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1, textAlign: "center" }}
                    >
                      Add your first cycle with its controller number.
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
                      New cycle
                    </Button>
                  </Stack>
                )}

                {/* NO SEARCH RESULTS */}
                {!loading && cycles.length > 0 && filtered.length === 0 && (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      No cycles match "{query}".
                    </Typography>
                  </Box>
                )}

                {/* MOBILE / TABLET — card list, below `lg` */}
                {isTablet && rows.length > 0 && (
                  <Stack spacing={1} sx={{ p: 1.5 }}>
                    {rows.map((c) => (
                      <CycleCard
                        key={c.id}
                        c={c}
                        allocated={allocatedIds.has(c.id)}
                        onEdit={() => openEdit(c)}
                        onDelete={() => setDeleteTarget(c)}
                      />
                    ))}
                  </Stack>
                )}

                {/* DESKTOP — full table, `lg` and up */}
                {!isTablet && rows.length > 0 && (
                  <Box component="table" sx={{ width: "100%", minWidth: 520, borderCollapse: "collapse" }}>
                    <Box component="thead">
                      <Box component="tr">
                        <Box component="th" sx={{ ...headCellSx, width: 80 }}>ID</Box>
                        <Box component="th" sx={headCellSx}>Cycle No</Box>
                        <Box component="th" sx={headCellSx}>Controller No</Box>
                        <Box component="th" sx={headCellSx}>State</Box>
                        <Box
                          component="th"
                          sx={{ ...headCellSx, textAlign: "right", width: 110 }}
                        >
                          Actions
                        </Box>
                      </Box>
                    </Box>

                    <Box component="tbody">
                      {rows.map((c) => {
                        const selected = form.id === c.id && panel === "edit";
                        const allocated = allocatedIds.has(c.id);

                        return (
                          <Box
                            component="tr"
                            key={c.id}
                            onClick={() => openEdit(c)}
                            sx={{
                              cursor: "pointer",
                              bgcolor: selected ? "action.selected" : "transparent",
                              "&:hover": { bgcolor: "action.hover" },
                              "& > td": {
                                borderBottom: "1px solid",
                                borderColor: "divider",
                                py: 1,
                                px: 1.5,
                              },
                            }}
                          >
                            {/* ID */}
                            <Box component="td">
                              <Typography variant="overline" color="text.secondary">
                                #{String(c.id).padStart(2, "0")}
                              </Typography>
                            </Box>

                            {/* CYCLE NUMBER */}
                            <Box component="td">
                              <Box
                                component="span"
                                sx={{
                                  display: "inline-flex",
                                  px: 1,
                                  py: 0.4,
                                  borderRadius: 1,
                                  backgroundColor: "action.hover",
                                  color: "text.primary",
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  letterSpacing: "0.04em",
                                }}
                              >
                                {c.cycle_no}
                              </Box>
                            </Box>

                            {/* CONTROLLER */}
                            <Box component="td">
                              <Typography
                                variant="overline"
                                color="text.secondary"
                                sx={{ letterSpacing: "0.04em" }}
                              >
                                {c.controller_no}
                              </Typography>
                            </Box>

                            {/* STATE */}
                            <Box component="td">
                              {allocated ? (
                                <Chip
                                  size="small"
                                  color="success"
                                  label="Allocated"
                                  icon={
                                    <Box
                                      sx={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: "50%",
                                        backgroundColor: "success.main",
                                      }}
                                    />
                                  }
                                  sx={{ "& .MuiChip-icon": { ml: 1 } }}
                                />
                              ) : (
                                <Chip
                                  size="small"
                                  label="Unallocated"
                                  variant="outlined"
                                  icon={
                                    <Box
                                      sx={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: "50%",
                                        backgroundColor: "text.disabled",
                                      }}
                                    />
                                  }
                                  sx={{
                                    color: "text.secondary",
                                    borderColor: "divider",
                                    "& .MuiChip-icon": { ml: 1 },
                                  }}
                                />
                              )}
                            </Box>

                            {/* ACTIONS */}
                            <Box component="td" sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                <Tooltip title="Edit cycle">
                                  <IconButton
                                    size="small"
                                    aria-label={`Edit ${c.cycle_no}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEdit(c);
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title="Delete cycle">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    aria-label={`Delete ${c.cycle_no}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget(c);
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </Box>

              <Box sx={{ flexShrink: 0 }}>
                <Pager
                  page={page}
                  pageSize={pageSize}
                  total={filtered.length}
                  onPage={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(0);
                  }}
                />
              </Box>
            </Paper>
          </Stack>
        </Grid>

        {/* =================================================
            INSPECTOR — always rendered, a side column from
            `lg` up, a full-width block stacked under the list
            below that
            ================================================= */}

        <Grid size={{ xs: 12, lg: 4 }} sx={{ minWidth: 0 }}>
          {(panel === "new" || panel === "edit") && (
            <Paper
              component="form"
              key={form.id ?? "new"}
              onSubmit={submit}
              noValidate
              sx={{
                p: { xs: 2, sm: 2.5 },
                border: 1,
                borderColor: "divider",
                position: "relative",
              }}
            >
              {/* CLOSE BUTTON — absolute top-right */}
              <Tooltip title="Close">
                <IconButton
                  type="button"
                  size="small"
                  onClick={closePanel}
                  aria-label="Close form"
                  sx={{ position: "absolute", top: 10, right: 10 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* FORM HEADER */}
              <Stack direction="row" alignItems="center" sx={{ mb: 2.5, pr: 4 }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box
                    sx={{
                      width: 4,
                      height: 24,
                      borderRadius: 1,
                      backgroundColor: "primary.main",
                    }}
                  />

                  <Typography variant="h6">
                    {panel === "edit" ? `Edit ${form.cycle_no || "cycle"}` : "New cycle"}
                  </Typography>
                </Stack>
              </Stack>

              <Divider sx={{ mb: 2.5 }} />

              <Stack spacing={2}>
                {/* CYCLE NUMBER */}
                <TextField
                  id="cycle_no"
                  name="cycle_no"
                  label="Cycle No"
                  required
                  autoFocus={!isMobile}
                  fullWidth
                  value={form.cycle_no}
                  onChange={onField}
                  placeholder="e.g. CYCLE-001"
                  error={!!cycleNoError}
                  helperText={cycleNoError}
                  inputProps={{
                    sx: { fontFamily: '"JetBrains Mono", monospace', letterSpacing: "0.04em" },
                  }}
                />

                {/* CONTROLLER NUMBER */}
                <TextField
                  id="controller_no"
                  name="controller_no"
                  label="Controller No"
                  required
                  fullWidth
                  value={form.controller_no}
                  onChange={onField}
                  placeholder="e.g. CTRL-ABC-123"
                  error={!!controllerError}
                  helperText={controllerError}
                  inputProps={{
                    sx: { fontFamily: '"JetBrains Mono", monospace', letterSpacing: "0.04em" },
                  }}
                />

                {/* FORM ERROR */}
                {errors.form && <Alert severity="error">{errors.form}</Alert>}

                {/* ACTIONS */}
                <Stack
                  direction={{ xs: "column-reverse", sm: "row" }}
                  justifyContent="flex-end"
                  spacing={1}
                  sx={{ pt: 0.5 }}
                >
                  <Button
                    type="button"
                    variant="outlined"
                    fullWidth={isMobile}
                    onClick={closePanel}
                    disabled={saving}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth={isMobile}
                    disabled={saving}
                    startIcon={
                      saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />
                    }
                  >
                    {saving ? "Saving..." : panel === "edit" ? "Update cycle" : "Save cycle"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* ===================================================
          DELETE DIALOG
          =================================================== */}

      <DeleteCycleDialog
        open={!!deleteTarget}
        cycle={deleteTarget}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Stack>
  );
}

const headCellSx = {
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  py: 1,
  px: 1.5,
  borderBottom: "1px solid",
  borderColor: "divider",
};

export default CycleSection;