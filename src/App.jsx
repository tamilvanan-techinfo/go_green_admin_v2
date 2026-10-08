import React from "react";

import AppRoutes from "./routes/AppRoutes";
import { SocketProvider } from "./context/SocketContext";

function App() {
  return (
    <SocketProvider>
      <AppRoutes />
    </SocketProvider>
  )
}

export default App;