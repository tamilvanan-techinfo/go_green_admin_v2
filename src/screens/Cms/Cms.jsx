import React from "react";
import AppLayout from "../../components/AppLayout";
import AppTitle from "./AppTitle";
import FreeText from "./FreeText";
import { Box } from "@mui/material";
import AppTheme from "./AppTheme";

function Cms() {
  return (
    <AppLayout title="Content & Theme Management">
      <Box
        sx={{
          display: "flex",
          width: "100%",
          height: "calc(100vh - 100px)",
          minHeight: 0,
          gap: 2,
          overflow: "hidden",
        }}
      >
        {/* Left Section */}
        <Box
          sx={{
            width: "50%",
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            overflow: "hidden",
          }}
        >
          <AppTitle />
          <FreeText />
        </Box>

        {/* Right Section - App Theme */}
        <Box
          sx={{
            width: "50%",
            height: "100%",
            minHeight: 0,
            overflow: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          <AppTheme />
        </Box>
      </Box>
    </AppLayout>
  );
}

export default Cms;