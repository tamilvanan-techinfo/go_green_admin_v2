
import React, { useCallback, useState } from "react";
import AppLayout from "../../components/AppLayout";
import { ToastProvider } from "./Ui";
import CycleSection from "./CycleSection";
import ParticipantSection from "./ParticipantSection";
import CycleAllocations from "./CycleAllocations";
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import {
  Box,
  Typography,
  Button,
  Stack,
} from "@mui/material";


import GroupsIcon from "@mui/icons-material/Groups";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

const TABS = [
  {
    key: "cycles",
    label: "Cycles",
    icon: DirectionsBikeIcon,
  },
  {
    key: "participants",
    label: "Participants",
    icon: GroupsIcon,
  },
  {
    key: "allocations",
    label: "Cycle Allocations",
    icon: AccountTreeIcon,
  },
];

const STORAGE_KEY = "allocations.activeTab";

function getInitialTab() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    return TABS.some((t) => t.key === saved)
      ? saved
      : "allocations";
  } catch {
    return "allocations";
  }
}

function Allocations() {
  const [tab, setTab] = useState(getInitialTab);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDataChange = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
  }, []);

  const goTo = useCallback((key) => {
    setTab(key);

    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // Ignore storage errors
    }
  }, []);

  return (
    <AppLayout title="">
      <ToastProvider>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 11rem)",
            minHeight: 0,
            minWidth: 0,
            color: "text.primary",
            overflow: "hidden",
          }}
        >
          {/* Page title */}
          <Typography
            component="h1"
            variant="h4"
            sx={{
              flexShrink: 0,
              textAlign: "left",
              fontWeight: 700,
              mb: 1,
            }}
          >
            Allocations
          </Typography>

          {/* Section tabs */}
          <Box
            component="nav"
            role="tablist"
            aria-label="Allocations sections"
            sx={{
              flexShrink: 0,
              mt: 1,
              mb: 2.5,
            }}
          >
            <Stack
              direction="row"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                bgcolor: "background.default",
                borderRadius: 1,
                p: 0.5,
                border: "1px solid",
                borderColor: "divider",
              }}
              role="group"
            >
              {TABS.map((t) => {
                const selected = tab === t.key;
                const IconComponent = t.icon;

                return (
                  <Button
                    key={t.key}
                    type="button"
                    size="small"
                    variant={selected ? "contained" : "text"}
                    color="primary"
                    role="tab"
                    id={`alloc-tab-${t.key}`}
                    aria-controls={`alloc-panel-${t.key}`}
                    aria-selected={selected}
                    startIcon={<IconComponent sx={{ fontSize: 18 }} />}
                    onClick={() => goTo(t.key)}
                    sx={{
                      minHeight: 34,
                      px: 2,
                      borderRadius: 0.75,
                      fontWeight: 600,
                      boxShadow: selected
                        ? "0 1px 4px rgba(15,23,42,0.10)"
                        : "none",
                    }}
                  >
                    {t.label}
                  </Button>
                );
              })}
            </Stack>
          </Box>

          {/* Scrollable tab content */}
          <Box
            role="tabpanel"
            id={`alloc-panel-${tab}`}
            aria-labelledby={`alloc-tab-${tab}`}
            sx={{
              flex: "1 1 0",
              minHeight: 0,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              p: 0,
              "& > *": {
              flex: "1 1 0",
              minHeight: 0,
              minWidth: 0,
              },
              }}

          >
            {tab === "cycles" && (
              <CycleSection
                onDataChange={handleDataChange}
              />
            )}

            {tab === "participants" && (
              <ParticipantSection
                onDataChange={handleDataChange}
              />
            )}

            {tab === "allocations" && (
              <CycleAllocations
                refreshTrigger={refreshTrigger}
                onNavigate={goTo}
              />
            )}
          </Box>
        </Box>
      </ToastProvider>
    </AppLayout>
  );
}

export default Allocations;
