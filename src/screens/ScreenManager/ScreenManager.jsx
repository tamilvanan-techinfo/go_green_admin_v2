import React, { useCallback, useState } from "react";
import { Box } from "@mui/material";

import AppLayout from "../../components/AppLayout";
import AddScreen from "./AddScreen";
import ScreenControl from "./ScreenControl";
import GroupRankingScreenController from "./GroupRankingScreenController";
import LiveGraphControl from "./LiveGraphControl";
import ScreenWindows from "./ScreenWindows";
import Screens from "./Screens";

// ─── Thin scrollbar using theme colors ───────────────────────
const thinScrollbar = {
  "&::-webkit-scrollbar": {
    width: 4,
  },
  "&::-webkit-scrollbar-track": {
    backgroundColor: "#EFF1FF", // theme background.default
    borderRadius: 10,
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "#D9DEEE", // theme divider
    borderRadius: 10,
    "&:hover": {
      backgroundColor: "#047857", // theme primary.light
    },
  },
  scrollbarWidth: "thin",          // Firefox
  scrollbarColor: "#D9DEEE #EFF1FF", // Firefox thumb + track
};

function ScreenManager() {
  const [controlFor, setControlFor] = useState("");

  const changeControl = useCallback((value) => {
    setControlFor(value);
  }, []);

  const closeControl = useCallback(() => {
    setControlFor("");
  }, []);

  return (
    <AppLayout title="Screen Manager">
      <Box
        sx={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          height: "100%",
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.5fr) minmax(0, 1.5fr) minmax(280px, 1fr)",
            gap: { xs: 1.5, sm: 2, md: 2.5 },
            alignItems: "start",
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            "& > *": {
              minWidth: 0,
              maxWidth: "100%",
              boxSizing: "border-box",
            },
          }}
        >
          {/* COLUMN 1 (low priority): Screens */}
          <Box
            sx={{
              width: "100%",
              minWidth: 0,
              maxWidth: "100%",
              boxSizing: "border-box",
              overflowX: "hidden",
              overflowY: "auto",
              maxHeight: "calc(100vh - 100px)",
              ...thinScrollbar,
            }}
          >
            <Screens handleControlFor={changeControl} />
          </Box>

          {/* COLUMN 2 (high priority): Screen Windows */}
          <Box
            sx={{
              width: "100%",
              minWidth: 0,
              maxWidth: "100%",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <ScreenWindows />
          </Box>

          {/* COLUMN 3: AddScreen + ScreenControl */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: { xs: 1.5, md: 2 },
              width: "100%",
              minWidth: 0,
              maxWidth: "100%",
              boxSizing: "border-box",
              "& > *": {
                width: "100%",
                minWidth: 0,
                maxWidth: "100%",
                boxSizing: "border-box",
                flexShrink: 1,
              },
            }}
          >
            <AddScreen />
            <ScreenControl />
          </Box>
        </Box>

        {/* Group and participant controller */}
        {controlFor === "/group-participants" && (
          <GroupRankingScreenController
            isOpened={true}
            setControlFor={closeControl}
          />
        )}

        {/* Player analysis controller */}
        {controlFor === "/player-analysis" && (
          <LiveGraphControl
            isOpened={true}
            setControlFor={closeControl}
          />
        )}

        {/* Live bar chart controller */}
        {controlFor === "/live-barchart" && (
          <LiveGraphControl
            isOpened={true}
            setControlFor={closeControl}
          />
        )}
      </Box>
    </AppLayout>
  );
}

export default ScreenManager;