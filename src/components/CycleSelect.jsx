
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import CheckBoxOutlineBlankRoundedIcon from "@mui/icons-material/CheckBoxOutlineBlankRounded";
import CheckBoxRoundedIcon from "@mui/icons-material/CheckBoxRounded";

const CYCLES_API_URL = "http://127.0.0.1:8000/api/admin/cycles/";

// Keep the dropdown above BottomSheet, Dialog, and Drawer layers.
const POPPER_Z_INDEX = 999999;

const COLORS = {
  primary: "#047857",
  primaryDark: "#064E3B",
  primaryLight: "#ECFDF5",
  border: "#CBD5E1",
  muted: "#64748B",
};

const uncheckedIcon = <CheckBoxOutlineBlankRoundedIcon fontSize="small" />;
const checkedIcon = (
  <CheckBoxRoundedIcon
    fontSize="small"
    sx={{ color: COLORS.primary }}
  />
);

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function cycleNumberKey(cycleNo) {
  const match = String(cycleNo ?? "").match(/\d+/);
  return match ? match[0] : null;
}

function buildCycleOptions(rows) {
  const byCycleNo = new Map();

  rows.forEach((row) => {
    const cycleNo = String(row?.cycle_no ?? "").trim();

    if (!cycleNo || byCycleNo.has(cycleNo)) return;

    byCycleNo.set(cycleNo, {
      cycle_no: cycleNo,
      controller_no: String(row?.controller_no ?? "").trim(),
    });
  });

  return [...byCycleNo.values()].sort((a, b) =>
    collator.compare(a.cycle_no, b.cycle_no)
  );
}

function findLikelyDuplicates(options) {
  const groups = new Map();

  options.forEach((option) => {
    const key = cycleNumberKey(option.cycle_no);

    if (!key) return;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(option.cycle_no);
  });

  return [...groups.values()].filter((names) => names.length > 1);
}

export default function CycleSelect({
  open = true,
  value = [],
  onChange,
  label = "Cycle numbers",
  disabled = false,
  popperZIndex = POPPER_Z_INDEX,
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;

    const controller = new AbortController();

    async function loadCycles() {
      setLoading(true);
      setError("");

      try {
        console.log("[CycleSelect] Fetching cycles:", CYCLES_API_URL);

        const response = await fetch(CYCLES_API_URL, {
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        console.log("[CycleSelect] Response status:", response.status);

        if (!response.ok) {
          throw new Error(
            `Unable to load cycles. Server returned ${response.status}.`
          );
        }

        const json = await response.json();

        console.log("[CycleSelect] API response:", json);

        if (json?.status === false || json?.success === false) {
          throw new Error(
            json?.message ||
              json?.error ||
              "Unable to load cycles."
          );
        }

        const rows = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json?.results)
              ? json.results
              : Array.isArray(json?.data?.results)
                ? json.data.results
                : [];

        const cycleOptions = buildCycleOptions(rows);

        console.log(
          "[CycleSelect] Cycle options loaded:",
          cycleOptions.length,
          cycleOptions
        );

        setOptions(cycleOptions);
      } catch (err) {
        if (err.name === "AbortError") return;

        console.error("[CycleSelect] Failed to load cycles:", err);

        setOptions([]);
        setError(err.message || "Unable to load cycles.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCycles();

    return () => controller.abort();
  }, [open]);

  const safeValue = useMemo(
    () =>
      (Array.isArray(value) ? value : [])
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    [value]
  );

  const duplicateGroups = useMemo(
    () => findLikelyDuplicates(options),
    [options]
  );

  // Preserve selected values even before the options API has finished loading.
  const selectedOptions = useMemo(() => {
    return safeValue.map(
      (cycleNo) =>
        options.find((option) => option.cycle_no === cycleNo) || {
          cycle_no: cycleNo,
          controller_no: "",
        }
    );
  }, [safeValue, options]);

  return (
    <Stack spacing={1} sx={{ width: "100%", minWidth: 0 }}>
      <Autocomplete
        multiple
        fullWidth
        disablePortal={false}
        disableCloseOnSelect
        openOnFocus
        filterSelectedOptions={false}
        disabled={disabled}
        options={options}
        value={selectedOptions}
        loading={loading}
        limitTags={2}
        loadingText="Loading cycles..."
        noOptionsText={
          loading ? "Loading cycles..." : "No cycles available"
        }
        getOptionLabel={(option) => String(option?.cycle_no ?? "")}
        isOptionEqualToValue={(option, selected) =>
          option.cycle_no === selected.cycle_no
        }
        onChange={(_, selected) => {
          const nextValue = selected.map((option) => option.cycle_no);

          console.log("[CycleSelect] Selected cycles:", nextValue);

          onChange?.(nextValue);
        }}
        renderOption={(props, option, { selected }) => {
          const { key, ...optionProps } = props;

          return (
            <Box
              component="li"
              key={key ?? option.cycle_no}
              {...optionProps}
              sx={{
                minHeight: 44,
                px: 1.5,
                gap: 1,
                display: "flex",
                alignItems: "center",
                "&:hover": {
                  bgcolor: `${COLORS.primaryLight} !important`,
                },
                "&[aria-selected='true']": {
                  bgcolor: `${COLORS.primaryLight} !important`,
                },
              }}
            >
              <Checkbox
                checked={selected}
                icon={uncheckedIcon}
                checkedIcon={checkedIcon}
                size="small"
                sx={{ p: 0.25 }}
                tabIndex={-1}
                disableRipple
              />

              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {option.cycle_no}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  Controller {option.controller_no || "—"}
                </Typography>
              </Box>
            </Box>
          );
        }}
        renderTags={(selected, getTagProps) =>
          selected.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });

            return (
              <Chip
                key={key ?? option.cycle_no}
                {...tagProps}
                label={option.cycle_no}
                size="small"
                sx={{
                  maxWidth: 160,
                  borderRadius: 1.5,
                  bgcolor: COLORS.primaryLight,
                  color: COLORS.primaryDark,
                  fontWeight: 600,
                  fontSize: 11,
                  "& .MuiChip-deleteIcon": {
                    color: COLORS.primary,
                    fontSize: 16,
                  },
                }}
              />
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            size="small"
            placeholder={
              selectedOptions.length > 0
                ? ""
                : "Select one or more cycles..."
            }
            // Do not replace params.InputProps or params.inputProps.
            // Autocomplete supplies refs and handlers through these props.
            slotProps={{
              ...params.slotProps,
              inputLabel: {
                ...params.slotProps?.inputLabel,
                shrink: true,
              },
            }}
          />
        )}
        slotProps={{
          popper: {
            sx: {
              zIndex: popperZIndex,
              "& .MuiAutocomplete-paper": {
                zIndex: popperZIndex,
                borderRadius: 2,
                boxShadow: "0 12px 35px rgba(15, 23, 42, 0.18)",
              },
            },
          },
          listbox: {
            sx: {
              maxHeight: 280,
              overflowY: "auto",
              py: 0.5,
              "& .MuiAutocomplete-option": {
                minHeight: 44,
              },
            },
          },
        }}
        sx={{
          width: "100%",
          minWidth: 0,
          "& .MuiOutlinedInput-root": {
            minHeight: 44,
            borderRadius: 2,
            bgcolor: "#FFFFFF",
            "& fieldset": {
              borderColor: COLORS.border,
            },
            "&:hover fieldset": {
              borderColor: COLORS.primary,
            },
            "&.Mui-focused fieldset": {
              borderColor: COLORS.primary,
              borderWidth: 1,
            },
          },
        }}
      />

      {loading && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={14} sx={{ color: COLORS.primary }} />
          <Typography variant="caption" color="text.secondary">
            Loading cycle options...
          </Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {duplicateGroups.length > 0 && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Some cycles may be duplicates:{" "}
          {duplicateGroups.map((names) => names.join(" / ")).join(", ")}.
          Fix these in the database so each cycle has one name.
        </Alert>
      )}
    </Stack>
  );
}
