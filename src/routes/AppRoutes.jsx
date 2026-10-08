import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";


import Dashboard from "../screens/Dashboard";
import Allocations from "../screens/Allocations";
import Logs from "../screens/Logs";
import Screens from "../screens/Screens";
import  Settings  from "../screens/Settings";
import Reports from "../screens/Reports";
import Cms from "../screens/Cms/Cms";

function AppRoutes() {
  return (
    <Routes>
      {/* =========================================================
          DASHBOARD
      ========================================================= */}
      <Route
        path="/dashboard"
        element={
            <Dashboard />
        }
      />
      <Route
        path="/allocations"
        element={
            <Allocations />
        }
      />
      <Route
        path="/logs"
        element={
            <Logs />
        }
      />
      <Route
        path="/screen"
        element={
            <Screens />
        }
      />
      <Route
        path="/cms"
        element={
            <Cms />
        }
      />
      <Route
        path="/settings"
        element={
            <Settings />
        }
      />
      <Route
        path="/reports"
        element={
            <Reports />
        }
      />

      {/* =========================================================
          404 FALLBACK
      ========================================================= */}
      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}

export default AppRoutes;