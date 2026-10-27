import React, { useRef, useState, useLayoutEffect } from 'react'
import AppLayout from '../../components/AppLayout'
import { Card, CardContent, CardActions, Box, Stack, Typography, Button, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import BatteryChargingFullOutlinedIcon from '@mui/icons-material/BatteryChargingFullOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import CycleParticipantReport from './CycleParticipantReport'
import CycleComparision from './CycleComparision'
const CARD_WIDTH = 340
const CARD_HEIGHT = 280
const GAP = 24 // matches theme spacing 3 (3 * 8px)

// `palette` must be a key of theme.palette (primary, secondary, success, info, warning, error)
const reports = [
  {
    id: 'cycle-participants',
    title: '1. Cycle Participants Report',
    description:
      'Participant-wise scoring, power, voltage, current, cycle number, and recorded date.',
    icon: GroupsOutlinedIcon,
    palette: 'success',
  },
  {
    id: 'cycle-comparison',
    title: '2. Cycle Comparison',
    description:
      'Compare two or more cycles by total participants, average power, voltage, current, and energy generated. Include difference and percentage change.',
    icon: ShowChartIcon,
    palette: 'info',
  },
  {
    id: 'power-generation',
    title: '3. Power Generation Report',
    description:
      'Track generated power and energy over time, including daily or cycle-wise totals, peak power, and generation trends.',
    icon: BoltOutlinedIcon,
    palette: 'warning',
  },
  {
    id: 'participant-ranking',
    title: '4. Participant Performance & Ranking',
    description:
      'Rank participants by power or energy generated, show top performers, and compare individual performance across cycles.',
    icon: EmojiEventsOutlinedIcon,
    palette: 'secondary',
  },
  {
    id: 'meter-readings',
    title: '5. Meter Readings & Data History',
    description:
      'View recorded power, voltage, and amperage readings by participant, cycle, and date. Useful for reviewing manual scoring and identifying missing readings.',
    icon: AssignmentOutlinedIcon,
    palette: 'primary',
  },
  {
    id: 'cycle-trend',
    title: '6. Cycle Trend Analysis',
    description:
      'Show how total power, average voltage, and participation change across cycles, with line charts for each metric.',
    icon: TimelineOutlinedIcon,
    palette: 'info',
  },
  {
    id: 'efficiency',
    title: '7. Efficiency & Output Report',
    description:
      'Compare expected and actual energy output per participant, with efficiency percentage and variance from the cycle average.',
    icon: SpeedOutlinedIcon,
    palette: 'success',
  },
  {
    id: 'battery-status',
    title: '8. Battery & Storage Status',
    description:
      'Review charge levels, storage capacity used, and energy stored or discharged for each participant and cycle.',
    icon: BatteryChargingFullOutlinedIcon,
    palette: 'primary',
  },
  {
    id: 'anomaly-log',
    title: '9. Anomaly & Error Log',
    description:
      'List readings with out-of-range voltage or current, duplicate entries, and missing values flagged during data entry.',
    icon: WarningAmberOutlinedIcon,
    palette: 'error',
  },
  {
    id: 'audit-history',
    title: '10. Scoring Audit History',
    description:
      'Track who entered or edited each score and reading, with timestamps and the previous values for each change.',
    icon: HistoryOutlinedIcon,
    palette: 'secondary',
  },
]
// Returns how many fixed-width cards fit in the container, capped at the item count
function useColumnCount(ref, itemCount) {
  const [columns, setColumns] = useState(1)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const available = el.clientWidth
      const fit = Math.max(1, Math.floor((available + GAP) / (CARD_WIDTH + GAP)))
      setColumns(Math.min(itemCount, fit))
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, itemCount])

  return columns
}

function ReportCard({ report, onView, onDownload }) {
  const theme = useTheme()
  const Icon = report.icon
  const accent = theme.palette[report.palette].main
  

  return (
    <Card
      variant="outlined"
      sx={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        transition: theme.transitions.create(['box-shadow', 'transform'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          boxShadow: theme.shadows[3],
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3, overflow: 'hidden' }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              flexShrink: 0,
              borderRadius: `${theme.shape.borderRadius}px`,
              bgcolor: alpha(accent, 0.12),
              color: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon />
          </Box>

          <Typography
            variant="subtitle1"
            fontWeight={theme.typography.fontWeightMedium}
            sx={{ lineHeight: 1.3 }}
          >
            {report.title}
          </Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {report.description}
        </Typography>
      </CardContent>

      <CardActions sx={{ px: 3, pb: 3, pt: 0, gap: 1, mt: 'auto' }}>
        <Button
          variant="contained"
          size="small"
          disableElevation
          onClick={() => onView(report)}
        >
          View report
        </Button>

        <Button
          variant="outlined"
          size="small"
          color="inherit"
          onClick={() => onDownload(report)}
        >
          Download options
        </Button>
      </CardActions>
    </Card>
  )
}
function Reports() {
  const gridRef = useRef(null)
  const columns = useColumnCount(gridRef, reports.length)
const [report,setReport] = useState('')

  const handleOpen = (report) => {
    setReport(report)
  }
  const handleView = (report) => {
    console.log('View report:', report)
    setReport(report.id)
    // TODO: navigate to or open the report
  }

  const handleDownload = (report) => {
    console.log('Download options:', report.id)
    // TODO: open download options menu/dialog
  }

  return (
    <AppLayout title={'Reports'}>
      <Box sx={{ p: 3 }}>
        <Box
          ref={gridRef}
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, ${CARD_WIDTH}px)`,
            gap: `${GAP}px`,
            justifyContent: 'center',
          }}
        >
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onView={handleView}
              onDownload={handleDownload}
            />
          ))}
        </Box>
      </Box>
        {report === "cycle-participants" && (
            <CycleParticipantReport open={true} onClose={() => setReport("")} />
          )}

          {report === "cycle-comparison" && (
            <CycleComparision open={true} onClose={() => setReport("")} />
          )}
    </AppLayout>
  )
}

export default Reports