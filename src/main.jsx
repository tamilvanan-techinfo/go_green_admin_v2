import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, CssBaseline } from "@mui/material";
import "material-symbols/outlined.css";
import { HashRouter } from "react-router-dom";
import "./App.css";
import { ToastProvider } from "./screens/Allocations/Ui";
import App from "./App";
import theme from "./core/theme";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>
);