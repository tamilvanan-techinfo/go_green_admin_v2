import React from "react";
import { Box, Typography } from "@mui/material";

import AppBar from "../components/AppBar";
import Footer from "../components/Footer";

function AppLayout({ children,title }) {
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
    
      <AppBar />

      <Box
        component="main"
        sx={{
          flex: 1,
          border:'1px solid',
          minWidth: 0,
          minHeight: 0,

          position: "relative",

          overflow: "auto",
          pt:7,
          pb: 10,
          pl:3,
          pr:3
        }}
      >
        <Typography
            component="h1"
              sx={{
                fontSize: "28px",
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",

                color: "text.primary",
              }}
        >
            {title}
        </Typography>
        <Box>
            {children}
        </Box>

      </Box>

   
      <Footer />
    </Box>
  );
}

export default AppLayout;