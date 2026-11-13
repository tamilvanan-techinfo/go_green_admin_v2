// src/screens/Reports.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckBoxOutlineBlankRoundedIcon from "@mui/icons-material/CheckBoxOutlineBlankRounded";
import CheckBoxRoundedIcon from "@mui/icons-material/CheckBoxRounded";

import BottomSheet from "../../components/BottonSheet";

const API_BASE = "http://127.0.0.1:8000";

const API_URL = `${API_BASE}/export/reports/power-monitor/`;

// IMPORTANT: This path must match your Django urls.py.
const EXCEL_EXPORT_URL =
  `${API_BASE}/export/reports/power-monitor/export/`;

const CYCLES_API_URL =
  `${API_BASE}/api/admin/cycles/`;

const PARTICIPANTS_API_URL =
  `${API_BASE}/api/admin/participants/`;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const CONTROL_HEIGHT = 44;

const COLORS = {
  primary: "#047857",
  primaryDark: "#064E3B",
  primaryLight: "#ECFDF5",
  background: "#F6F8FA",
  border: "#E2E8F0",
  text: "#0F172A",
  muted: "#64748B",
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    minHeight: CONTROL_HEIGHT,
    borderRadius: 2,
    bgcolor: "#FFFFFF",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: COLORS.border,
  },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: COLORS.primary,
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: COLORS.primary,
  },
};

const buttonSx = {
  height: CONTROL_HEIGHT,
  textTransform: "none",
  borderRadius: 2,
  fontWeight: 700,
  px: 2,
  whiteSpace: "nowrap",
};

const numberFormat = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 3,
});

const uncheckedIcon = (
  <CheckBoxOutlineBlankRoundedIcon fontSize="small" />
);

const checkedIcon = (
  <CheckBoxRoundedIcon
    fontSize="small"
    sx={{ color: COLORS.primary }}
  />
);

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? numberFormat.format(number)
    : "—";
}

function formatDate(value) {
  if (!value) return "—";

  const parsed = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function sortOptions(values) {
  return [
    ...new Set(
      values
        .filter(
          (value) =>
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
        )
        .map((value) => String(value).trim())
    ),
  ].sort((a, b) =>
    a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
}

async function fetchMasterList(url, signal) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status}): ${url}`
    );
  }

  const json = await response.json();

  if (json?.success === false || json?.status === false) {
    throw new Error(
      json?.message ||
        json?.error ||
        "Unable to load filter options."
    );
  }

  const candidates = [
    json,
    json?.data,
    json?.results,
    json?.cycles,
    json?.participants,
    json?.data?.results,
    json?.data?.cycles,
    json?.data?.participants,
  ];

  const list = candidates.find(Array.isArray);

  if (!list) {
    throw new Error(
      `Unexpected response format from ${url}`
    );
  }

  return list;
}

function getCycleNumber(item) {
  if (typeof item === "string" || typeof item === "number") {
    return String(item);
  }

  return (
    item?.cycle_no ??
    item?.cycle_number ??
    item?.cycle?.cycle_no ??
    ""
  );
}

function getControllerNumber(item) {
  if (typeof item === "string" || typeof item === "number") {
    return String(item);
  }

  return (
    item?.controller_no ??
    item?.controller_number ??
    item?.cycle?.controller_no ??
    ""
  );
}

function getParticipantName(item) {
  if (typeof item === "string" || typeof item === "number") {
    return String(item);
  }

  return (
    item?.name ??
    item?.participant_name ??
    item?.participent_name ??
    item?.participant?.name ??
    ""
  );
}

/**
 * Multi-select filter.
 *
 * Keep the original Autocomplete params and ref by spreading
 * {...params} directly into TextField.
 *
 * Do not replace params.InputProps, params.inputProps, or the input ref.
 */
function MultiSelectFilter({
  label,
  options = [],
  value = [],
  loading = false,
  onChange,
  disabled = false,
}) {
  const safeOptions = useMemo(
    () =>
      sortOptions(
        Array.isArray(options) ? options : []
      ),
    [options]
  );

  const safeValue = useMemo(
    () =>
      sortOptions(
        Array.isArray(value) ? value : []
      ),
    [value]
  );

  const allOptions = useMemo(
    () =>
      sortOptions([
        ...safeOptions,
        ...safeValue,
      ]),
    [safeOptions, safeValue]
  );

  return (
    <Autocomplete
      multiple
      fullWidth
      disableCloseOnSelect
      openOnFocus
      filterSelectedOptions={false}
      limitTags={2}
      options={allOptions}
      value={safeValue}
      loading={loading}
      disabled={disabled}
      loadingText="Loading options..."
      noOptionsText={
        loading ? "Loading options..." : "No options found"
      }
      onChange={(_, selected) => {
        onChange(selected);
      }}
      getOptionLabel={(option) => String(option)}
      isOptionEqualToValue={(option, selected) =>
        String(option) === String(selected)
      }
      renderOption={(props, option, { selected }) => (
        <li {...props} key={String(option)}>
          <Checkbox
            icon={uncheckedIcon}
            checkedIcon={checkedIcon}
            checked={selected}
            size="small"
            sx={{ mr: 1 }}
            tabIndex={-1}
          />

          <Typography variant="body2">
            {String(option)}
          </Typography>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={
            safeValue.length
              ? ""
              : `Select ${label.toLowerCase()}...`
          }
          size="small"
          sx={fieldSx}
        />
      )}
      slotProps={{
        popper: {
          sx: {
            zIndex: 999999,
          },
        },
        listbox: {
          sx: {
            maxHeight: 320,
          },
        },
      }}
      sx={{
        width: "100%",
        "& .MuiOutlinedInput-root": {
          minHeight: 48,
          borderRadius: 2,
          bgcolor: "#FFFFFF",
        },
        "& .MuiAutocomplete-tag": {
          maxWidth: 180,
        },
      }}
    />
  );
}

function getDownloadFilename(response) {
  const disposition = response.headers.get(
    "content-disposition"
  );

  if (disposition) {
    const utf8Match = disposition.match(
      /filename\*=UTF-8''([^;]+)/i
    );

    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch {
        // Use the normal filename fallback below.
      }
    }

    const normalMatch = disposition.match(
      /filename="?([^";]+)"?/i
    );

    if (normalMatch?.[1]) {
      return normalMatch[1];
    }
  }

  return "power_monitor_report.xlsx";
}

async function readDownloadError(response) {
  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const data = await response.json();

      return (
        data?.error ||
        data?.message ||
        `Excel export failed (${response.status}).`
      );
    } catch {
      // Use the fallback below.
    }
  }

  try {
    const text = await response.text();

    if (text) return text;
  } catch {
    // Use the fallback below.
  }

  return `Excel export failed (${response.status}).`;
}

function CycleParticipantReport({ open, onClose }) {
  const [rows, setRows] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [participants, setParticipants] = useState([]);
  const [cycleNos, setCycleNos] = useState([]);
  const [controllerNos, setControllerNos] = useState([]);

  const [participantOptions, setParticipantOptions] = useState([]);
  const [cycleOptions, setCycleOptions] = useState([]);
  const [controllerOptions, setControllerOptions] = useState([]);

  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState("");

  // ---------------------------------------------------------
  // Load participant and cycle filter options
  // ---------------------------------------------------------
  useEffect(() => {
    if (!open) return undefined;

    const controller = new AbortController();

    async function loadOptions() {
      setOptionsLoading(true);
      setOptionsError("");

      try {
        const [cycles, participantRecords] = await Promise.all([
          fetchMasterList(
            CYCLES_API_URL,
            controller.signal
          ),
          fetchMasterList(
            PARTICIPANTS_API_URL,
            controller.signal
          ),
        ]);

        setCycleOptions(
          sortOptions(cycles.map(getCycleNumber))
        );

        setControllerOptions(
          sortOptions(cycles.map(getControllerNumber))
        );

        setParticipantOptions(
          sortOptions(participantRecords.map(getParticipantName))
        );
      } catch (err) {
        if (err.name === "AbortError") return;

        console.error(
          "Unable to load report filter options:",
          err
        );

        setOptionsError(
          err.message || "Unable to load filter options."
        );
      } finally {
        if (!controller.signal.aborted) {
          setOptionsLoading(false);
        }
      }
    }

    loadOptions();

    return () => controller.abort();
  }, [open]);

  // ---------------------------------------------------------
  // Debounce search
  // ---------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // ---------------------------------------------------------
  // Build query string
  //
  // Repeated filters remain repeated query parameters:
  // participants=Bradd&participants=ganga
  // ---------------------------------------------------------
  const buildQuery = useCallback(
    (includePagination = true) => {
      const params = new URLSearchParams();

      if (search) {
        params.set("search", search);
      }

      participants.forEach((participant) => {
        params.append("participants", participant);
      });

      cycleNos.forEach((cycle) => {
        params.append("cycle_nos", cycle);
      });

      controllerNos.forEach((controller) => {
        params.append("controller_nos", controller);
      });

      if (startDate) {
        params.set("start_date", startDate);
      }

      if (endDate) {
        params.set("end_date", endDate);
      }

      // Report API uses pagination.
      // Excel API deliberately does not use pagination,
      // because the backend exports ALL matching records.
      if (includePagination) {
        params.set("page", String(page + 1));
        params.set("page_size", String(pageSize));
      }

      return params.toString();
    },
    [
      search,
      participants,
      cycleNos,
      controllerNos,
      startDate,
      endDate,
      page,
      pageSize,
    ]
  );

  // ---------------------------------------------------------
  // Fetch paginated report
  // ---------------------------------------------------------
  const fetchReport = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");
      setExportSuccess("");

      try {
        const query = buildQuery(true);

        const url = query
          ? `${API_URL}?${query}`
          : API_URL;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal,
        });

        if (!response.ok) {
          throw new Error(
            `Unable to load report. Server returned ${response.status}.`
          );
        }

        const data = await response.json();

        if (data.success === false) {
          throw new Error(
            data.error || "The report request failed."
          );
        }

        if (!Array.isArray(data.results)) {
          throw new Error(
            "Unexpected report response. Expected a results array."
          );
        }

        setRows(data.results);
        setTotalCount(Number(data.count) || 0);

        console.log("View report:", {
          filters: {
            search,
            participants,
            cycleNos,
            controllerNos,
            startDate,
            endDate,
          },
          count: Number(data.count) || 0,
          returned: data.results.length,
        });
      } catch (err) {
        if (err.name === "AbortError") return;

        setRows([]);
        setTotalCount(0);

        setError(
          err.message ||
            "Unable to load report. Check your backend connection."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [
      buildQuery,
      search,
      participants,
      cycleNos,
      controllerNos,
      startDate,
      endDate,
    ]
  );

  // Reload when filters, page, or page size change.
  useEffect(() => {
    if (!open) return undefined;

    const controller = new AbortController();

    fetchReport(controller.signal);

    return () => controller.abort();
  }, [open, fetchReport, page, pageSize]);

  // ---------------------------------------------------------
  // Reset filters
  // ---------------------------------------------------------
  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setParticipants([]);
    setCycleNos([]);
    setControllerNos([]);
    setStartDate("");
    setEndDate("");
    setPage(0);
    setError("");
    setExportSuccess("");
  };

  // ---------------------------------------------------------
  // Refresh
  // ---------------------------------------------------------
  const handleRefresh = () => {
    const controller = new AbortController();

    fetchReport(controller.signal);
  };

  // ---------------------------------------------------------
  // Download Excel from Django
  //
  // This downloads the backend-generated Excel file.
  // It does NOT create an Excel file from the current page.
  // ---------------------------------------------------------
  const handleExportExcel = async () => {
    setExporting(true);
    setError("");
    setExportSuccess("");

    try {
      // Do not include page/page_size here.
      // The Django export view exports all filtered records.
      const query = buildQuery(false);

      const url = query
        ? `${EXCEL_EXPORT_URL}?${query}`
        : EXCEL_EXPORT_URL;

      console.log("Downloading Excel from:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json",
        },
      });

      if (!response.ok) {
        const message = await readDownloadError(response);

        throw new Error(message);
      }

      const contentType =
        response.headers.get("content-type") || "";

      // Django may return JSON if an error occurs.
      if (contentType.includes("application/json")) {
        const message = await readDownloadError(response);

        throw new Error(message);
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error(
          "The Excel file returned by the server is empty."
        );
      }

      const filename = getDownloadFilename(response);
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();

      // Revoke after the browser has started the download.
      window.setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);

      setExportSuccess(
        "Excel report downloaded successfully."
      );
    } catch (err) {
      console.error("Excel download failed:", err);

      setError(
        err.message ||
          "Unable to download the Excel report."
      );
    } finally {
      setExporting(false);
    }
  };

  const activeFilterCount = [
    search,
    ...participants,
    ...cycleNos,
    ...controllerNos,
    startDate,
    endDate,
  ].filter(Boolean).length;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Cycle Participant Report"
      height="100vh"
    >
      <Box
        sx={{
          height: "100%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          bgcolor: COLORS.background,
          color: COLORS.text,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            p: { xs: 2, md: 3 },
          }}
        >
          {/* FILTER PANEL */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
              mb: 2.5,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 3,
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
              spacing={1.5}
              sx={{ mb: 2.5 }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
              >
                <FilterAltOutlinedIcon
                  sx={{ color: COLORS.primary }}
                />

                <Typography sx={{ fontWeight: 800 }}>
                  Search and filters
                </Typography>

                {activeFilterCount > 0 && (
                  <Chip
                    size="small"
                    label={`${activeFilterCount} active`}
                    sx={{
                      bgcolor: COLORS.primaryLight,
                      color: COLORS.primaryDark,
                      fontWeight: 700,
                    }}
                  />
                )}
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  flexWrap: "wrap",
                  justifyContent: {
                    xs: "flex-start",
                    sm: "flex-end",
                  },
                }}
              >
                <Tooltip title="Reload report data">
                  <span>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshRoundedIcon />}
                      onClick={handleRefresh}
                      disabled={loading}
                      sx={{
                        ...buttonSx,
                        borderColor: COLORS.border,
                        color: COLORS.text,
                      }}
                    >
                      Refresh
                    </Button>
                  </span>
                </Tooltip>

                <Button
                  variant="contained"
                  startIcon={
                    exporting ? (
                      <CircularProgress
                        size={16}
                        color="inherit"
                      />
                    ) : (
                      <FileDownloadRoundedIcon />
                    )
                  }
                  onClick={handleExportExcel}
                  disabled={exporting}
                  sx={{
                    ...buttonSx,
                    bgcolor: COLORS.primary,
                    boxShadow: "none",
                    "&:hover": {
                      bgcolor: COLORS.primaryDark,
                      boxShadow: "none",
                    },
                  }}
                >
                  {exporting ? "Downloading..." : "Download Excel"}
                </Button>

                <Button
                  variant="text"
                  startIcon={<CloseRoundedIcon />}
                  onClick={resetFilters}
                  disabled={!activeFilterCount}
                  sx={{
                    ...buttonSx,
                    color: COLORS.muted,
                  }}
                >
                  Clear
                </Button>
              </Stack>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  xl: "repeat(3, minmax(0, 1fr))",
                },
                alignItems: "start",
                gap: 2,
              }}
            >
              <TextField
                fullWidth
                size="small"
                label="Search report"
                placeholder="Name, email, phone..."
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                }}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon
                          sx={{ color: COLORS.muted }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={fieldSx}
              />

              <MultiSelectFilter
                label="Participants"
                options={participantOptions}
                value={participants}
                loading={optionsLoading}
                onChange={(selected) => {
                  setParticipants(selected);
                  setPage(0);
                }}
              />

              <MultiSelectFilter
                label="Cycle numbers"
                options={cycleOptions}
                value={cycleNos}
                loading={optionsLoading}
                onChange={(selected) => {
                  setCycleNos(selected);
                  setPage(0);
                }}
              />

              <MultiSelectFilter
                label="Controller numbers"
                options={controllerOptions}
                value={controllerNos}
                loading={optionsLoading}
                onChange={(selected) => {
                  setControllerNos(selected);
                  setPage(0);
                }}
              />

              <TextField
                fullWidth
                size="small"
                type="date"
                label="Start date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPage(0);
                }}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                  htmlInput: {
                    max: endDate || undefined,
                  },
                }}
                sx={fieldSx}
              />

              <TextField
                fullWidth
                size="small"
                type="date"
                label="End date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPage(0);
                }}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                  htmlInput: {
                    min: startDate || undefined,
                  },
                }}
                sx={fieldSx}
              />
            </Box>

            {optionsLoading && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mt: 2 }}
              >
                <CircularProgress size={14} />

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Loading participants, cycles, and controllers...
                </Typography>
              </Stack>
            )}

            {optionsError && (
              <Alert
                severity="error"
                sx={{ mt: 2, borderRadius: 2 }}
              >
                {optionsError}
              </Alert>
            )}

            {error && (
              <Alert
                severity="error"
                sx={{ mt: 2, borderRadius: 2 }}
                onClose={() => setError("")}
              >
                {error}
              </Alert>
            )}

            {exportSuccess && (
              <Alert
                severity="success"
                sx={{ mt: 2, borderRadius: 2 }}
                onClose={() => setExportSuccess("")}
              >
                {exportSuccess}
              </Alert>
            )}

            {(participants.length > 0 ||
              cycleNos.length > 0 ||
              controllerNos.length > 0) && (
              <Stack
                direction="row"
                useFlexGap
                spacing={1}
                alignItems="center"
                sx={{
                  mt: 2,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Selected:
                </Typography>

                {participants.map((item) => (
                  <Chip
                    key={`participant-${item}`}
                    size="small"
                    label={`Participant: ${item}`}
                    onDelete={() =>
                      setParticipants((previous) =>
                        previous.filter(
                          (value) => value !== item
                        )
                      )
                    }
                  />
                ))}

                {cycleNos.map((item) => (
                  <Chip
                    key={`cycle-${item}`}
                    size="small"
                    label={`Cycle: ${item}`}
                    onDelete={() =>
                      setCycleNos((previous) =>
                        previous.filter(
                          (value) => value !== item
                        )
                      )
                    }
                  />
                ))}

                {controllerNos.map((item) => (
                  <Chip
                    key={`controller-${item}`}
                    size="small"
                    label={`Controller: ${item}`}
                    onDelete={() =>
                      setControllerNos((previous) =>
                        previous.filter(
                          (value) => value !== item
                        )
                      )
                    }
                  />
                ))}
              </Stack>
            )}

            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                mt: 2,
                color: COLORS.muted,
              }}
            >
              <CalendarMonthRoundedIcon fontSize="small" />

              <Typography variant="body2">
                {startDate || endDate
                  ? `${startDate || "Any date"} — ${endDate || "Any date"}`
                  : "All available dates"}
              </Typography>
            </Stack>
          </Paper>

          {/* REPORT TABLE */}
          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${COLORS.border}`,
              borderRadius: 3,
              overflow: "hidden",
              bgcolor: "#FFFFFF",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
              sx={{
                px: 2.5,
                py: 2,
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 800 }}>
                  Power monitor records
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Showing {rows.length} of{" "}
                  {numberFormat.format(totalCount)} matching records
                </Typography>
              </Box>

              <Chip
                icon={<SensorsRoundedIcon />}
                label={loading ? "Loading" : "Report data"}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: COLORS.border,
                  fontWeight: 600,
                }}
              />
            </Stack>

            <Divider sx={{ borderColor: COLORS.border }} />

            <TableContainer
              sx={{
                maxHeight: "calc(100vh - 560px)",
                minHeight: 260,
                overflow: "auto",
              }}
            >
              <Table
                stickyHeader
                size="small"
                sx={{
                  minWidth: 1450,
                  "& .MuiTableCell-root": {
                    borderBottom: "1px solid #EDF1F5",
                    py: 1.5,
                    px: 2,
                    whiteSpace: "nowrap",
                    verticalAlign: "middle",
                  },
                  "& .MuiTableHead-root .MuiTableCell-root": {
                    bgcolor: "#F8FAFC",
                    color: "#475569",
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  },
                  "& .MuiTableBody-root .MuiTableRow-root:hover": {
                    bgcolor: "#F8FCFA",
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Participant</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Cycle</TableCell>
                    <TableCell>Controller</TableCell>
                    <TableCell align="right">
                      Current power
                    </TableCell>
                    <TableCell align="right">
                      Current voltage
                    </TableCell>
                    <TableCell align="right">
                      Current amp
                    </TableCell>
                    <TableCell align="right">
                      Total power
                    </TableCell>
                    <TableCell align="right">
                      Total voltage
                    </TableCell>
                    <TableCell align="right">
                      Total amp
                    </TableCell>
                    <TableCell>Last updated</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={13} align="center">
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                          justifyContent="center"
                          sx={{ py: 7 }}
                        >
                          <CircularProgress
                            size={22}
                            sx={{ color: COLORS.primary }}
                          />

                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            Loading report data...
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} align="center">
                        <Stack
                          alignItems="center"
                          sx={{ py: 8 }}
                        >
                          <Avatar
                            sx={{
                              width: 54,
                              height: 54,
                              mb: 1.5,
                              bgcolor: COLORS.primaryLight,
                              color: COLORS.primary,
                            }}
                          >
                            <SearchRoundedIcon />
                          </Avatar>

                          <Typography sx={{ fontWeight: 700 }}>
                            No records found
                          </Typography>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.5 }}
                          >
                            Try changing the search terms or filters.
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: COLORS.muted,
                              fontWeight: 700,
                            }}
                          >
                            #{row.id}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <Avatar
                              sx={{
                                width: 30,
                                height: 30,
                                bgcolor: COLORS.primaryLight,
                                color: COLORS.primaryDark,
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {(row.participant || "?")
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </Avatar>

                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                color: COLORS.text,
                              }}
                            >
                              {row.participant || "Unknown"}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell>{row.email || "—"}</TableCell>
                        <TableCell>{row.phone || "—"}</TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={row.cycle_no || "—"}
                            sx={{
                              bgcolor: "#F1F5F9",
                              color: "#334155",
                              fontWeight: 700,
                              borderRadius: 1.5,
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                          >
                            {row.controller_no || "—"}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          {formatNumber(row.current_power)}
                        </TableCell>

                        <TableCell align="right">
                          {formatNumber(row.current_voltage)}
                        </TableCell>

                        <TableCell align="right">
                          {formatNumber(row.current_amperage)}
                        </TableCell>

                        <TableCell align="right">
                          {formatNumber(row.total_power)}
                        </TableCell>

                        <TableCell align="right">
                          {formatNumber(row.total_voltage)}
                        </TableCell>

                        <TableCell align="right">
                          {formatNumber(row.total_amperage)}
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            {formatDate(row.updated_at)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ borderColor: COLORS.border }} />

            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(_, newPage) => {
                setPage(newPage);
              }}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={PAGE_SIZE_OPTIONS}
              disabled={loading}
              sx={{
                "& .MuiTablePagination-toolbar": {
                  flexWrap: "wrap",
                  px: 2,
                  py: 1,
                  gap: 1,
                },
              }}
            />
          </Paper>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              mt: 2,
              textAlign: "right",
            }}
          >
            Go Green Admin · Cycle Participant Reporting
          </Typography>
        </Box>
      </Box>
    </BottomSheet>
  );
}

export default CycleParticipantReport;