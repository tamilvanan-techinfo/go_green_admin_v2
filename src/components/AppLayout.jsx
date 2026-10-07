import React from "react";
import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";

import AppBar from "../components/AppBar";
import Footer from "../components/Footer";

function AppLayout() {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",

        display: "flex",
        flexDirection: "column",

        overflow: "hidden",

        background: (theme) =>
          theme.palette.mode === "dark"
            ? theme.palette.background.default
            : "#F8FAFC",
      }}
    >
      {/* =========================================================
          APPLICATION APP BAR
      ========================================================= */}
      <AppBar />

      {/* =========================================================
          MAIN APPLICATION CONTENT
      ========================================================= */}
      <Box
        component="main"
        sx={{
          flex: 1,

          minWidth: 0,
          minHeight: 0,

          position: "relative",

          overflow: "auto",

          /*
           * Bottom spacing prevents the floating macOS-style
           * footer from covering page content.
           */
          pb: 10,
        }}
      >
        <Outlet />
      </Box>

      {/* =========================================================
          FLOATING MACOS-STYLE FOOTER
      ========================================================= */}
      <Footer />
    </Box>
  );
}

export default AppLayout;