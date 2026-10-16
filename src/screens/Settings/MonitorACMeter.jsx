import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import { useTheme } from "@mui/material/styles";

import {
  AddRounded,
  DeleteOutlineRounded,
  DownloadRounded,
  RefreshRounded,
  SettingsRounded,
  SpeedRounded,
  TimelineRounded,
  BoltRounded,
  ElectricMeterRounded,
  SensorsRounded,
  SaveRounded,
} from "@mui/icons-material";

import ReactECharts from "echarts-for-react";
import { useToast } from "../Allocations/Ui";
import BottomSheet from '../../components/BottonSheet'

const API = "http://localhost:8001";
const WS = "ws://localhost:8001/ws/meters";

const RECONNECT_MS = 3000;
const MAX_POINTS = 3600;

const WINDOW_OPTIONS = [
  { label: "30 seconds", value: 30 },
  { label: "1 minute", value: 60 },
  { label: "2 minutes", value: 120 },
  { label: "5 minutes", value: 300 },
  { label: "10 minutes", value: 600 },
  { label: "15 minutes", value: 900 },
  { label: "30 minutes", value: 1800 },
  { label: "60 minutes", value: 3600 },
];

// Serial connection settings remain managed by FastAPI.
const DEFAULT_CONFIG = {
  port: "COM1",
  baudrate: 9600,
  poll_interval: 1,
  meters: [],
};

const numberOrZero = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value, digits = 2) =>
  numberOrZero(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const formatTimestamp = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--:--:--";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getTimestamp = (value) => {
  if (value === undefined || value === null) {
    return Date.now();
  }

  if (typeof value === "number") {
    return value < 1e12 ? value * 1000 : value;
  }

  const parsed = new Date(value).getTime();

  return Number.isFinite(parsed) ? parsed : Date.now();
};

const normalizeMeters = (meters) =>
  Array.isArray(meters)
    ? meters.map((meter) => ({
        ...meter,
        meter_name: String(meter.meter_name ?? ""),
        slave_id: Number(meter.slave_id),
      }))
    : [];

function createNewMeter(meters) {
  const existingNames = new Set(
    meters.map((meter) =>
      String(meter.meter_name).trim().toLowerCase()
    )
  );

  const existingIds = new Set(
    meters.map((meter) => Number(meter.slave_id))
  );

  let index = 1;

  while (
    existingNames.has(`meter${index}`) &&
    index < 10000
  ) {
    index += 1;
  }

  let slaveId = 1;

  while (existingIds.has(slaveId) && slaveId <= 247) {
    slaveId += 1;
  }

  if (slaveId > 247) return null;

  return {
    meter_name: `Meter${index}`,
    slave_id: slaveId,
  };
}

function MetricCard({
  title,
  value,
  unit,
  icon,
  color,
  subtitle,
}) {
  return (
    <Card
      sx={{
        height: "100%",
        minWidth: 0,
        borderRadius: 2.5,
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.5, sm: 2 },
          "&:last-child": {
            pb: { xs: 1.5, sm: 2 },
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          spacing={1}
          sx={{ width: "100%" }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: 21, sm: 26 },
                lineHeight: 1.2,
                fontWeight: 700,
                letterSpacing: "-0.04em",
                color: "text.primary",
                overflowWrap: "anywhere",
              }}
            >
              {value}

              {unit && (
                <Box
                  component="span"
                  sx={{
                    ml: 0.75,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "text.secondary",
                    letterSpacing: 0,
                  }}
                >
                  {unit}
                </Box>
              )}
            </Typography>

            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mt: 1.5,
                  lineHeight: 1.4,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              width: 34,
              height: 34,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              color,
              bgcolor: `${color}14`,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function MeterCard({ meter }) {
  const online = meter.online === true;

  const readings = [
    { label: "VOLTAGE", value: meter.Voltage_V, unit: "V" },
    { label: "CURRENT", value: meter.Current_A, unit: "A" },
    { label: "POWER", value: meter.Power_W, unit: "W" },
  ];

  return (
    <Card
      sx={{
        width: { xs: 280, sm: 300 },
        minWidth: { xs: 280, sm: 300 },
        height: "100%",
        borderRadius: 2.5,
        boxShadow: "none",
        border: 1,
        borderColor: "divider",
        transition: "border-color 160ms ease",
        "&:hover": {
          borderColor: "primary.main",
        },
      }}
    >
      <CardContent
        sx={{
          p: 2,
          "&:last-child": { pb: 2 },
        }}
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{ minWidth: 0 }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: online ? "success.light" : "action.hover",
                color: online ? "success.dark" : "text.secondary",
              }}
            >
              <ElectricMeterRounded />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                fontWeight={700}
                noWrap
                title={meter.meter_name}
              >
                {meter.meter_name || "Unnamed meter"}
              </Typography>

              <Typography variant="caption" color="text.secondary">
                Slave ID: {meter.slave_id ?? "--"}
              </Typography>
            </Box>
          </Stack>

          <Chip
            size="small"
            label={online ? "Online" : "Offline"}
            color={online ? "success" : "default"}
            variant={online ? "filled" : "outlined"}
            sx={{
              height: 23,
              fontSize: 11,
              flexShrink: 0,
            }}
          />
        </Stack>

        <Divider sx={{ mb: 1.5 }} />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 1,
          }}
        >
          {readings.map((item) => (
            <Box key={item.label} sx={{ minWidth: 0 }}>
              <Typography
                variant="overline"
                sx={{
                  display: "block",
                  fontSize: 9,
                  lineHeight: 1.5,
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </Typography>

              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  mt: 0.5,
                  overflowWrap: "anywhere",
                }}
              >
                {online ? formatNumber(item.value) : "--"}

                <Box
                  component="span"
                  sx={{
                    ml: 0.35,
                    fontSize: 10,
                    fontWeight: 500,
                    color: "text.secondary",
                  }}
                >
                  {item.unit}
                </Box>
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function MonitorACMeter() {
  const theme = useTheme();
  const notify = useToast();

  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const historyRef = useRef([]);
  const disconnectNotifiedRef = useRef(false);

  const [meters, setMeters] = useState([]);
  const [history, setHistory] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [socketConnected, setSocketConnected] = useState(false);

  const [configOpen, setConfigOpen] = useState(false);
  const [chartWindow, setChartWindow] = useState(300);

  const fetchConfig = useCallback(async () => {
    const response = await fetch(`${API}/api/meters/config`);

    if (!response.ok) {
      throw new Error(
        `Could not load meter configuration (${response.status})`
      );
    }

    const data = await response.json();

    if (data.status === false) {
      throw new Error(
        data.message || "Could not load meter configuration"
      );
    }

    const serverConfig = data.config || {};
    const loadedMeters = normalizeMeters(
      data.meters ?? serverConfig.meters
    );

    const nextConfig = {
      ...DEFAULT_CONFIG,
      ...serverConfig,
      port: serverConfig.port ?? DEFAULT_CONFIG.port,
      baudrate: Number(
        serverConfig.baudrate ?? DEFAULT_CONFIG.baudrate
      ),
      poll_interval: Number(
        serverConfig.poll_interval ??
          DEFAULT_CONFIG.poll_interval
      ),
      meters: loadedMeters,
    };

    setConfig(nextConfig);

    return nextConfig;
  }, []);

  useEffect(() => {
    let disposed = false;
    let timer;

    const checkBackend = async () => {
      try {
        const response = await fetch(
          `${API}/api/meters/config`,
          { signal: AbortSignal.timeout(3000) }
        );

        if (!disposed) {
          setBackendStatus(response.ok ? "running" : "stopped");
        }
      } catch {
        if (!disposed) setBackendStatus("stopped");
      }

      if (!disposed) {
        timer = setTimeout(checkBackend, 3000);
      }
    };

    checkBackend();

    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, []);

  const refreshPage = useCallback(async () => {
    setLoading(true);

    try {
      await fetchConfig();
    } catch (error) {
      notify(
        error.message ||
          "Could not connect to the meter configuration API",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [fetchConfig, notify]);

  useEffect(() => {
    refreshPage();
  }, [refreshPage]);

  // Live WebSocket readings with automatic reconnection.
  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;

      let socket;

      try {
        socket = new WebSocket(WS);
        socketRef.current = socket;
      } catch {
        setSocketConnected(false);

        if (!disconnectNotifiedRef.current) {
          disconnectNotifiedRef.current = true;
          notify(
            "Live meter WebSocket disconnected. Reconnecting in 3 seconds...",
            "error"
          );
        }

        reconnectTimerRef.current = setTimeout(
          connect,
          RECONNECT_MS
        );

        return;
      }

      socket.onopen = () => {
        if (!disposed) {
          setSocketConnected(true);
          disconnectNotifiedRef.current = false;
        }
      };

      socket.onmessage = (event) => {
        if (disposed) return;

        try {
          const packet = JSON.parse(event.data);

          if (
            packet.type !== "live" ||
            !Array.isArray(packet.meters)
          ) {
            return;
          }

          const nextMeters = packet.meters.map((meter) => ({
            ...meter,
            meter_name: String(meter.meter_name ?? ""),
            slave_id: Number(meter.slave_id),
            online: meter.online === true,
          }));

          setMeters(nextMeters);

          const timestamp = getTimestamp(packet.timestamp);

          const totalPower = nextMeters.reduce(
            (sum, meter) =>
              sum +
              (meter.online ? numberOrZero(meter.Power_W) : 0),
            0
          );

          const nextHistory = [
            ...historyRef.current,
            { timestamp, power: totalPower },
          ].slice(-MAX_POINTS);

          historyRef.current = nextHistory;
          setHistory(nextHistory);
        } catch (error) {
          console.error("Invalid meter WebSocket message:", error);
        }
      };

      socket.onerror = () => {
        setSocketConnected(false);
      };

      socket.onclose = () => {
        if (disposed) return;

        setSocketConnected(false);

        if (!disconnectNotifiedRef.current) {
          disconnectNotifiedRef.current = true;
          notify(
            "Live meter WebSocket disconnected. Reconnecting in 3 seconds...",
            "error"
          );
        }

        reconnectTimerRef.current = setTimeout(
          connect,
          RECONNECT_MS
        );
      };
    };

    connect();

    return () => {
      disposed = true;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      if (socketRef.current) {
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        socketRef.current.onerror = null;
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [notify]);

  const onlineMeters = useMemo(
    () => meters.filter((meter) => meter.online === true),
    [meters]
  );

  const totalPower = useMemo(
    () =>
      onlineMeters.reduce(
        (sum, meter) => sum + numberOrZero(meter.Power_W),
        0
      ),
    [onlineMeters]
  );

  const totalCurrent = useMemo(
    () =>
      onlineMeters.reduce(
        (sum, meter) => sum + numberOrZero(meter.Current_A),
        0
      ),
    [onlineMeters]
  );

  const averageVoltage = useMemo(() => {
    if (!onlineMeters.length) return 0;

    return (
      onlineMeters.reduce(
        (sum, meter) => sum + numberOrZero(meter.Voltage_V),
        0
      ) / onlineMeters.length
    );
  }, [onlineMeters]);

  // Keep configured meters visible even while offline.
  const displayMeters = useMemo(
    () =>
      config.meters.map((configuredMeter) => {
        const liveMeter =
          meters.find(
            (meter) =>
              Number(meter.slave_id) ===
              Number(configuredMeter.slave_id)
          ) ||
          meters.find(
            (meter) =>
              meter.meter_name &&
              meter.meter_name === configuredMeter.meter_name
          );

        return {
          ...configuredMeter,
          ...(liveMeter || {}),
          meter_name: configuredMeter.meter_name,
          slave_id: configuredMeter.slave_id,
          online: liveMeter?.online === true,
        };
      }),
    [config.meters, meters]
  );

  const visibleHistory = useMemo(() => {
    const cutoff = Date.now() - chartWindow * 1000;

    return history.filter(
      (point) => point.timestamp >= cutoff
    );
  }, [history, chartWindow]);

  const chartOption = useMemo(
    () => ({
      animation: false,
      grid: {
        top: 22,
        right: 18,
        bottom: 28,
        left: 58,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        textStyle: {
          color: theme.palette.text.primary,
          fontFamily: theme.typography.fontFamily,
          fontSize: 12,
        },
        formatter: (items) => {
          const item = items?.[0];
          if (!item) return "";

          return [
            formatTimestamp(item.axisValue),
            `Total power: ${formatNumber(item.data)} W`,
          ].join("<br/>");
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: visibleHistory.map((point) => point.timestamp),
        axisLine: {
          lineStyle: { color: theme.palette.divider },
        },
        axisTick: { show: false },
        axisLabel: {
          color: theme.palette.text.secondary,
          fontSize: 10,
          formatter: (value) => formatTimestamp(value),
        },
      },
      yAxis: {
        type: "value",
        name: "Watts",
        nameTextStyle: {
          color: theme.palette.text.secondary,
          fontSize: 10,
          padding: [0, 0, 0, 8],
        },
        splitLine: {
          lineStyle: {
            color: theme.palette.divider,
            type: "dashed",
          },
        },
        axisLabel: {
          color: theme.palette.text.secondary,
          fontSize: 10,
        },
      },
      series: [
        {
          name: "Total power",
          type: "line",
          smooth: 0.25,
          showSymbol: false,
          connectNulls: false,
          data: visibleHistory.map((point) => point.power),
          lineStyle: {
            width: 2,
            color: theme.palette.primary.main,
          },
          itemStyle: {
            color: theme.palette.primary.main,
          },
          areaStyle: {
            color: theme.palette.primary.main,
            opacity: 0.08,
          },
        },
      ],
    }),
    [visibleHistory, theme]
  );

  const openConfig = async () => {
    setConfigOpen(true);

    try {
      await fetchConfig();
    } catch (error) {
      notify(
        error.message || "Could not load meter configuration",
        "error"
      );
    }
  };

  const closeConfig = () => {
    if (!saving) setConfigOpen(false);
  };

  const updateMeter = (index, field, value) => {
    setConfig((previous) => ({
      ...previous,
      meters: previous.meters.map((meter, meterIndex) =>
        meterIndex === index
          ? { ...meter, [field]: value }
          : meter
      ),
    }));
  };

  const addMeter = () => {
    const newMeter = createNewMeter(config.meters);

    if (!newMeter) {
      notify(
        "No available Modbus slave IDs remain. IDs must be between 1 and 247.",
        "error"
      );
      return;
    }

    setConfig((previous) => ({
      ...previous,
      meters: [...previous.meters, newMeter],
    }));
  };

  const removeMeter = (index) => {
    if (config.meters.length <= 1) {
      notify("At least one meter must be configured.", "error");
      return;
    }

    setConfig((previous) => ({
      ...previous,
      meters: previous.meters.filter(
        (_, meterIndex) => meterIndex !== index
      ),
    }));
  };

  const validateConfig = () => {
    if (!config.meters.length) {
      return "Configure at least one meter.";
    }

    const names = config.meters.map((meter) =>
      String(meter.meter_name ?? "").trim().toLowerCase()
    );

    if (names.some((name) => !name)) {
      return "Every meter must have a name.";
    }

    if (new Set(names).size !== names.length) {
      return "Meter names must be unique.";
    }

    const ids = config.meters.map((meter) =>
      Number(meter.slave_id)
    );

    if (
      ids.some(
        (id) => !Number.isInteger(id) || id < 1 || id > 247
      )
    ) {
      return "Slave IDs must be integers between 1 and 247.";
    }

    if (new Set(ids).size !== ids.length) {
      return "Each meter must have a unique slave ID.";
    }

    return "";
  };

  const saveConfig = async () => {
    const validationError = validateConfig();

    if (validationError) {
      notify(validationError, "error");
      return;
    }

    setSaving(true);

    // Preserve FastAPI-managed serial settings.
    const payload = {
      ...config,
      port: config.port,
      baudrate: Number(config.baudrate),
      poll_interval: Number(config.poll_interval),
      meters: config.meters.map((meter) => ({
        meter_name: String(meter.meter_name).trim(),
        slave_id: Number(meter.slave_id),
      })),
    };

    try {
      const response = await fetch(`${API}/api/meters/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.detail ||
            `Configuration save failed (${response.status})`
        );
      }

      if (data.status && data.status !== "success") {
        throw new Error(
          data.message || "The server rejected the configuration"
        );
      }

      const serverConfig = data.config || payload;

      setConfig({
        ...DEFAULT_CONFIG,
        ...serverConfig,
        port: serverConfig.port ?? payload.port,
        baudrate: Number(
          serverConfig.baudrate ?? payload.baudrate
        ),
        poll_interval: Number(
          serverConfig.poll_interval ?? payload.poll_interval
        ),
        meters: normalizeMeters(
          data.meters ??
            serverConfig.meters ??
            payload.meters
        ),
      });

      setConfigOpen(false);
      notify("Meter configuration saved.");
    } catch (error) {
      notify(
        error.message || "Could not save meter configuration",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const downloadCsv = () => {
    window.open(`${API}/api/meters/download-csv`, "_blank");
  };

  // Shared dimensions for the three toolbar buttons.
  const toolbarButtonSx = {
    minWidth: 100,
    minHeight: 28,
    height: 28,
    px: 1.75,
    py: 2.75,
    fontSize: 12.5,
    fontWeight: 600,
    
    whiteSpace: "nowrap",
    flexShrink: 0,
    "& .MuiButton-startIcon": {
      mr: 0.75,
    },
  };

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        pb: 1,
      }}
    >
      {/* Page toolbar */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1.5}
        sx={{
          mb: 2,
          width: "100%",
          minWidth: 0,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: { xs: 22, sm: 26 },
              fontWeight: 800,
              mb: 0.5,
              textAlign: "left",
            }}
          >
            AC Meter Monitor
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Live electrical readings from the configured Modbus meters.
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          alignItems="center"
          justifyContent={{ xs: "flex-start", sm: "flex-end" }}
          sx={{
            flexShrink: 0,
            width: { xs: "100%", sm: "auto" },
            ml: { sm: "auto" },
          }}
        >
          <Chip
            icon={
              <Box
                component="span"
                sx={{
                  width: 7,
                  height: 7,
                  ml: 1,
                  borderRadius: "10%",
                  bgcolor: socketConnected
                    ? "success.main"
                    : "error.main",
                }}
              />
            }
            label={socketConnected ? "LIVE" : "DISCONNECTED"}
            color={socketConnected ? "success" : "error"}
            variant="outlined"
            size="small"
            sx={{
              height: 29,
              fontSize: 11,
              alignSelf: "center",
            }}
          />

          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshRounded />}
            onClick={refreshPage}
            disabled={loading}
            sx={toolbarButtonSx}
          >
            Refresh
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadRounded />}
            onClick={downloadCsv}
            sx={{
              ...toolbarButtonSx,
              minWidth: 112,
            }}
          >
            Export CSV
          </Button>

          <Button
            size="small"
            variant="contained"
            startIcon={<SettingsRounded />}
            onClick={openConfig}
            sx={{
              ...toolbarButtonSx,
              minWidth: 108,
            }}
          >
            Configure
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Box
          sx={{
            minHeight: 220,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Stack alignItems="center" spacing={1.5}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              Connecting to meter service…
            </Typography>
          </Stack>
        </Box>
      ) : (
        <Stack spacing={2}>
          {/* Summary metrics + meters panel */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                lg: "minmax(0, 1fr) minmax(0, 1fr)",
              },
              gap: 1.5,
              width: "100%",
              minWidth: 0,
              alignItems: "stretch",
            }}
          >
            {/* Four metric cards */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gridTemplateRows: {
                  xs: "repeat(2, minmax(125px, auto))",
                  lg: "repeat(2, minmax(0, 1fr))",
                },
                gap: 1.5,
                minWidth: 0,
                minHeight: 0,
                alignContent: "stretch",
              }}
            >
              <MetricCard
                title="Total Power"
                value={formatNumber(totalPower)}
                unit="W"
                icon={<BoltRounded />}
                color={theme.palette.warning.main}
                subtitle="Combined online meters"
              />

              <MetricCard
                title="Total Current"
                value={formatNumber(totalCurrent)}
                unit="A"
                icon={<SpeedRounded />}
                color={theme.palette.info.main}
                subtitle="Sum of online meters"
              />

              <MetricCard
                title="Average Voltage"
                value={formatNumber(averageVoltage)}
                unit="V"
                icon={<TimelineRounded />}
                color={theme.palette.secondary.main}
                subtitle="Online meters only"
              />

              <MetricCard
                title="Meters Online"
                value={`${onlineMeters.length}/${config.meters.length}`}
                unit=""
                icon={<SensorsRounded />}
                color={theme.palette.success.main}
                subtitle="Current WebSocket readings"
              />
            </Box>

            {/* Meters panel */}
            <Card
              sx={{
                minWidth: 0,
                minHeight: { xs: 250, lg: 0 },
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderRadius: 2.5,
              }}
            >
              <CardContent
                sx={{
                  p: 2,
                  flex: 1,
                  minWidth: 0,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  "&:last-child": { pb: 2 },
                }}
              >
                {/* Heading left; Add meter aligned to the far right */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                    width: "100%",
                    mb: 1.5,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={800} fontSize={16}>
                      Meters
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {config.meters.length} configured
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddRounded />}
                    onClick={openConfig}
                    sx={{
                      ml: "auto",
                      flexShrink: 0,
                      minWidth: 112,
                      minHeight: 38,
                      height: 38,
                      px: 1.75,
                      py: 0.75,
                      fontSize: 12.5,
                      fontWeight: 600,
                      borderRadius: 2,
                      whiteSpace: "nowrap",
                      "& .MuiButton-startIcon": {
                        mr: 0.75,
                      },
                    }}
                  >
                    Add meter
                  </Button>
                </Box>

                <Divider />

                {/* Horizontally scrollable meter cards */}
                {displayMeters.length > 0 ? (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "stretch",
                      gap: 1.5,
                      flex: 1,
                      minWidth: 0,
                      minHeight: 0,
                      pt: 1.5,
                      pb: 1,
                      overflowX: "auto",
                      overflowY: "hidden",
                      overscrollBehaviorX: "contain",
                      WebkitOverflowScrolling: "touch",
                      scrollbarWidth: "thin",
                      scrollbarColor: `${theme.palette.divider} transparent`,
                      "&::-webkit-scrollbar": {
                        height: 6,
                      },
                      "&::-webkit-scrollbar-track": {
                        backgroundColor: "transparent",
                      },
                      "&::-webkit-scrollbar-thumb": {
                        backgroundColor: theme.palette.divider,
                        borderRadius: 10,
                      },
                    }}
                  >
                    {displayMeters.map((meter, index) => (
                      <MeterCard
                        key={`${meter.slave_id}-${meter.meter_name}-${index}`}
                        meter={meter}
                      />
                    ))}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      px: 2,
                      py: 3,
                    }}
                  >
                    <Box>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 3,
                          bgcolor: "action.hover",
                          color: "text.secondary",
                          display: "grid",
                          placeItems: "center",
                          mx: "auto",
                          mb: 1.5,
                        }}
                      >
                        <SensorsRounded sx={{ fontSize: 27 }} />
                      </Box>

                      <Typography fontWeight={700}>
                        No meters configured
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 0.5,
                          maxWidth: 260,
                          mx: "auto",
                        }}
                      >
                        Add a meter to start monitoring its live
                        electrical readings.
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Power trend */}
          <Card sx={{ borderRadius: 2.5 }}>
            <CardContent
              sx={{
                p: 2,
                "&:last-child": { pb: 1.5 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700}>
                    Total Power Trend
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Combined power reported by online meters
                  </Typography>
                </Box>

                <Select
                  size="small"
                  value={chartWindow}
                  onChange={(event) =>
                    setChartWindow(Number(event.target.value))
                  }
                  sx={{
                    minWidth: 145,
                    ml: "auto",
                    flexShrink: 0,
                    fontSize: 13,
                  }}
                  inputProps={{ "aria-label": "Time window" }}
                >
                  {WINDOW_OPTIONS.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              <Box sx={{ mt: 1.5, minWidth: 0 }}>
                {visibleHistory.length ? (
                  <ReactECharts
                    option={chartOption}
                    notMerge
                    lazyUpdate
                    style={{
                      height: 250,
                      width: "100%",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 250,
                      display: "grid",
                      placeItems: "center",
                      textAlign: "center",
                      px: 2,
                    }}
                  >
                    <Box>
                      <TimelineRounded
                        sx={{
                          fontSize: 34,
                          color: "text.disabled",
                          mb: 1,
                        }}
                      />

                      <Typography
                        fontWeight={600}
                        color={
                          backendStatus === "stopped"
                            ? "error.main"
                            : "text.primary"
                        }
                      >
                        {backendStatus === "checking"
                          ? "Checking backend status…"
                          : backendStatus === "stopped"
                            ? "Backend is not running"
                            : socketConnected
                              ? "Waiting for live readings"
                              : "Connecting to live meter service…"}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {backendStatus === "checking"
                          ? "Checking whether the FastAPI service is reachable."
                          : backendStatus === "stopped"
                            ? "Start the GoGreen backend service to receive live meter readings."
                            : socketConnected
                              ? "The backend is running, but no live meter data has been received yet."
                              : "The backend is running. Reconnecting to the meter WebSocket…"}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Existing BottomSheet component for meter configuration */}
      <BottomSheet
        open={configOpen}
        onClose={closeConfig}
        title="Manage meters"
        height="min(82vh, 760px)"
        width="min(680px, 100%)"
      >
        <Stack spacing={2}>
          {/* Intro */}
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.25}
              sx={{ mb: 1 }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <ElectricMeterRounded />
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700}>
                  Configure your meters
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Add, edit, or remove Modbus meters.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Configured meter list */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700}>
                Configured meters
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
              >
                Slave IDs must be unique and between 1 and 247.
              </Typography>
            </Box>

            <Chip
              size="small"
              label={`${config.meters.length} meters`}
              variant="outlined"
            />
          </Box>

          {config.meters.length > 0 ? (
            <Stack spacing={1.25}>
              {config.meters.map((meter, index) => (
                <Card
                  key={`${index}-${meter.meter_name}`}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    boxShadow: "none",
                  }}
                >
                  <CardContent
                    sx={{
                      p: 1.5,
                      "&:last-child": { pb: 1.5 },
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      spacing={1}
                    >
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 2,
                          bgcolor: "action.hover",
                          color: "text.secondary",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          mt: 0.25,
                        }}
                      >
                        <ElectricMeterRounded fontSize="small" />
                      </Box>

                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "minmax(0, 1fr)",
                            sm: "minmax(0, 1.4fr) minmax(95px, 0.8fr)",
                          },
                          alignItems: "start",
                          gap: 1,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <TextField
                          fullWidth
                          size="small"
                          label="Meter name"
                          value={meter.meter_name}
                          onChange={(event) =>
                            updateMeter(
                              index,
                              "meter_name",
                              event.target.value
                            )
                          }
                        />

                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Slave ID"
                          value={meter.slave_id ?? ""}
                          onChange={(event) =>
                            updateMeter(
                              index,
                              "slave_id",
                              event.target.value
                            )
                          }
                          slotProps={{
                            htmlInput: {
                              min: 1,
                              max: 247,
                              step: 1,
                            },
                          }}
                        />
                      </Box>

                      <Tooltip title="Remove meter">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeMeter(index)}
                            disabled={
                              saving || config.meters.length <= 1
                            }
                            aria-label={`Remove ${meter.meter_name}`}
                            sx={{ mt: 0.25 }}
                          >
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Box
              sx={{
                py: 4,
                px: 2,
                textAlign: "center",
                border: 1,
                borderStyle: "dashed",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <SensorsRounded
                sx={{
                  fontSize: 34,
                  color: "text.disabled",
                  mb: 1,
                }}
              />

              <Typography fontWeight={700}>
                No meters configured
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Add your first meter to get started.
              </Typography>
            </Box>
          )}

          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddRounded />}
            onClick={addMeter}
            disabled={saving}
            sx={{
              minHeight: 40,
              borderStyle: "dashed",
              borderRadius: 2,
              fontWeight: 600,
            }}
          >
            Add another meter
          </Button>

          {/* Actions */}
          <Divider />

          <Stack
            direction="row"
            justifyContent="flex-end"
            spacing={1}
            sx={{
              pt: 0.5,
              pb: 1,
            }}
          >
            <Button
              variant="outlined"
              onClick={closeConfig}
              disabled={saving}
              sx={{
                minWidth: 100,
                minHeight: 40,
                px: 2,
                borderRadius: 2,
              }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              startIcon={
                saving ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <SaveRounded />
                )
              }
              onClick={saveConfig}
              disabled={saving}
              sx={{
                minWidth: 140,
                minHeight: 40,
                px: 2,
                borderRadius: 2,
                fontWeight: 600,
              }}
            >
              {saving ? "Saving…" : "Save meters"}
            </Button>
          </Stack>
        </Stack>
      </BottomSheet>
    </Box>
  );
}
