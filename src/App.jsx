import React from "react";

import AppRoutes from "./routes/AppRoutes";
import { SocketProvider } from "./context/SocketContext";
import { GameProvider } from "./context/GameContext";

function App() {
  return (
    <GameProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </GameProvider>
  )
}

export default App;