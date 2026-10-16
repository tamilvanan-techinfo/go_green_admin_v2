
import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Box,
  Typography,
  TextField,
  Chip,
  Autocomplete,
  Button,
  Divider,
  Stack,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material'
import TuneIcon from '@mui/icons-material/Tune'
import api from '../../config.json'
import BottomSheet from '../../components/BottonSheet'

const WS_URL = (() => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://127.0.0.1:8000/ws/power-monitor/admin/`
})()

const ACTIVE_PARTICIPENT_URL =
  `${api.apiBase}/screens/active-participent/`

const PARTICIPENT_CYCLE_URL =
  `${api.apiBase}/screens/participent-cycle/`

function LiveGraphControl({ isOpened, setControlFor }) {
  const socketRef = useRef(null)

  const [connected, setConnected] = useState(false)
  const [minutes, setMinutes] = useState('')
  const [cycles, setCycles] = useState([])
  const [isAutoRanking, setIsAutoRanking] = useState(true)
  const [numberOfParticipant, setNumberOfParticipant] = useState('4')

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const [cycleOptions, setCycleOptions] = useState([])
  const [participantsByCycle, setParticipantsByCycle] = useState({})

  // Close the bottom sheet using the parent's controller.
  const handleClose = useCallback(() => {
    if (typeof setControlFor === 'function') {
      setControlFor(false)
    }
  }, [setControlFor])

  // Load active settings and participant cycles when opened.
  useEffect(() => {
    if (!isOpened) return undefined

    let cancelled = false

    const loadSettings = async () => {
      setLoading(true)
      setFeedback(null)

      try {
        const [configResponse, cyclesResponse] = await Promise.all([
          fetch(ACTIVE_PARTICIPENT_URL),
          fetch(PARTICIPENT_CYCLE_URL),
        ])

        if (!configResponse.ok || !cyclesResponse.ok) {
          throw new Error('Unable to fetch settings')
        }

        const [activeConfig, participantCycles] = await Promise.all([
          configResponse.json(),
          cyclesResponse.json(),
        ])

        if (cancelled) return

        setMinutes(String(activeConfig?.duration ?? ''))
        setCycles(
          Array.isArray(activeConfig?.cycles)
            ? activeConfig.cycles.map(String)
            : []
        )
        setIsAutoRanking(activeConfig?.is_auto_ranking ?? true)
        setNumberOfParticipant(
          String(activeConfig?.number_of_participant ?? 4)
        )

        const grouped = {}

        ;(Array.isArray(participantCycles) ? participantCycles : []).forEach(
          (row) => {
            if (row?.cycle == null) return

            const cycle = String(row.cycle)

            if (!grouped[cycle]) {
              grouped[cycle] = []
            }

            if (row.name) {
              grouped[cycle].push(row.name)
            }
          }
        )

        setParticipantsByCycle(grouped)

        setCycleOptions(
          Object.keys(grouped).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
          )
        )
      } catch (error) {
        if (!cancelled) {
          setFeedback({
            type: 'error',
            message: 'Could not load current settings.',
          })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSettings()

    return () => {
      cancelled = true
    }
  }, [isOpened])

  // Connect to the admin WebSocket only while the sheet is open.
  useEffect(() => {
    if (!isOpened) return undefined

    let socket

    try {
      socket = new WebSocket(WS_URL)
      socketRef.current = socket
    } catch {
      setConnected(false)
      setFeedback({
        type: 'error',
        message: 'Could not create the WebSocket connection.',
      })
      return undefined
    }

    socket.onopen = () => {
      setConnected(true)
    }

    socket.onclose = () => {
      setConnected(false)
      setSaving(false)
    }

    socket.onerror = () => {
      setConnected(false)
    }

    socket.onmessage = (event) => {
      let payload

      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }

      if (payload.type === 'config_updated') {
        setSaving(false)

        if (payload.minutes != null) {
          setMinutes(String(payload.minutes))
        }

        if (Array.isArray(payload.cycles)) {
          setCycles(payload.cycles.map(String))
        }

        if (payload.is_auto_ranking != null) {
          setIsAutoRanking(payload.is_auto_ranking)
        }

        if (payload.number_of_participant != null) {
          setNumberOfParticipant(
            String(payload.number_of_participant)
          )
        }

        setFeedback({
          type: 'success',
          message: 'Settings updated successfully.',
        })
      }

      if (payload.type === 'error') {
        setSaving(false)

        setFeedback({
          type: 'error',
          message: payload.message || 'Something went wrong.',
        })
      }
    }

    return () => {
      socket.onopen = null
      socket.onclose = null
      socket.onerror = null
      socket.onmessage = null

      if (
        socket.readyState === WebSocket.CONNECTING ||
        socket.readyState === WebSocket.OPEN
      ) {
        socket.close()
      }

      if (socketRef.current === socket) {
        socketRef.current = null
      }

      setConnected(false)
    }
  }, [isOpened])

  // Save settings through the existing admin WebSocket.
  const handleSave = useCallback(() => {
    const socket = socketRef.current

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setFeedback({
        type: 'error',
        message: 'Not connected yet. Try again in a moment.',
      })
      return
    }

    const parsedMinutes = Number(minutes)

    if (
      minutes.trim() === '' ||
      !Number.isInteger(parsedMinutes) ||
      parsedMinutes < 1 ||
      parsedMinutes > 1440
    ) {
      setFeedback({
        type: 'error',
        message: 'Enter a whole number of minutes between 1 and 1440.',
      })
      return
    }

    let parsedNumberOfParticipant = null

    if (isAutoRanking) {
      parsedNumberOfParticipant = Number(numberOfParticipant)

      if (
        numberOfParticipant.trim() === '' ||
        !Number.isInteger(parsedNumberOfParticipant) ||
        parsedNumberOfParticipant < 1 ||
        parsedNumberOfParticipant > 1000
      ) {
        setFeedback({
          type: 'error',
          message: 'Enter a whole number of participants between 1 and 1000.',
        })
        return
      }
    }

    setSaving(true)
    setFeedback(null)

    socket.send(
      JSON.stringify({
        minutes: parsedMinutes,
        cycles,
        is_auto_ranking: isAutoRanking,
        ...(isAutoRanking
          ? {
              number_of_participant: parsedNumberOfParticipant,
            }
          : {}),
      })
    )
  }, [minutes, cycles, isAutoRanking, numberOfParticipant])

  return (
    <Box
    sx={{display:'flex',justifyContent:'center',alignItems:'center'}}
    >
        <BottomSheet
      title="Live Readings Settings"
      isOpened={isOpened}
      onClose={handleClose}
      height='65vh'
      width='30%'
    >
      <Box sx={{ width: '100%', p: 2, boxSizing: 'border-box' }}>
   

        {loading ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ py: 6 }}
          >
            <CircularProgress size={28} />

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2 }}
            >
              Loading live settings...
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={3}>
            <TextField
              label="Window (minutes)"
              type="number"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              slotProps={{
                htmlInput: { min: 1, max: 1440, step: 1 },
              }}
              helperText="How far back the chart looks."
              fullWidth
            />

            
                <Autocomplete
                multiple
                options={cycleOptions}
                value={cycles}
                onChange={(_, value) => setCycles(value)}
                getOptionLabel={(option) => `Cycle ${option}`}
                isOptionEqualToValue={(option, value) =>
                    String(option) === String(value)
                }
                disablePortal
                slotProps={{
                    popper: {
                    sx: {
                        zIndex: 100001,
                    },
                    },
                    paper: {
                    sx: {
                        zIndex: 100001,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                    },
                    },
                    listbox: {
                    sx: {
                        maxHeight: 240,
                        overflowY: "auto",
                    },
                    },
                }}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                    <Chip
                        label={`Cycle ${option}`}
                        size="small"
                        {...getTagProps({ index })}
                        key={option}
                    />
                    ))
                }
                renderOption={(props, option) => (
                    <li {...props} key={option}>
                    <Stack spacing={0.5}>
                        <Typography variant="body2">
                        {`Cycle ${option}`}
                        </Typography>

                        {participantsByCycle[option]?.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                            {participantsByCycle[option].join(", ")}
                        </Typography>
                        )}
                    </Stack>
                    </li>
                )}
                renderInput={(params) => (
                    <TextField
                    {...params}
                    label="Cycles"
                    placeholder={cycles.length ? "" : "All cycles"}
                    helperText="Leave empty to include every cycle."
                    />
                )}
                />


            <Divider />

            <FormControlLabel
              control={
                <Switch
                  checked={isAutoRanking}
                  onChange={(event) =>
                    setIsAutoRanking(event.target.checked)
                  }
                />
              }
              label="Auto rank participants"
            />

            {isAutoRanking && (
              <TextField
                label="Number of participants to rank"
                type="number"
                value={numberOfParticipant}
                onChange={(event) =>
                  setNumberOfParticipant(event.target.value)
                }
                slotProps={{
                  htmlInput: { min: 1, max: 1000, step: 1 },
                }}
                helperText="Show only the top N participants."
                fullWidth
              />
            )}

            {feedback && (
              <Alert
                severity={feedback.type}
                onClose={() => setFeedback(null)}
              >
                {feedback.message}
              </Alert>
            )}

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleClose}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                fullWidth
                onClick={handleSave}
                disabled={!connected || saving}
                startIcon={
                  saving ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : null
                }
              >
                {saving ? 'Saving...' : 'Save settings'}
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </BottomSheet>
    </Box>
  )
}

export default LiveGraphControl
