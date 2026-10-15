
import React, { useCallback, useState } from "react";
import { Box } from "@mui/material";

import AppLayout from "../../components/AppLayout";
import AddScreen from "./AddScreen";
import ScreenControl from "./ScreenControl";
import GroupRankingScreenController from "./GroupRankingScreenController";
import LiveGraphControl from "./LiveGraphControl";
import ScreenWindows from "./ScreenWindows";

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
        {/* Main responsive layout */}
        <Box
          sx={{
            display: "grid",

            // Keep the same two-column layout on laptop and desktop.
            // The columns resize, but never switch to a vertical layout.
            gridTemplateColumns:
              "minmax(0, 2fr) minmax(280px, 1fr)",

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
          {/* LEFT: Screen Windows */}
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

          {/* RIGHT: Add Screen and Screen Control */}
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
