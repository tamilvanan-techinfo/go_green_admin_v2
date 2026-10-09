// src/components/allocations/ParticipantSection.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  Divider,
  Grid,
  IconButton,
  InputAdornment,
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

import {
  API_BASE,
  api,
  Avatar,
  Icon,
  Spinner,
  Pager,
  ConfirmDialog,
  useToast,
} from "./Ui";

import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import EditNoteIcon from "@mui/icons-material/EditNote";
import AddIcon from "@mui/icons-material/Add";
import GroupsIcon from "@mui/icons-material/Groups";
import SyncIcon from "@mui/icons-material/Sync";
import PendingActionsIcon from "@mui/icons-material/PendingActions";

function KpiCard({ label, value, hint, icon, loading, color = "primary" }) {
  const IconComponent = { groups: GroupsIcon, sync: SyncIcon, pending_actions: PendingActionsIcon }[icon] || GroupsIcon;
  return (
    <Card
      sx={{
        height: "100%",
        borderLeft: "4px solid",
        borderLeftColor: `${color}.main`,
        backgroundColor: (theme) => alpha(theme.palette[color].main, 0.07),
      }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 }, position: "relative" }}>
        <Box
          sx={{
            position: "absolute",
            top: 16, right: 16,
            width: 44, height: 44,
            borderRadius: 2,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: `${color}.main`,
            backgroundColor: (theme) => alpha(theme.palette[color].main, 0.12),
          }}
        >
          <IconComponent />
        </Box>
        <Box sx={{ pr: 7 }}>
          <Typography variant="overline" sx={{ display: "block", mb: 0.5 }}>{label}</Typography>
          {loading ? (
            <Skeleton variant="text" width={80} height={52} />
          ) : (
            <Typography variant="h3" sx={{ lineHeight: 1.1, fontWeight: 700 }}>{value}</Typography>
          )}
          {hint && (
            <Typography variant="overline" sx={{ display: "block", mt: 0.5, color: `${color}.main` }}>
              {hint}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

const EXCEL_PATH = "/export/participant/";

const EMPTY = {
  id: null,
  name: "",
  dob: "",
  file: null,
  existing: null,
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "allocated", label: "Allocated" },
  { key: "bench", label: "Available" },
];

function capitalizeName(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function ParticipantSection({ onDataChange }) {
  const toast = useToast();
  const fileRef = useRef(null);

  const [participants, setParticipants] = useState([]);
  const [benchIds, setBenchIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // ── inline panel (mirrors CycleSection) ──────────────────
  const [panel, setPanel] = useState("new");
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState(null);
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  // ─────────────────────────────────────────────────────────

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // =========================================================
  // LOAD
  // =========================================================

  const load = useCallback(async () => {
    setLoading(true);

    const [p, b] = await Promise.all([
      api("/api/admin/participants/"),
      api("/api/admin/participants/available"),
    ]);

    if (p.ok) {
      setParticipants(p.data.data || []);
    } else {
      toast(p.data.message || "Failed to load participants", "error");
    }

    if (b.ok) {
      setBenchIds(new Set((b.data.data || []).map((x) => x.id)));
    }

    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // =========================================================
  // PHOTO PREVIEW
  // =========================================================

  useEffect(() => {
    if (!form.file) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(form.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.file]);

  // =========================================================
  // DERIVED DATA
  // =========================================================

  const isAllocated = (p) => !benchIds.has(p.id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return participants.filter((p) => {
      if (q && !String(p.name).toLowerCase().includes(q)) return false;
      if (filter === "allocated") return !benchIds.has(p.id);
      if (filter === "bench") return benchIds.has(p.id);
      return true;
    });
  }, [participants, benchIds, query, filter]);

  const rows = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const allocatedCount = participants.filter((p) => !benchIds.has(p.id)).length;

  // =========================================================
  // PANEL HANDLERS  (same pattern as CycleSection)
  // =========================================================

  const openNew = () => {
    setForm(EMPTY);
    setNameError("");
    setFormError("");
    setPanel("new");
  };

  const openEdit = (p) => {
    setForm({
      id: p.id,
      name: p.name,
      dob: p.dob || "",
      file: null,
      existing: p.profile || null,
    });
    setNameError("");
    setFormError("");
    setPanel("edit");
  };

  const closePanel = () => {
    setPanel("new");
    setForm(EMPTY);
    setNameError("");
    setFormError("");
  };

  const onField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setNameError("");
    setFormError("");
  };

  // =========================================================
  // SAVE
  // =========================================================

  const submit = async (e) => {
    e?.preventDefault();

    const name = form.name.trim();

    if (!name) {
      setNameError("Name is required");
      return;
    }

    setSaving(true);
    setFormError("");

    const isEdit = !!form.id;
    const body = new FormData();
    body.append("name", name);
    body.append("dob", form.dob);
    if (form.file) body.append("profile", form.file);

    const { ok, data } = await api(
      isEdit
        ? `/api/admin/participants/${form.id}/`
        : "/api/admin/participants/",
      { method: isEdit ? "PUT" : "POST", form: body }
    );

    setSaving(false);

    if (!ok) {
      setFormError(data.message || "Failed to save participant");
      return;
    }

    toast(isEdit ? `${name} updated` : `${name} added`);
    closePanel();
    load();
    onDataChange?.();
  };

  // =========================================================
  // DELETE
  // =========================================================

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError("");

    const { ok, data } = await api(
      `/api/admin/participants/${deleteTarget.id}/`,
      { method: "DELETE" }
    );

    setDeleting(false);

    if (!ok) {
      setDeleteError(data.message || "Failed to delete participant");
      return;
    }

    toast(`${deleteTarget.name} deleted`);

    if (form.id === deleteTarget.id) closePanel();

    setDeleteTarget(null);
    load();
    onDataChange?.();
  };

  // =========================================================
  // EXCEL EXPORT / IMPORT
  // =========================================================

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}${EXCEL_PATH}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast(d.message || "Failed to download Excel file", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "participants.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("participants.xlsx downloaded");
    } catch (err) {
      console.error(err);
      toast("Error downloading Excel file", "error");
    } finally {
      setExporting(false);
    }
  };

  const importExcel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    const body = new FormData();
    body.append("file", file);

    const { ok, data } = await api(EXCEL_PATH, { method: "POST", form: body });
    setImporting(false);

    if (!ok) {
      toast(data.message || "Failed to upload Excel file", "error");
      return;
    }

    toast(data.message || `${file.name} imported`);
    load();
    onDataChange?.();
  };

  // =========================================================
  // PHOTO SRC
  // =========================================================

  const photoSrc =
    preview || (form.existing ? `${API_BASE}${form.existing}` : null);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <Stack
      spacing={2}
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* =======================================================
          KPIs
          ======================================================= */}

      <Grid container spacing={2} sx={{ width: "100%" }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <KpiCard
            label="Participants"
            value={participants.length}
            icon="groups"
            loading={loading}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <KpiCard
            label="Allocated"
            value={allocatedCount}
            hint="ON A CYCLE"
            icon="sync"
            loading={loading}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <KpiCard
            label="Available"
            value={participants.length - allocatedCount}
            hint="NOT ALLOCATED"
            icon="pending_actions"
            loading={loading}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* =======================================================
          MAIN CONTENT  (table  +  inline panel)
          ======================================================= */}

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
        {/* =====================================================
            LEFT — TABLE COLUMN
            ===================================================== */}

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
            {/* ─── TABLE TOOLBAR ─────────────────────────────── */}

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
                {/* Title + count */}
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ flexShrink: 0 }}
                >
                  <Typography variant="h5">Participants</Typography>
                  <Chip
                    label={`${participants.length} total`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>

                {/* Controls */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    justifyContent: { xs: "flex-start", sm: "flex-end" },
                    gap: 1,
                    ml: { xs: 0, sm: "auto" },
                    width: { xs: "100%", sm: "auto" },
                    flexWrap: "wrap",
                  }}
                >
                  {/* Search */}
                  <TextField
                    type="search"
                    size="small"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(0);
                    }}
                    placeholder="Search by name"
                    aria-label="Search participants"
                    sx={{ width: { xs: "100%", sm: 220 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Icon name="search" size={17} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* Filter pills */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      bgcolor: "background.default",
                      borderRadius: 1,
                      p: 0.5,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                    role="group"
                    aria-label="Filter by allocation"
                  >
                    {FILTERS.map((f) => {
                      const selected = filter === f.key;
                      return (
                        <Button
                          key={f.key}
                          type="button"
                          size="small"
                          variant={selected ? "contained" : "text"}
                          color="primary"
                          aria-pressed={selected}
                          onClick={() => {
                            setFilter(f.key);
                            setPage(0);
                          }}
                          sx={{
                            minHeight: 30,
                            px: 1.5,
                            borderRadius: 0.75,
                            boxShadow: selected
                              ? "0 1px 4px rgba(15,23,42,0.10)"
                              : "none",
                          }}
                        >
                          {f.label}
                        </Button>
                      );
                    })}
                  </Box>

                  {/* Download Excel */}
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={
                      exporting ? (
                        <Spinner size={16} />
                      ) : (
                        <Icon name="file_download" size={16} />
                      )
                    }
                    onClick={exportExcel}
                    disabled={exporting}
                    sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                  >
                    Download Excel
                  </Button>

                  {/* Upload Excel */}
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={
                      importing ? (
                        <Spinner size={16} />
                      ) : (
                        <Icon name="upload_file" size={16} />
                      )
                    }
                    onClick={() => fileRef.current?.click()}
                    disabled={importing}
                    sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                  >
                    Upload Excel
                  </Button>

                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.xlsm"
                    hidden
                    onChange={importExcel}
                  />

                  {/* Add participant */}
                  <Button
                    type="button"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openNew}
                    sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                  >
                    Add participant
                  </Button>
                </Box>
              </Box>
            </Paper>

            {/* ─── TABLE ─────────────────────────────────────── */}

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
                  "&::-webkit-scrollbar": { display: "none" },
                }}
              >
                <Table sx={{ minWidth: 560 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 70 }}>Photo</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Registered on</TableCell>
                      <TableCell>Allocation</TableCell>
                      <TableCell
                        align="right"
                        sx={{ width: 110, minWidth: 110, whiteSpace: "nowrap" }}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {/* Loading skeletons */}
                    {loading &&
                      participants.length === 0 &&
                      [0, 1, 2, 3].map((i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}>
                            <Skeleton variant="rounded" height={22} />
                          </TableCell>
                        </TableRow>
                      ))}

                    {/* Empty state */}
                    {!loading && participants.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ py: 8 }}>
                          <Stack alignItems="center" spacing={1}>
                            <Icon name="groups" size={36} />
                            <Typography variant="h6">
                              No participants yet
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 1, textAlign: "center" }}
                            >
                              Add someone manually or upload an Excel sheet.
                            </Typography>
                            <Button
                              variant="contained"
                              startIcon={<AddIcon />}
                              onClick={openNew}
                            >
                              Add participant
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}

                    {/* No search results */}
                    {!loading &&
                      participants.length > 0 &&
                      filtered.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            sx={{ py: 8, textAlign: "center" }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              No participants match "{query}".
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}

                    {/* Data rows */}
                    {rows.map((p) => {
                      const selected =
                        form.id === p.id && panel === "edit";
                      const allocated = isAllocated(p);

                      return (
                        <TableRow
                          key={p.id}
                          hover
                          selected={selected}
                          onClick={() => openEdit(p)}
                          sx={{ cursor: "pointer" }}
                        >
                          {/* Photo */}
                          <TableCell>
                            <Avatar
                              name={p.name}
                              src={
                                p.profile
                                  ? `${API_BASE}${p.profile}`
                                  : null
                              }
                              size={40}
                            />
                          </TableCell>

                          {/* Name */}
                          <TableCell>
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 600 }}
                            >
                              {capitalizeName(p.name)}
                            </Typography>
                          </TableCell>

                          {/* Registered on */}
                          <TableCell>
                            <Typography variant="overline" color="text.secondary">
                              {p.registered_on}
                            </Typography>
                          </TableCell>

                          {/* Allocation badge */}
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
                                label="Available"
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
                          </TableCell>

                          {/* Actions */}
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
                            >
                              <Tooltip title="Edit participant">
                                <IconButton
                                  size="small"
                                  aria-label={`Edit ${p.name}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEdit(p);
                                  }}
                                >
                                  <Icon name="edit" size={16} />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Delete participant">
                                <IconButton
                                  size="small"
                                  color="error"
                                  aria-label={`Delete ${p.name}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteError("");
                                    setDeleteTarget(p);
                                  }}
                                >
                                  <Icon name="delete" size={16} />
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
                  onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
                />
              </Box>
            </Paper>
          </Stack>
        </Grid>

        {/* =====================================================
            RIGHT — INLINE PANEL
            ===================================================== */}

        <Grid size={{ xs: 12, lg: 4 }}>
          {panel === null ? (
            /* ── Empty state ── */
            <Paper
              sx={{
                p: 4,
                textAlign: "center",
                border: 1,
                borderColor: "divider",
                minHeight: 188,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <EditNoteIcon
                sx={{ fontSize: 36, color: "text.disabled" }}
              />
              <Typography variant="h6" sx={{ mt: 1 }}>
                Select a participant to edit
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                Or add a new one. Each participant needs a unique
                name and an optional profile photo.
              </Typography>
              <Button
                type="button"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openNew}
              >
                Add participant
              </Button>
            </Paper>
          ) : (
            /* ── Form panel ── */
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
              {/* Close */}
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

              {/* Header */}
              <Stack
                direction="row"
                alignItems="center"
                sx={{ mb: 2.5, pr: 4 }}
              >
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
                    {panel === "edit"
                      ? `Edit ${form.name || "participant"}`
                      : "Add participant"}
                  </Typography>
                </Stack>
              </Stack>

              <Divider sx={{ mb: 2.5 }} />

              <Stack spacing={2.5}>
                {/* Name */}
                <TextField
                  id="p-name"
                  name="name"
                  label="Name"
                  required
                  autoFocus
                  fullWidth
                  value={form.name}
                  onChange={onField}
                  placeholder="e.g. Kiran Kapoor"
                  error={Boolean(nameError)}
                  helperText={nameError}
                />

                {/* DOB — kept in form state, add field if needed */}
                {/* Uncomment to expose it:
                <TextField
                  id="p-dob"
                  name="dob"
                  label="Date of birth"
                  type="date"
                  fullWidth
                  value={form.dob}
                  onChange={onField}
                  InputLabelProps={{ shrink: true }}
                /> */}

                {/* Form-level error */}
                {formError && (
                  <Alert severity="error">{formError}</Alert>
                )}

                {/* Actions */}
                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  spacing={1}
                  sx={{ pt: 0.5 }}
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
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <SaveIcon />
                      )
                    }
                  >
                    {saving
                      ? "Saving..."
                      : panel === "edit"
                      ? "Update participant"
                      : "Save participant"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* =========================================================
          DELETE DIALOG
          ========================================================= */}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete participant?"
        busy={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        <strong>{deleteTarget?.name}</strong> will be removed from the
        directory. This action cannot be undone.
      </ConfirmDialog>
    </Stack>
  );
}

export default ParticipantSection;