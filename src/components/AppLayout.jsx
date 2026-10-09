import React from "react";
import { Box, Typography, useTheme } from "@mui/material";

import AppBar from "../components/AppBar";
import Footer from "../components/Footer";

function AppLayout({ children, title }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",

        userSelect: "none",
        WebkitUserSelect: "none",

        display: "flex",
        flexDirection: "column",

        // Prevent the entire layout from scrolling
        overflowY: "scroll",
        scrollbarWidth: "none",
    msOverflowStyle: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
        
      

        background: theme.palette.background.default,
      }}
    >
      <AppBar />

      <Box
        component="main"
        sx={{
          flex: 1,

          border: "1px solid",

          minWidth: 0,
          minHeight: 0,

          position: "relative",
          overflowY: "scroll",
        scrollbarWidth: "none",
    msOverflowStyle: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
          // Prevent scrolling inside main content

          pt: 6.5,
          pb: 10,
          pl: 3,
          pr: 3,
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

        <Box sx={{ mt: 1 }}>
          {children}
        </Box>
      </Box>

      <Footer />
    </Box>
  );
}

export default AppLayout;