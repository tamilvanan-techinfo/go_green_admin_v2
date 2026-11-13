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
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";

import { alpha, useTheme } from "@mui/material/styles";
import { COMPACT } from "../../components/Layout";

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

/* =============================================================
   KPI CARD
   — on phones these stack into a horizontally-scrollable strip
     (same idea Swiggy uses for its offer/category chips)
   ============================================================= */

function KpiCard({ label, value, hint, icon, loading, color = "primary" }) {
  const IconComponent =
    { groups: GroupsIcon, sync: SyncIcon, pending_actions: PendingActionsIcon }[
      icon
    ] || GroupsIcon;

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
          // shrinks again at `lg` (laptop widths, ~1200–1536px) so the
          // KPI row doesn't eat the same vertical space it does on a
          // big monitor, then grows back at `xl`
          p: { xs: 1.75, sm: 2.5, lg: 1.5, xl: 2.5 },
          "&:last-child": { pb: { xs: 1.75, sm: 2.5, lg: 1.5, xl: 2.5 } },
          position: "relative",
        }}
      >
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

/* =============================================================
   MOBILE ROW — card representation of a participant (xs / sm)
   ============================================================= */

function ParticipantCard({ p, allocated, onEdit, onDelete }) {
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
      <Avatar
        name={p.name}
        src={p.profile ? `${API_BASE}${p.profile}` : null}
        size={44}
      />

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="body1"
          sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {capitalizeName(p.name)}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
          <Typography variant="caption" color="text.secondary">
            {p.registered_on}
          </Typography>
          <Chip
            size="small"
            label={allocated ? "Allocated" : "Available"}
            color={allocated ? "success" : "default"}
            variant={allocated ? "filled" : "outlined"}
            sx={{ height: 20, fontSize: 11 }}
          />
        </Stack>
      </Box>

      <Stack direction="row" spacing={0.5}>
        <IconButton
          size="small"
          aria-label={`Edit ${p.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Icon name="edit" size={16} />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          aria-label={`Delete ${p.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Icon name="delete" size={16} />
        </IconButton>
      </Stack>
    </Paper>
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
  const theme = useTheme();

  // breakpoints — mirrors the way swiggy collapses its listing /
  // filter bar / cart drawer across phone -> tablet -> desktop
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));   // < 600
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"));   // < 1200

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

  // on phones/tablets the panel becomes a bottom drawer instead of
  // a permanently-visible column, so we track its open state too
  const [panelOpen, setPanelOpen] = useState(false);
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
    setPanelOpen(true);
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
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanel("new");
    setForm(EMPTY);
    setNameError("");
    setFormError("");
    setPanelOpen(false);
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
  // SHARED PANEL CONTENT (used inline on desktop, in a Drawer
  // on mobile/tablet — exact same form, two different shells)
  // =========================================================

  const panelContent = (
    <Paper
      component="form"
      key={form.id ?? "new"}
      onSubmit={submit}
      noValidate
      elevation={isTablet ? 0 : 1}
      sx={{
        p: { xs: 2, sm: 2.5 },
        border: isTablet ? 0 : 1,
        borderColor: "divider",
        position: "relative",
        height: "auto",
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
            {panel === "edit"
              ? `Edit ${form.name || "participant"}`
              : "Add participant"}
          </Typography>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 2.5 }} />

      <Stack spacing={2.5}>
        {/* Photo preview, if any */}
        {photoSrc && (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Avatar name={form.name} src={photoSrc} size={72} />
          </Box>
        )}

        {/* Name */}
        <TextField
          id="p-name"
          name="name"
          label="Name"
          required
          autoFocus={!isMobile}
          fullWidth
          value={form.name}
          onChange={onField}
          placeholder="e.g. Kiran Kapoor"
          error={Boolean(nameError)}
          helperText={nameError}
        />

        {/* Form-level error */}
        {formError && <Alert severity="error">{formError}</Alert>}

        {/* Actions */}
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
  );

  // =========================================================
  // RENDER
  // =========================================================

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
      {/* =======================================================
          KPIs
          — scrollable row of fixed-width cards on phones,
            a normal 3-up grid from sm upward (swiggy-style
            horizontal scroller for small viewports)
          ======================================================= */}

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
            label="Participants"
            value={participants.length}
            icon="groups"
            loading={loading}
            color="primary"
          />
        </Box>
        <Box sx={{ flex: { xs: "0 0 72%", sm: "auto" }, scrollSnapAlign: "start" }}>
          <KpiCard
            label="Allocated"
            value={allocatedCount}
            hint="ON A CYCLE"
            icon="sync"
            loading={loading}
            color="success"
          />
        </Box>
        <Box sx={{ flex: { xs: "0 0 72%", sm: "auto" }, scrollSnapAlign: "start" }}>
          <KpiCard
            label="Available"
            value={participants.length - allocatedCount}
            hint="NOT ALLOCATED"
            icon="pending_actions"
            loading={loading}
            color="warning"
          />
        </Box>
      </Box>

      {/* =======================================================
          MAIN CONTENT  (table  +  inline panel)
          — below `lg` the right-hand panel disappears from the
            grid entirely and becomes a bottom Drawer, the same
            way swiggy's cart collapses into a floating sheet
            once the layout can't fit two columns anymore
          ======================================================= */}

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
        {/* =====================================================
            TABLE / LIST COLUMN — full width below `lg`
            ===================================================== */}

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
            {/* ─── TOOLBAR ───────────────────────────────────── */}

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
                      Participants
                    </Typography>
                    <Chip
                      label={`${participants.length} total`}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  {/* On phones, "Add" collapses to a round FAB-like icon button
                      next to the title so the toolbar stays on one line */}
                  {isMobile && (
                    <IconButton
                      color="primary"
                      onClick={openNew}
                      aria-label="Add participant"
                      sx={{ bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" } }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

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
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Icon name="search" size={17} />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Filter pills + action buttons, wraps freely */}
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      bgcolor: "background.default",
                      borderRadius: 1,
                      p: 0.5,
                      border: "1px solid",
                      borderColor: "divider",
                      overflowX: "auto",
                      "&::-webkit-scrollbar": { display: "none" },
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
                            whiteSpace: "nowrap",
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

                  <Box sx={{ ml: { sm: "auto" }, display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {/* Download Excel — icon-only on phones */}
                    <Tooltip title="Download Excel">
                      <Button
                        type="button"
                        variant="outlined"
                        size="small"
                        startIcon={
                          exporting ? <Spinner size={16} /> : <Icon name="file_download" size={16} />
                        }
                        onClick={exportExcel}
                        disabled={exporting}
                        sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                      >
                        {isMobile ? "Excel" : "Download Excel"}
                      </Button>
                    </Tooltip>

                    {/* Upload Excel */}
                    <Button
                      type="button"
                      variant="outlined"
                      size="small"
                      startIcon={
                        importing ? <Spinner size={16} /> : <Icon name="upload_file" size={16} />
                      }
                      onClick={() => fileRef.current?.click()}
                      disabled={importing}
                      sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                    >
                      {isMobile ? "Import" : "Upload Excel"}
                    </Button>

                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,.xlsm"
                      hidden
                      onChange={importExcel}
                    />

                    {/* Add participant — hidden on phones (FAB above instead) */}
                    {!isMobile && (
                      <Button
                        type="button"
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={openNew}
                        sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                      >
                        Add participant
                      </Button>
                    )}
                  </Box>
                </Box>
              </Stack>
            </Paper>

            {/* ─── LIST — table from `md` up, cards below it ──── */}

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
                {/* Loading skeletons */}
                {loading && participants.length === 0 && (
                  <Stack spacing={1} sx={{ p: 1.5 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} variant="rounded" height={isMobile ? 64 : 22} />
                    ))}
                  </Stack>
                )}

                {/* Empty state */}
                {!loading && participants.length === 0 && (
                  <Stack alignItems="center" spacing={1} sx={{ py: 8, px: 2 }}>
                    <Icon name="groups" size={36} />
                    <Typography variant="h6">No participants yet</Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1, textAlign: "center" }}
                    >
                      Add someone manually or upload an Excel sheet.
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
                      Add participant
                    </Button>
                  </Stack>
                )}

                {/* No search results */}
                {!loading && participants.length > 0 && filtered.length === 0 && (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      No participants match "{query}".
                    </Typography>
                  </Box>
                )}

                {/* MOBILE / TABLET — card list */}
                {isTablet && rows.length > 0 && (
                  <Stack spacing={1} sx={{ p: 1.5 }}>
                    {rows.map((p) => (
                      <ParticipantCard
                        key={p.id}
                        p={p}
                        allocated={isAllocated(p)}
                        onEdit={() => openEdit(p)}
                        onDelete={() => {
                          setDeleteError("");
                          setDeleteTarget(p);
                        }}
                      />
                    ))}
                  </Stack>
                )}

                {/* DESKTOP — full table, `lg` and up */}
                {!isTablet && rows.length > 0 && (
                  <Box component="table" sx={{ width: "100%", minWidth: 560, borderCollapse: "collapse" }}>
                    <Box component="thead">
                      <Box component="tr">
                        <Box component="th" sx={headCellSx}>Photo</Box>
                        <Box component="th" sx={{ ...headCellSx, textAlign: "left" }}>Name</Box>
                        <Box component="th" sx={{ ...headCellSx, textAlign: "left" }}>Registered on</Box>
                        <Box component="th" sx={{ ...headCellSx, textAlign: "left" }}>Allocation</Box>
                        <Box component="th" sx={{ ...headCellSx, textAlign: "right", width: 110 }}>Actions</Box>
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {rows.map((p) => {
                        const selected = form.id === p.id && panel === "edit";
                        const allocated = isAllocated(p);
                        return (
                          <Box
                            component="tr"
                            key={p.id}
                            onClick={() => openEdit(p)}
                            sx={{
                              cursor: "pointer",
                              bgcolor: selected ? "action.selected" : "transparent",
                              "&:hover": { bgcolor: "action.hover" },
                              "& > td": { borderBottom: "1px solid", borderColor: "divider", py: 1, px: 1.5 },
                            }}
                          >
                            <Box component="td">
                              <Avatar name={p.name} src={p.profile ? `${API_BASE}${p.profile}` : null} size={40} />
                            </Box>
                            <Box component="td">
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {capitalizeName(p.name)}
                              </Typography>
                            </Box>
                            <Box component="td">
                              <Typography variant="overline" color="text.secondary">
                                {p.registered_on}
                              </Typography>
                            </Box>
                            <Box component="td">
                              {allocated ? (
                                <Chip
                                  size="small"
                                  color="success"
                                  label="Allocated"
                                  icon={<Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "success.main" }} />}
                                  sx={{ "& .MuiChip-icon": { ml: 1 } }}
                                />
                              ) : (
                                <Chip
                                  size="small"
                                  label="Available"
                                  variant="outlined"
                                  icon={<Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "text.disabled" }} />}
                                  sx={{ color: "text.secondary", borderColor: "divider", "& .MuiChip-icon": { ml: 1 } }}
                                />
                              )}
                            </Box>
                            <Box component="td" sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
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
                  onPageSizeChange={(s) => {
                    setPageSize(s);
                    setPage(0);
                  }}
                />
              </Box>
            </Paper>
          </Stack>
        </Grid>

        {/* =====================================================
            RIGHT — INLINE PANEL, `lg` and up only
            ===================================================== */}

        {/* Always rendered — a side column from `lg` up, a full-width
            block stacked under the list below that (same idea as
            swiggy's cart/summary panel dropping under the menu on
            narrower screens instead of disappearing). */}
        <Grid size={{ xs: 12, lg: 4 }} sx={{ minWidth: 0 }}>
          {!panelOpen ? (
            <Paper
              sx={{
                p: { xs: 3, sm: 4 },
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
              <EditNoteIcon sx={{ fontSize: 36, color: "text.disabled" }} />
              <Typography variant="h6" sx={{ mt: 1 }}>
                Select a participant to edit
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Or add a new one. Each participant needs a unique name and an
                optional profile photo.
              </Typography>
              <Button type="button" variant="contained" startIcon={<AddIcon />} onClick={openNew}>
                Add participant
              </Button>
            </Paper>
          ) : (
            panelContent
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

export default ParticipantSection;