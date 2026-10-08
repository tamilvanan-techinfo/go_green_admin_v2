import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import api from "../config.json"
const WS_URL = api.socketBase+"/ws/screen/admin/";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [screens, setScreens] = useState([]);
  const [controlledScreen, setControlledScreen] = useState(null);
  const [connected, setConnected] = useState(false);
  const[IsRecOn,setIsRecOn] = useState(false)
  const wsRef = useRef(null);
  const shouldReconnect = useRef(true);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef(null);

  const connectWebSocket = () => {
    try {
      const socket = new WebSocket(WS_URL);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("Screen WebSocket connected");
        reconnectAttempts.current = 0;
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "update" && msg.screen) {
            setScreens((prev) =>
              prev.map((s) => (s.id === msg.screen.id ? msg.screen : s))
            );
          } else if (msg.type === "create" && msg.screen) {
            setScreens((prev) => [...prev, msg.screen]);
          } else if (msg.type === "delete" && msg.id) {
            setScreens((prev) => prev.filter((s) => s.id !== msg.id));
          } else if (msg.type === "window_update_ack" && msg.screen) {
            // Ack from the screen-control flow (width/height/x/y/fullscreen/alwaysOnTop)
            setControlledScreen(msg.screen);
          }
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      socket.onclose = (event) => {
        console.log("Screen WebSocket closed", event.code);
        setConnected(false);

        if (!shouldReconnect.current) return;

        reconnectAttempts.current += 1;

        // Exponential backoff (max 30 seconds)
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempts.current),
          30000
        );

        console.log(`Reconnecting in ${delay / 1000}s...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      };

      socket.onerror = (err) => {
        console.error("Screen WebSocket error:", err);
        socket.close();
      };
    } catch (err) {
      console.error("Failed to connect WebSocket:", err);

      if (shouldReconnect.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      }
    }
  };

  useEffect(() => {
    shouldReconnect.current = true;
    connectWebSocket();

    return () => {
      shouldReconnect.current = false;
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Generic send function — accepts an object, stringifies it, and sends
  // over the socket if it's currently open.
  const send = (data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    console.warn("Socket not open, message not sent:", data);
    return false;
  };

  const value = {
    screens,
    setScreens,
    controlledScreen,
    setControlledScreen,
    connected,
    send,
    IsRecOn,
    setIsRecOn
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return ctx;
}

export default SocketContext;