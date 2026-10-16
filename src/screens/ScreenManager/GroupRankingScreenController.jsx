
import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import BottomSheet from "../../components/BottonSheet";
import api from "../../config.json";
import theme from "../../core/theme";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE = `${api.apiBase}/api`;

const PARTICIPANT_CYCLES_URL =
  `${API_BASE}/admin/participant-cycles/`;

const GROUP_URL = `${API_BASE}/group/`;

/* =========================================================
   THEME COLORS
========================================================= */

const COLORS = {
  primary: theme?.palette?.primary?.main || "#064E3B",
  primaryLight: theme?.palette?.primary?.light || "#047857",
  primaryDark: theme?.palette?.primary?.dark || "#043D2E",
  background: theme?.palette?.background?.default || "#EFF1FF",
  paper: theme?.palette?.background?.paper || "#FFFFFF",
  text: theme?.palette?.text?.primary || "#0F172A",
  secondaryText: theme?.palette?.text?.secondary || "#475569",
  divider: theme?.palette?.divider || "#D9DEEE",
  success: theme?.palette?.success?.main || "#10B981",
  error: theme?.palette?.error?.main || "#DC2626",
  info: theme?.palette?.info?.main || "#2563EB",
};

/* =========================================================
   SELECT MENU Z-INDEX
   Dropdown menus must appear above the BottomSheet.
========================================================= */

const SELECT_MENU_PROPS = {
  disablePortal: false,
  sx: {
    zIndex: 100001,
  },
  PaperProps: {
    elevation: 12,
    sx: {
      zIndex: 100001,
      maxHeight: 320,
      borderRadius: 2,
      mt: 0.5,
      "& .MuiMenuItem-root": {
        whiteSpace: "normal",
        py: 1,
      },
    },
  },
};

/* =========================================================
   HELPERS
========================================================= */

const getParticipantId = (participant) =>
  participant?.id ?? participant?.cycle_id;

const getMemberId = (member) =>
  member?.cycle_id ?? member?.id;

const getParticipantName = (participant) =>
  participant?.participent_name ||
  participant?.participant_name ||
  participant?.name ||
  "Unknown participant";

const getParticipantDescription = (participant) => {
  const cycle = participant?.cycle_no ?? "—";
  const controller = participant?.controller_no ?? "—";

  return `Cycle ${cycle} / Controller ${controller}`;
};

const getErrorMessage = (error, fallback) =>
  error instanceof Error ? error.message : fallback;

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  let result = {};

  if (contentType.includes("application/json")) {
    result = await response.json();
  } else {
    const message = await response.text();
    result = { message };
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
        result?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return result;
}

/* =========================================================
   REUSABLE SECTION HEADER
========================================================= */

function SectionHeader({ icon, title, subtitle, action }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={2}
      sx={{
        flexWrap: "wrap",
        rowGap: 1.5,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          minWidth: 0,
          flex: 1,
        }}
      >
        <Avatar
          variant="rounded"
          sx={{
            width: 40,
            height: 40,
            bgcolor: "#E7F5EE",
            color: COLORS.primary,
            borderRadius: 2,
            flexShrink: 0,
          }}
        >
          {icon}
        </Avatar>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 15,
              fontWeight: 800,
              color: COLORS.text,
              lineHeight: 1.5,
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              sx={{
                fontSize: 12,
                color: COLORS.secondaryText,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>

      {action}
    </Stack>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

function GroupRankingScreenController({
  isOpened = true,
  setControlFor,
}) {
  /* -------------------------------------------------------
     STATE
  ------------------------------------------------------- */

  const [participantCycles, setParticipantCycles] = useState([]);
  const [groups, setGroups] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const [renameDrafts, setRenameDrafts] = useState({});
  const [addDrafts, setAddDrafts] = useState({});
  const [moveDrafts, setMoveDrafts] = useState({});

  /* -------------------------------------------------------
     LOAD PARTICIPANT CYCLES
  ------------------------------------------------------- */

  const fetchParticipantCycles = useCallback(async () => {
    const response = await fetch(PARTICIPANT_CYCLES_URL);
    const result = await parseResponse(response);

    if (result?.status === false) {
      throw new Error(
        result?.message || "Failed to fetch participant cycles."
      );
    }

    const rows = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : [];

    setParticipantCycles(rows);
  }, []);

  /* -------------------------------------------------------
     LOAD GROUPS
  ------------------------------------------------------- */

  const fetchGroups = useCallback(async () => {
    const response = await fetch(GROUP_URL);
    const result = await parseResponse(response);

    const rows = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : [];

    const normalizedGroups = rows.map((group) => ({
      ...group,
      members: Array.isArray(group.members) ? group.members : [],
    }));

    setGroups(normalizedGroups);

    setSelectedGroupId((currentId) => {
      if (
        currentId != null &&
        normalizedGroups.some(
          (group) => String(group.id) === String(currentId)
        )
      ) {
        return currentId;
      }

      return normalizedGroups[0]?.id ?? null;
    });
  }, []);

  /* -------------------------------------------------------
     LOAD ALL DATA
  ------------------------------------------------------- */

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await Promise.all([
        fetchParticipantCycles(),
        fetchGroups(),
      ]);
    } catch (err) {
      setError(
        getErrorMessage(err, "Failed to load group information.")
      );
    } finally {
      setLoading(false);
    }
  }, [fetchParticipantCycles, fetchGroups]);

  useEffect(() => {
    if (isOpened) {
      loadAll();
    }
  }, [isOpened, loadAll]);

  /* -------------------------------------------------------
     SELECTED GROUP
  ------------------------------------------------------- */

  const selectedGroup = useMemo(
    () =>
      groups.find(
        (group) => String(group.id) === String(selectedGroupId)
      ) || null,
    [groups, selectedGroupId]
  );

  /* -------------------------------------------------------
     ALLOCATED PARTICIPANTS
  ------------------------------------------------------- */

  const allocatedCycleIds = useMemo(() => {
    const ids = new Set();

    groups.forEach((group) => {
      group.members.forEach((member) => {
        const id = getMemberId(member);

        if (id != null) {
          ids.add(String(id));
        }
      });
    });

    return ids;
  }, [groups]);

  const unallocatedParticipants = useMemo(
    () =>
      participantCycles.filter((participant) => {
        const id = getParticipantId(participant);

        return (
          id != null &&
          !allocatedCycleIds.has(String(id))
        );
      }),
    [participantCycles, allocatedCycleIds]
  );

  /* -------------------------------------------------------
     FILTER GROUPS
  ------------------------------------------------------- */

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return groups;

    return groups.filter((group) =>
      String(group.name || "")
        .toLowerCase()
        .includes(query)
    );
  }, [groups, search]);

  /* -------------------------------------------------------
     RESET MESSAGES
  ------------------------------------------------------- */

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  /* -------------------------------------------------------
     GENERIC API ACTION
  ------------------------------------------------------- */

  const performAction = async (
    action,
    successMessage,
    shouldReload = true
  ) => {
    setSaving(true);
    clearMessages();

    try {
      await action();

      if (shouldReload) {
        await Promise.all([
          fetchParticipantCycles(),
          fetchGroups(),
        ]);
      }

      setSuccess(successMessage);
      return true;
    } catch (err) {
      setError(
        getErrorMessage(err, "The operation could not be completed.")
      );

      return false;
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------------------------------
     CREATE GROUP
  ------------------------------------------------------- */

  const createGroup = async () => {
    const name = newGroupName.trim();

    if (!name) {
      setError("Please enter a group name.");
      return;
    }

    const created = await performAction(
      async () => {
        const response = await fetch(GROUP_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            member_ids: selectedMemberIds,
          }),
        });

        await parseResponse(response);
      },
      "Group created successfully."
    );

    if (created) {
      setNewGroupName("");
      setSelectedMemberIds([]);
    }
  };

  /* -------------------------------------------------------
     RENAME GROUP
  ------------------------------------------------------- */

  const renameGroup = async (groupId) => {
    const name = String(renameDrafts[groupId] ?? "").trim();

    if (!name) {
      setError("Please enter a valid group name.");
      return;
    }

    const renamed = await performAction(
      async () => {
        const response = await fetch(GROUP_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            group_id: groupId,
            name,
          }),
        });

        await parseResponse(response);
      },
      "Group name updated successfully."
    );

    if (renamed) {
      setRenameDrafts((previous) => {
        const next = { ...previous };
        delete next[groupId];
        return next;
      });
    }
  };

  /* -------------------------------------------------------
     DELETE GROUP
  ------------------------------------------------------- */

  const deleteGroup = async (groupId) => {
    const group = groups.find(
      (item) => String(item.id) === String(groupId)
    );

    if (!group) return;

    const confirmed = window.confirm(
      `Delete "${group.name}"? This operation may remove the group's allocations.`
    );

    if (!confirmed) return;

    await performAction(
      async () => {
        const response = await fetch(GROUP_URL, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            group_id: groupId,
          }),
        });

        await parseResponse(response);
      },
      "Group deleted successfully."
    );
  };

  /* -------------------------------------------------------
     ADD PARTICIPANT
  ------------------------------------------------------- */

  const addMember = async (groupId) => {
    const cycleId = addDrafts[groupId];

    if (cycleId == null || cycleId === "") {
      setError("Select a participant to add.");
      return;
    }

    const added = await performAction(
      async () => {
        const response = await fetch(GROUP_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            group_id: groupId,
            cycle_id: Number(cycleId),
          }),
        });

        await parseResponse(response);
      },
      "Participant added successfully."
    );

    if (added) {
      setAddDrafts((previous) => ({
        ...previous,
        [groupId]: "",
      }));
    }
  };

  /* -------------------------------------------------------
     REMOVE PARTICIPANT
  ------------------------------------------------------- */

  const removeMember = async (groupId, cycleId) => {
    const confirmed = window.confirm(
      "Remove this participant from the group?"
    );

    if (!confirmed) return;

    await performAction(
      async () => {
        const response = await fetch(GROUP_URL, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            group_id: groupId,
            cycle_id: cycleId,
          }),
        });

        await parseResponse(response);
      },
      "Participant removed successfully."
    );
  };

  /* -------------------------------------------------------
     MOVE PARTICIPANT
  ------------------------------------------------------- */

  const moveMember = async (fromGroupId, cycleId) => {
    const targetGroupId = moveDrafts[cycleId];

    if (
      targetGroupId == null ||
      targetGroupId === "" ||
      String(targetGroupId) === String(fromGroupId)
    ) {
      return;
    }

    const moved = await performAction(
      async () => {
        const response = await fetch(GROUP_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            group_id: fromGroupId,
            target_group_id: Number(targetGroupId),
            cycle_id: cycleId,
          }),
        });

        await parseResponse(response);
      },
      "Participant moved successfully."
    );

    if (moved) {
      setMoveDrafts((previous) => ({
        ...previous,
        [cycleId]: "",
      }));
    }
  };

  /* -------------------------------------------------------
     CLOSE BOTTOM SHEET
  ------------------------------------------------------- */

  const handleClose = () => {
    if (typeof setControlFor === "function") {
      setControlFor(false);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <BottomSheet
      title="Group Participant Control"
      open={isOpened}
      onClose={handleClose}
      height="92vh"
      width="90%"
    >
      <Box
        sx={{
          width: "100%",
          minWidth: 0,
          minHeight: "100%",
          p: { xs: 1.5, sm: 2, md: 3 },
          boxSizing: "border-box",
          bgcolor: COLORS.background,
          fontFamily: "Inter, sans-serif",
          overflow: "visible",
        }}
      >
        {/* FEEDBACK */}

        {error && (
          <Alert
            severity="error"
            onClose={() => setError("")}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            onClose={() => setSuccess("")}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            {success}
          </Alert>
        )}

        {/* CREATE GROUP */}

        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2.5 },
            mb: 3,
            border: `1px solid ${COLORS.divider}`,
            borderRadius: 3,
            bgcolor: COLORS.paper,
            boxSizing: "border-box",
            overflow: "visible",
          }}
        >
          <SectionHeader
            icon={<AddRoundedIcon />}
            title="Create a Group"
            subtitle="Create a group and optionally allocate participants."
          />

          <Divider sx={{ my: 2, borderColor: COLORS.divider }} />

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "flex-start" }}
            sx={{ overflow: "visible" }}
          >
            <TextField
              label="Group name"
              placeholder="Enter a group name"
              size="small"
              fullWidth
              value={newGroupName}
              onChange={(event) =>
                setNewGroupName(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  createGroup();
                }
              }}
              sx={{
                flex: 1,
                minWidth: 0,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            />

            <FormControl
              size="small"
              fullWidth
              sx={{
                flex: 1.5,
                minWidth: 0,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            >
              <InputLabel id="create-participants-label">
                Select participants
              </InputLabel>

              <Select
                labelId="create-participants-label"
                multiple
                value={selectedMemberIds}
                label="Select participants"
                onChange={(event) => {
                  const value = event.target.value;

                  setSelectedMemberIds(
                    typeof value === "string"
                      ? value.split(",").map(Number)
                      : value
                  );
                }}
                renderValue={(selected) =>
                  `${selected.length} participant(s) selected`
                }
                MenuProps={SELECT_MENU_PROPS}
              >
                {unallocatedParticipants.map((participant) => {
                  const id = getParticipantId(participant);

                  return (
                    <MenuItem key={id} value={id}>
                      <Checkbox
                        size="small"
                        checked={selectedMemberIds.some(
                          (selectedId) =>
                            String(selectedId) === String(id)
                        )}
                      />

                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13 }}>
                          {getParticipantName(participant)}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 11,
                            color: COLORS.secondaryText,
                          }}
                        >
                          {getParticipantDescription(participant)}
                        </Typography>
                      </Box>
                    </MenuItem>
                  );
                })}

                {unallocatedParticipants.length === 0 && (
                  <MenuItem disabled>
                    No unallocated participants
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={createGroup}
              disabled={saving || !newGroupName.trim()}
              sx={{
                minHeight: 40,
                px: 2.5,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                whiteSpace: "nowrap",
                bgcolor: COLORS.primary,
                "&:hover": {
                  bgcolor: COLORS.primaryDark,
                },
              }}
            >
              Create Group
            </Button>
          </Stack>

          <Typography
            sx={{
              mt: 1.5,
              fontSize: 11,
              color: COLORS.secondaryText,
            }}
          >
            {selectedMemberIds.length} participant(s) selected
          </Typography>
        </Paper>

        {/* GROUP MANAGEMENT */}

        {loading ? (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: "center",
              border: `1px solid ${COLORS.divider}`,
              borderRadius: 3,
            }}
          >
            <CircularProgress
              size={32}
              sx={{ color: COLORS.primary }}
            />

            <Typography
              sx={{
                mt: 2,
                color: COLORS.secondaryText,
                fontSize: 13,
              }}
            >
              Loading groups and participants...
            </Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                lg: "minmax(250px, 0.85fr) minmax(0, 2fr)",
              },
              gap: 2.5,
              alignItems: "start",
              overflow: "visible",
            }}
          >
            {/* GROUP LIST */}

            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                border: `1px solid ${COLORS.divider}`,
                borderRadius: 3,
                bgcolor: COLORS.paper,
                minWidth: 0,
                boxSizing: "border-box",
              }}
            >
              <SectionHeader
                icon={<GroupsRoundedIcon />}
                title="Groups"
                subtitle={`${groups.length} group(s) available`}
              />

              <TextField
                fullWidth
                size="small"
                placeholder="Search groups..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{
                  mt: 2,
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />

              <Stack spacing={1.25}>
                {filteredGroups.map((group, index) => {
                  const isSelected =
                    String(group.id) === String(selectedGroupId);

                  return (
                    <Paper
                      key={group.id}
                      variant="outlined"
                      onClick={() => setSelectedGroupId(group.id)}
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        borderColor: isSelected
                          ? COLORS.primary
                          : COLORS.divider,
                        bgcolor: isSelected
                          ? "#EAF5EF"
                          : COLORS.paper,
                        cursor: "pointer",
                        transition: "all 160ms ease",
                        "&:hover": {
                          borderColor: COLORS.primaryLight,
                          bgcolor: "#F4FAF6",
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.25}
                      >
                        <Avatar
                          variant="rounded"
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: 2,
                            bgcolor: isSelected
                              ? COLORS.primary
                              : "#E8EDF5",
                            color: isSelected
                              ? "#FFFFFF"
                              : COLORS.secondaryText,
                            fontWeight: 800,
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </Avatar>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: COLORS.text,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {group.name}
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 11,
                              color: COLORS.secondaryText,
                            }}
                          >
                            {group.members.length} participant(s)
                          </Typography>
                        </Box>

                        <Chip
                          size="small"
                          label={isSelected ? "Selected" : "Group"}
                          sx={{
                            height: 23,
                            fontSize: 10,
                            fontWeight: 700,
                            bgcolor: isSelected
                              ? "#D1FAE5"
                              : "#F1F5F9",
                            color: isSelected
                              ? COLORS.primary
                              : COLORS.secondaryText,
                          }}
                        />
                      </Stack>

                      <Divider
                        sx={{
                          my: 1.25,
                          borderColor: COLORS.divider,
                        }}
                      />

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={1}
                      >
                        <Typography
                          sx={{
                            fontSize: 11,
                            color: COLORS.secondaryText,
                          }}
                        >
                          Group ID: {group.id}
                        </Typography>

                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            size="small"
                            aria-label={`Edit ${group.name}`}
                            onClick={(event) => {
                              event.stopPropagation();

                              setRenameDrafts((previous) => ({
                                ...previous,
                                [group.id]: group.name,
                              }));
                            }}
                            sx={{ color: COLORS.primary }}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>

                          <IconButton
                            size="small"
                            aria-label={`Delete ${group.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteGroup(group.id);
                            }}
                            sx={{ color: COLORS.error }}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>

                      {renameDrafts[group.id] != null && (
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ mt: 1 }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <TextField
                            fullWidth
                            size="small"
                            value={renameDrafts[group.id]}
                            onChange={(event) =>
                              setRenameDrafts((previous) => ({
                                ...previous,
                                [group.id]: event.target.value,
                              }))
                            }
                            sx={{
                              minWidth: 0,
                              "& .MuiOutlinedInput-root": {
                                borderRadius: 2,
                              },
                            }}
                          />

                          <IconButton
                            aria-label="Save group name"
                            color="primary"
                            disabled={saving}
                            onClick={() => renameGroup(group.id)}
                          >
                            <SaveRoundedIcon />
                          </IconButton>

                          <IconButton
                            aria-label="Cancel group rename"
                            onClick={() =>
                              setRenameDrafts((previous) => {
                                const next = { ...previous };
                                delete next[group.id];
                                return next;
                              })
                            }
                          >
                            <CloseRoundedIcon />
                          </IconButton>
                        </Stack>
                      )}
                    </Paper>
                  );
                })}

                {filteredGroups.length === 0 && (
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <GroupsRoundedIcon
                      sx={{
                        fontSize: 34,
                        color: "#94A3B8",
                      }}
                    />

                    <Typography
                      sx={{
                        mt: 1,
                        color: COLORS.secondaryText,
                        fontSize: 13,
                      }}
                    >
                      {groups.length === 0
                        ? "No groups created yet."
                        : "No groups match your search."}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>

            {/* SELECTED GROUP PARTICIPANTS */}

            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                border: `1px solid ${COLORS.divider}`,
                borderRadius: 3,
                bgcolor: COLORS.paper,
                minWidth: 0,
                boxSizing: "border-box",
                overflow: "visible",
              }}
            >
              {selectedGroup ? (
                <>
                  <SectionHeader
                    icon={<GroupsRoundedIcon />}
                    title={selectedGroup.name}
                    subtitle={`${selectedGroup.members.length} participant(s) allocated`}
                  />

                  <Divider
                    sx={{
                      my: 2,
                      borderColor: COLORS.divider,
                    }}
                  />

                  {/* ADD PARTICIPANT */}

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.25}
                    sx={{
                      mb: 2.5,
                      overflow: "visible",
                    }}
                  >
                    <FormControl
                      fullWidth
                      size="small"
                      sx={{
                        minWidth: 0,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    >
                      <InputLabel id="add-member-label">
                        Add participant
                      </InputLabel>

                      <Select
                        labelId="add-member-label"
                        label="Add participant"
                        value={addDrafts[selectedGroup.id] ?? ""}
                        onChange={(event) =>
                          setAddDrafts((previous) => ({
                            ...previous,
                            [selectedGroup.id]: event.target.value,
                          }))
                        }
                        MenuProps={SELECT_MENU_PROPS}
                      >
                        {unallocatedParticipants.map((participant) => {
                          const id = getParticipantId(participant);

                          return (
                            <MenuItem key={id} value={id}>
                              {getParticipantName(participant)} —{" "}
                              {getParticipantDescription(participant)}
                            </MenuItem>
                          );
                        })}

                        {unallocatedParticipants.length === 0 && (
                          <MenuItem disabled value="">
                            No unallocated participants
                          </MenuItem>
                        )}
                      </Select>
                    </FormControl>

                    <Button
                      variant="contained"
                      startIcon={<PersonAddAlt1RoundedIcon />}
                      onClick={() => addMember(selectedGroup.id)}
                      disabled={
                        saving ||
                        addDrafts[selectedGroup.id] == null ||
                        addDrafts[selectedGroup.id] === ""
                      }
                      sx={{
                        minHeight: 40,
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        bgcolor: COLORS.primary,
                        "&:hover": {
                          bgcolor: COLORS.primaryDark,
                        },
                      }}
                    >
                      Add Participant
                    </Button>
                  </Stack>

                  {/* PARTICIPANT TABLE */}

                  <TableContainer
                    sx={{
                      width: "100%",
                      overflowX: "auto",
                      border: `1px solid ${COLORS.divider}`,
                      borderRadius: 2,
                    }}
                  >
                    <Table
                      size="small"
                      sx={{
                        minWidth: 650,
                        "& .MuiTableCell-root": {
                          borderColor: COLORS.divider,
                          py: 1.5,
                        },
                      }}
                    >
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#F4F6FF" }}>
                          {[
                            "PARTICIPANT",
                            "CYCLE / CONTROLLER",
                            "POWER",
                            "MOVE TO",
                            "ACTION",
                          ].map((heading) => (
                            <TableCell
                              key={heading}
                              align={
                                heading === "POWER"
                                  ? "right"
                                  : heading === "ACTION"
                                    ? "center"
                                    : "left"
                              }
                            >
                              <Typography
                                sx={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: COLORS.secondaryText,
                                }}
                              >
                                {heading}
                              </Typography>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {selectedGroup.members.map((member) => {
                          const memberId = getMemberId(member);

                          return (
                            <TableRow key={memberId} hover>
                              <TableCell>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={1.25}
                                >
                                  <Avatar
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      fontSize: 12,
                                      fontWeight: 800,
                                      bgcolor: "#E7F5EE",
                                      color: COLORS.primary,
                                    }}
                                  >
                                    {getParticipantName(member)
                                      .charAt(0)
                                      .toUpperCase()}
                                  </Avatar>

                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography
                                      sx={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: COLORS.text,
                                        overflowWrap: "anywhere",
                                      }}
                                    >
                                      {getParticipantName(member)}
                                    </Typography>

                                    <Typography
                                      sx={{
                                        fontSize: 10,
                                        color: COLORS.secondaryText,
                                      }}
                                    >
                                      Participant
                                    </Typography>
                                  </Box>
                                </Stack>
                              </TableCell>

                              <TableCell>
                                <Typography
                                  sx={{
                                    fontSize: 12,
                                    color: COLORS.text,
                                  }}
                                >
                                  {getParticipantDescription(member)}
                                </Typography>
                              </TableCell>

                              <TableCell align="right">
                                <Typography
                                  sx={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: COLORS.primary,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {Number(member.power || 0).toFixed(1)} W
                                </Typography>
                              </TableCell>

                              <TableCell>
                                <FormControl
                                  size="small"
                                  fullWidth
                                  sx={{ minWidth: 120 }}
                                >
                                  <Select
                                    displayEmpty
                                    value={moveDrafts[memberId] ?? ""}
                                    onChange={(event) =>
                                      setMoveDrafts((previous) => ({
                                        ...previous,
                                        [memberId]: event.target.value,
                                      }))
                                    }
                                    MenuProps={SELECT_MENU_PROPS}
                                    renderValue={(value) => {
                                      if (value === "") {
                                        return (
                                          <Typography
                                            sx={{
                                              fontSize: 11,
                                              color: COLORS.secondaryText,
                                            }}
                                          >
                                            Select group
                                          </Typography>
                                        );
                                      }

                                      return (
                                        groups.find(
                                          (group) =>
                                            String(group.id) ===
                                            String(value)
                                        )?.name || "Select group"
                                      );
                                    }}
                                  >
                                    {groups
                                      .filter(
                                        (group) =>
                                          String(group.id) !==
                                          String(selectedGroup.id)
                                      )
                                      .map((group) => (
                                        <MenuItem
                                          key={group.id}
                                          value={group.id}
                                        >
                                          {group.name}
                                        </MenuItem>
                                      ))}
                                  </Select>
                                </FormControl>
                              </TableCell>

                              <TableCell align="center">
                                <Stack
                                  direction="row"
                                  justifyContent="center"
                                  spacing={0.5}
                                >
                                  <IconButton
                                    size="small"
                                    title="Move participant"
                                    aria-label="Move participant"
                                    disabled={
                                      saving ||
                                      moveDrafts[memberId] == null ||
                                      moveDrafts[memberId] === ""
                                    }
                                    onClick={() =>
                                      moveMember(
                                        selectedGroup.id,
                                        memberId
                                      )
                                    }
                                    sx={{ color: COLORS.info }}
                                  >
                                    <SwapHorizRoundedIcon fontSize="small" />
                                  </IconButton>

                                  <IconButton
                                    size="small"
                                    title="Remove participant"
                                    aria-label="Remove participant"
                                    disabled={saving}
                                    onClick={() =>
                                      removeMember(
                                        selectedGroup.id,
                                        memberId
                                      )
                                    }
                                    sx={{ color: COLORS.error }}
                                  >
                                    <DeleteOutlineRoundedIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}

                        {selectedGroup.members.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              sx={{
                                py: 5,
                                textAlign: "center",
                              }}
                            >
                              <GroupsRoundedIcon
                                sx={{
                                  fontSize: 35,
                                  color: "#94A3B8",
                                }}
                              />

                              <Typography
                                sx={{
                                  mt: 1,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: COLORS.text,
                                }}
                              >
                                No participants in this group
                              </Typography>

                              <Typography
                                sx={{
                                  mt: 0.5,
                                  fontSize: 12,
                                  color: COLORS.secondaryText,
                                }}
                              >
                                Add a participant using the selector above.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={1}
                    sx={{ mt: 2 }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: COLORS.secondaryText,
                      }}
                    >
                      Showing {selectedGroup.members.length} participant(s)
                    </Typography>
                  </Stack>
                </>
              ) : (
                <Box
                  sx={{
                    py: 7,
                    px: 2,
                    textAlign: "center",
                  }}
                >
                  <GroupsRoundedIcon
                    sx={{
                      fontSize: 45,
                      color: "#94A3B8",
                    }}
                  />

                  <Typography
                    sx={{
                      mt: 1.5,
                      fontSize: 16,
                      fontWeight: 800,
                      color: COLORS.text,
                    }}
                  >
                    Select a group
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 12,
                      color: COLORS.secondaryText,
                    }}
                  >
                    Select an existing group or create a new one to manage
                    participants.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        )}

        {/* SAVING STATUS */}

        {saving && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              mt: 2,
              justifyContent: "flex-end",
            }}
          >
            <CircularProgress
              size={15}
              sx={{ color: COLORS.primary }}
            />

            <Typography
              sx={{
                fontSize: 11,
                color: COLORS.secondaryText,
              }}
            >
              Saving changes...
            </Typography>
          </Stack>
        )}
      </Box>
    </BottomSheet>
  );
}

export default GroupRankingScreenController;
