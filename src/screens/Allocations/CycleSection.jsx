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
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
 
} from "@mui/material";

import { alpha } from "@mui/material/styles";


import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import SyncIcon from "@mui/icons-material/Sync";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import {
  api,
  useToast,
  Pager,
} from "./Ui";



const EMPTY = {
  id: null,
  cycle_no: "",
  controller_no: "",
};

/* =========================================================
   KPI CARD
   ========================================================= */

function KpiCard({
  label,
  value,
  hint,
  icon,
  loading,
  color = "primary",
}) {
  const iconMap = {
    directions_bike: DirectionsBikeIcon,
    sync: SyncIcon,
    pause_circle: PauseCircleIcon,
  };

  const IconComponent =
    iconMap[icon] || DirectionsBikeIcon;

  return (
    <Card
      sx={{
        height: "100%",
        borderLeft: "4px solid",
        borderLeftColor: `${color}.main`,
        backgroundColor: (theme) => alpha(theme.palette[color].main, 0.07),
      }}
    >
      <CardContent
        sx={{
          p: 2.5,
          "&:last-child": { pb: 2.5 },
          position: "relative",
        }}
      >
        {/* Icon — top right corner */}
        <Box
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: `${color}.main`,
            backgroundColor: (theme) =>
              alpha(theme.palette[color].main, 0.12),
          }}
        >
          <IconComponent />
        </Box>

        <Box sx={{ pr: 7 }}>
          <Typography
            variant="overline"
            sx={{ display: "block", mb: 0.5 }}
          >
            {label}
          </Typography>

          {loading ? (
            <Skeleton variant="text" width={80} height={52} />
          ) : (
            <Typography
              variant="h3"
              sx={{ lineHeight: 1.1, fontWeight: 700 }}
            >
              {value}
            </Typography>
          )}

          {hint && (
            <Typography
              variant="overline"
              sx={{ display: "block", mt: 0.5, color: `${color}.main` }}
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
   PAGINATION
   ========================================================= */




/* =========================================================
   CONFIRM DELETE DIALOG
   ========================================================= */

function DeleteCycleDialog({
  open,
  cycle,
  busy,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "error.main",
              backgroundColor: (theme) =>
                alpha(theme.palette.error.main, 0.1),
            }}
          >
            <WarningAmberIcon fontSize="small" />
          </Box>

          <Typography
            component="span"
            variant="h6"
          >
            Delete cycle?
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Typography
          variant="body2"
          color="text.secondary"
        >
          <strong>{cycle?.cycle_no}</strong> will be
          removed. This action cannot be undone.
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 2.5,
        }}
      >
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={busy}
          startIcon={
            busy ? (
              <CircularProgress
                size={16}
                color="inherit"
              />
            ) : (
              <DeleteIcon />
            )
          }
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

  const [cycles, setCycles] = useState([]);
  const [allocatedIds, setAllocatedIds] = useState(
    new Set()
  );
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [panel, setPanel] = useState("new");
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState(null);
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
      toast(
        c.data.message || "Failed to load cycles",
        "error"
      );
    }

    if (a.ok) {
      setAllocatedIds(
        new Set(
          (a.data.data || []).map(
            (x) => x.cycle
          )
        )
      );
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
        String(c.cycle_no)
          .toLowerCase()
          .includes(q) ||
        String(c.controller_no)
          .toLowerCase()
          .includes(q)
    );
  }, [cycles, query]);

  const rows = filtered.slice(
  page * pageSize,
  (page + 1) * pageSize
  );

  const allocatedCount = cycles.filter((c) =>
    allocatedIds.has(c.id)
  ).length;

  /* =======================================================
     DUPLICATE CHECK
     ======================================================= */

  const dup = useMemo(() => {
    const no = form.cycle_no
      .trim()
      .toLowerCase();

    const ctrl = form.controller_no
      .trim()
      .toLowerCase();

    const others = cycles.filter(
      (c) => c.id !== form.id
    );

    return {
      cycle_no:
        !!no &&
        others.some(
          (c) =>
            String(c.cycle_no)
              .toLowerCase() === no
        ),

      controller_no:
        !!ctrl &&
        others.some(
          (c) =>
            String(c.controller_no)
              .toLowerCase() === ctrl
        ),
    };
  }, [cycles, form]);

  const cycleNoError =
    errors.cycle_no ||
    (dup.cycle_no
      ? `"${form.cycle_no.trim()}" already exists`
      : "");

  const controllerError =
    errors.controller_no ||
    (dup.controller_no
      ? `"${form.controller_no.trim()}" already exists`
      : "");

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

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
      form: undefined,
    }));
  };

  /* =======================================================
     SUBMIT
     ======================================================= */

  const submit = async (e) => {
    e?.preventDefault();

    const cycle_no = form.cycle_no.trim();
    const controller_no =
      form.controller_no.trim();

    const next = {};

    if (!cycle_no) {
      next.cycle_no = "Cycle No is required";
    } else if (dup.cycle_no) {
      next.cycle_no =
        `"${cycle_no}" already exists`;
    }

    if (!controller_no) {
      next.controller_no =
        "Controller No is required";
    } else if (dup.controller_no) {
      next.controller_no =
        `"${controller_no}" already exists`;
    }

    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setSaving(true);
    setErrors({});

    const isEdit = !!form.id;

    const { ok, data } = await api(
      isEdit
        ? `/api/admin/cycles/${form.id}/`
        : "/api/admin/cycles/",
      {
        method: isEdit ? "PUT" : "POST",
        json: {
          cycle_no,
          controller_no,
        },
      }
    );

    setSaving(false);

    if (!ok) {
      if (data.errors?.cycle_no) {
        setErrors({
          cycle_no:
            `"${cycle_no}" already exists`,
        });
      } else if (data.errors?.controller_no) {
        setErrors({
          controller_no:
            `"${controller_no}" already exists`,
        });
      } else {
        setErrors({
          form:
            data.message ||
            "Failed to save cycle",
        });
      }

      return;
    }

    toast(
      isEdit
        ? `${cycle_no} updated`
        : `${cycle_no} created`
    );

    closePanel();

    load();

    onDataChange?.();
  };

  /* =======================================================
     DELETE
     ======================================================= */

  const confirmDelete = async () => {
    setDeleting(true);

    const { ok, data } = await api(
      `/api/admin/cycles/${deleteTarget.id}/`,
      {
        method: "DELETE",
      }
    );

    setDeleting(false);

    const target = deleteTarget;

    setDeleteTarget(null);

    if (!ok) {
      toast(
        data.message || "Failed to delete cycle",
        "error"
      );
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
    <Stack spacing={2}
      sx={{
      width: "100%",
      height: "100%",
      minHeight: 0,
      boxSizing: "border-box",
      overflow: "hidden",
      }}>
      {/* ===================================================
          KPIs
          =================================================== */}

      <Grid
        container
        spacing={2}
        sx={{
          width: "100%",
        }}
      >
        <Grid size={{ xs: 12, md: 4 }}>
          <KpiCard
            label="Total cycles"
            value={cycles.length}
            icon="precision_manufacturing"
            loading={loading}
            color="primary"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <KpiCard
            label="Allocated"
            value={allocatedCount}
            hint="IN USE"
            icon="sync"
            loading={loading}
            color="success"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <KpiCard
            label="Unallocated"
            value={
              cycles.length - allocatedCount
            }
            hint="AVAILABLE"
            icon="pause_circle"
            loading={loading}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* ===================================================
          MAIN CONTENT
          =================================================== */}

      <Grid
        container
        spacing={2}
        alignItems="stretch"
        sx={{
          width: "100%",
          flex: "1 1 0",
          minHeight: 0,
          display: "flex",
          alignItems: "stretch",
          overflow: "hidden",
        }}
      >
        {/* =================================================
            TABLE
            ================================================= */}

        <Grid
          size={{ xs: 12, lg: 8 }}
          sx={{
            flex: "1 1 0",
            minWidth: 0,
            minHeight: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Stack
            spacing={2}
            sx={{
              flex: "1 1 0",
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
          

{/* TABLE HEADER */}

<Paper
  sx={{
    p: 2,
    border: 1,
    borderColor: "divider",
    width: "100%",
    boxSizing: "border-box",
  }}
>
  <Box
    sx={{
      display: "flex",
      flexDirection: { xs: "column", sm: "row" },
      alignItems: { xs: "stretch", sm: "center" },
      width: "100%",
      gap: 2,
    }}
  >
    {/* LEFT: TITLE AND COUNT */}
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ flexShrink: 0 }}
    >
      <Typography variant="h5">
        Cycles
      </Typography>

      <Chip
        label={`${cycles.length} total`}
        size="small"
        variant="outlined"
      />
    </Stack>

    {/* RIGHT: SEARCH AND NEW CYCLE BUTTON */}
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: { xs: "flex-start", sm: "flex-end" },
        gap: 1,
        ml: { xs: 0, sm: "auto" },
        width: { xs: "100%", sm: "auto" },
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
        sx={{
          width: { xs: "100%", sm: 240 },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      <Button
        type="button"
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={openNew}
        sx={{
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        New cycle
      </Button>
    </Box>
  </Box>
</Paper>





            {/* TABLE */}

            <Paper
              sx={{
                border: 1,
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                flex: "1 1 0",
                minHeight: 0,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <TableContainer
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  overflowX: "auto",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  "&::-webkit-scrollbar": {
                  display: "none",
                  },
                  }}
              >
                <Table sx={{ minWidth: 520 }}>
                  

<TableHead>
  <TableRow>
    <TableCell sx={{ width: 80 }}>ID</TableCell>
    <TableCell>Cycle No</TableCell>
    <TableCell>Controller No</TableCell>
    <TableCell>State</TableCell>
    <TableCell
      align="right"
      sx={{
        width: 110,
        minWidth: 110,
        whiteSpace: "nowrap",
      }}
    >
      Actions
    </TableCell>
  </TableRow>
</TableHead>

                  <TableBody>
                    {/* LOADING */}

                    {loading &&
                      cycles.length === 0 &&
                      [0, 1, 2, 3].map((i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}>
                            <Skeleton
                              variant="rounded"
                              height={22}
                            />
                          </TableCell>
                        </TableRow>
                      ))}

                    {/* NO CYCLES */}

                    {!loading &&
                      cycles.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            sx={{
                              py: 8,
                            }}
                          >
                            <Stack
                              alignItems="center"
                              spacing={1}
                            >
                              <DirectionsBikeIcon
                                sx={{
                                  fontSize: 36,
                                  color:
                                    "text.disabled",
                                }}
                              />

                              <Typography variant="h6">
                                No cycles yet
                              </Typography>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mb: 1,
                                  textAlign: "center",
                                }}
                              >
                                Add your first cycle
                                with its controller
                                number.
                              </Typography>

                              <Button
                                variant="contained"
                                startIcon={
                                  <AddIcon />
                                }
                                onClick={openNew}
                              >
                                New cycle
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )}

                    {/* NO SEARCH RESULTS */}

                    {!loading &&
                      cycles.length > 0 &&
                      filtered.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            sx={{
                              py: 8,
                              textAlign: "center",
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              No cycles match “
                              {query}”.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}

                    {/* ROWS */}

                    {rows.map((c) => {
                      const selected =
                        form.id === c.id &&
                        panel === "edit";

                      const allocated =
                        allocatedIds.has(c.id);

                      return (
                        <TableRow
                          key={c.id}
                          hover
                          selected={selected}
                          onClick={() =>
                            openEdit(c)
                          }
                          sx={{
                            cursor: "pointer",
                          }}
                        >
                          {/* ID */}

                          <TableCell>
                            <Typography variant="overline" color="text.secondary">
                              #{String(c.id).padStart(2, "0")}
                            </Typography>
                          </TableCell>

                          {/* CYCLE NUMBER */}

                          <TableCell>
                            <Box component="span" sx={{ display: "inline-flex", px: 1, py: 0.4, borderRadius: 1, backgroundColor: "action.hover", color: "text.primary", fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 600, letterSpacing: "0.04em" }}>
                              {c.cycle_no}
                            </Box>
                          </TableCell>

                          {/* CONTROLLER */}

                          <TableCell>
                            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.04em" }}>
                              {c.controller_no}
                            </Typography>
                          </TableCell>

                          {/* STATE */}

                          <TableCell>
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
                                      borderRadius:
                                        "50%",
                                      backgroundColor:
                                        "success.main",
                                    }}
                                  />
                                }
                                sx={{
                                  "& .MuiChip-icon":
                                    {
                                      ml: 1,
                                    },
                                }}
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
                                      borderRadius:
                                        "50%",
                                      backgroundColor:
                                        "text.disabled",
                                    }}
                                  />
                                }
                                sx={{
                                  color:
                                    "text.secondary",
                                  borderColor:
                                    "divider",
                                  "& .MuiChip-icon":
                                    {
                                      ml: 1,
                                    },
                                }}
                              />
                            )}
                          </TableCell>

                          {/* ACTIONS */}

                          <TableCell
  align="right"
  sx={{
    width: 110,
    minWidth: 110,
    whiteSpace: "nowrap",
  }}
>
  <Stack
    direction="row"
    spacing={0.5}
    justifyContent="flex-end"
    alignItems="center"
    sx={{
      width: "100%",
    }}
  >
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
</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

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
            INSPECTOR
            ================================================= */}

        <Grid size={{ xs: 12, lg: 4 }}>
          {(panel === "new" || panel === "edit") && (
            <Paper
              component="form"
              key={form.id ?? "new"}
              onSubmit={submit}
              noValidate
              sx={{
                p: 2.5,
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
                  sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* FORM HEADER */}
              <Stack
                direction="row"
                alignItems="center"
                sx={{ mb: 2.5, pr: 4 }}
              >
                <Stack
                  direction="row"
                  spacing={1.25}
                  alignItems="center"
                >
                  <Box
                    sx={{
                      width: 4,
                      height: 24,
                      borderRadius: 1,
                      backgroundColor: "primary.main",
                    }}
                  />

                  <Typography variant="h6">
                    {panel === "edit"
                      ? `Edit ${form.cycle_no || "cycle"}`
                      : "New cycle"}
                  </Typography>
                </Stack>
              </Stack>

              <Divider
                sx={{
                  mb: 2.5,
                }}
              />

              <Stack spacing={2}>
                {/* CYCLE NUMBER */}

                <TextField
                  id="cycle_no"
                  name="cycle_no"
                  label="Cycle No"
                  required
                  autoFocus
                  fullWidth
                  value={form.cycle_no}
                  onChange={onField}
                  placeholder="e.g. CYCLE-001"
                  error={!!cycleNoError}
                  helperText={cycleNoError}
                  inputProps={{ sx: { fontFamily: '"JetBrains Mono", monospace', letterSpacing: "0.04em" } }}
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
                  inputProps={{ sx: { fontFamily: '"JetBrains Mono", monospace', letterSpacing: "0.04em" } }}
                />

                {/* FORM ERROR */}

                {errors.form && (
                  <Alert severity="error">
                    {errors.form}
                  </Alert>
                )}

                {/* ACTIONS */}

                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  spacing={1}
                  sx={{
                    pt: 0.5,
                  }}
                >
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={closePanel}
                    disabled={saving}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    startIcon={
                      saving ? (
                        <CircularProgress
                          size={16}
                          color="inherit"
                        />
                      ) : (
                        <SaveIcon />
                      )
                    }
                  >
                    {saving
                      ? "Saving..."
                      : panel === "edit"
                      ? "Update cycle"
                      : "Save cycle"}
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

export default CycleSection;