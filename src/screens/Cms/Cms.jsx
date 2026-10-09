import React from "react";
import { Box, Paper } from "@mui/material";

import AppLayout from "../../components/AppLayout";
import AppTitle from "./AppTitle";
import FreeText from "./FreeText";
import AppTheme from "./AppTheme";

function Cms() {
  return (
    <AppLayout title="Content & Theme Management">
      <Box
        sx={{
          display: "flex",
          alignItems: "stretch",
          width: "100%",
          height: "calc(100vh - 160px)",
          minHeight: 0,
          gap: 2,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Left Section */}
        <Box
          sx={{
            flex: "0 0 calc(50% - 8px)",
            height: "100%",
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflow: "hidden",
          }}
        >
          {/* Application Title */}
          <Box
            sx={{
              flexShrink: 0,
              minWidth: 0,
            }}
          >
            <AppTitle />
          </Box>

          {/* Display Text Editor */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              overflow: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": {
                display: "none",
              },
            }}
          >
            <FreeText />
          </Box>
        </Box>

        {/* Right Section - App Theme */}
        <Paper
        variant="outlined"
          sx={{
            height: "100%",
            minWidth: 0,
            minHeight: 0,
            borderRadius:'14px',
            
            overflow: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        >
          <AppTheme />
        </Paper>
      </Box>
    </AppLayout>
  );
}

export default Cms;
