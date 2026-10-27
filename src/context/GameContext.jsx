import React, { createContext, useCallback, useContext, useState } from "react";

const KEY = "selected_game";
const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [selectedGame, setSelectedGameState] = useState(() => {
    try { return localStorage.getItem(KEY); } catch { return null; }
  });

  const setSelectedGame = useCallback((id) => {
    setSelectedGameState(id);
    try {
      id ? localStorage.setItem(KEY, id) : localStorage.removeItem(KEY);
    } catch { /* ignore */ }
  }, []);

  return (
    <GameContext.Provider value={{ selectedGame, setSelectedGame }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);