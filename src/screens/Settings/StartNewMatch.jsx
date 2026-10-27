/**
 * StartNewMatch.jsx
 * Tauri v2 · MUI · React 18
 *
 * Resets the backend database for a new match:
 *   Review  — shows what will happen (backup dest is auto-resolved, no folder picker)
 *   Reset   — live progress as Rust runs backup → stop servers → delete db → migrate
 *   Done
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  Box, Stack, Typography, Paper, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';

// ─── Theme (matches theme.js) ──────────────────────────────────────────────
const C = {
  primary:        '#064E3B',
  primaryLight:   '#047857',
  primaryLighter: '#D1FAE5',
  primaryPale:    '#ECFDF5',
  secondary:      '#047857',
  bg:             '#EFF1FF',
  paper:          '#FFFFFF',
  border:         '#D9DEEE',
  borderLight:    '#E2E8F0',
  textPrimary:    '#0F172A',
  textSecondary:  '#475569',
  textMuted:      '#64748B',
  surfaceSubtle:  '#F4F6FF',
  success:        '#10B981',
  successDark:    '#065F46',
  successBg:      '#ECFDF5',
  warning:        '#F59E0B',
  warningBg:      '#FEF3C7',
  warningDark:    '#92400E',
  error:          '#DC2626',
  errorBg:        '#FEE2E2',
  errorDark:      '#B91C1C',
};

const MonoText = ({ children, sx, component = 'span', ...rest }) => (
  <Typography component={component} sx={{ fontFamily: '"JetBrains Mono", monospace', ...sx }} {...rest}>
    {children}
  </Typography>
);

const SCard = ({ children, sx, ...rest }) => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 2, sm: 2.5, md: 3 },
      border: `1px solid ${C.border}`,
      borderRadius: { xs: '12px', sm: '14px' },
      bgcolor: C.paper,
      boxShadow: '0 2px 10px rgba(15,23,42,0.035)',
      width: '100%',
      boxSizing: 'border-box',
      ...sx,
    }}
    {...rest}
  >
    {children}
  </Paper>
);

const CardTitle = ({ title, subtitle, action }) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
    justifyContent="space-between"
    gap={1.5}
    mb={{ xs: 2, sm: 2.5 }}
  >
    <Box>
      <Typography sx={{ color: C.textPrimary, fontWeight: 700, fontSize: { xs: 15, sm: 16.5 } }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ color: C.textSecondary, mt: 0.4, fontSize: { xs: 12.5, sm: 13 } }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {action}
  </Stack>
);

const ICON_META = {
  backup:  'backup',
  stop:    'stop_circle',
  delete:  'delete',
  migrate: 'play_circle',
};

const STEP_META = {
  backup:  { label: 'Back up database' },
  stop:    { label: 'Stop running servers' },
  delete:  { label: 'Delete current database' },
  migrate: { label: 'Run migrations' },
};

function ActionRow({ icon, label, detail, tone = 'default', isLast = false }) {
  const toneColor = tone === 'caution' ? C.warningDark : tone === 'muted' ? C.textMuted : C.primary;
  const toneBg = tone === 'caution' ? C.warningBg : tone === 'muted' ? C.surfaceSubtle : C.primaryLighter;
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.75}
      sx={{
        py: { xs: 1.5, sm: 1.75 },
        ...(isLast ? {} : { borderBottom: `1px solid ${C.borderLight}` }),
      }}
    >
      <Box sx={{
        width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: toneBg, color: toneColor,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 19, lineHeight: 1 }}>{icon}</span>
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: { xs: 13, sm: 13.5 }, fontWeight: 600, color: C.textPrimary, lineHeight: 1.4 }}>
          {label}
        </Typography>
        <Typography sx={{
          fontSize: { xs: 12, sm: 12.5 }, color: C.textSecondary,
          wordBreak: 'break-word', mt: 0.3, lineHeight: 1.45,
        }}>
          {detail}
        </Typography>
      </Box>
    </Stack>
  );
}

function shortName(p) {
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1];
}

export default function StartNewMatch() {
  const [stage, setStage] = useState('loading'); // loading | review | running | done | error
  const [dbPath, setDbPath] = useState(null);
  const [backupBaseDir, setBackupBaseDir] = useState(null);
  const [serverStatus, setServerStatus] = useState({ django: false, fastapi: false });
  const [progress, setProgress] = useState({});
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const unlistenRef = useRef(null);

  const load = useCallback(async () => {
    setStage('loading');
    try {
      const [db, backupDir, status] = await Promise.all([
        invoke('find_db_path'),
        invoke('get_backup_base_dir'),
        invoke('check_server_status'),
      ]);
      setDbPath(db);
      setBackupBaseDir(backupDir);
      setServerStatus(status);
      setStage('review');
    } catch (err) {
      setLoadError(String(err));
      setStage('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const plannedSteps = React.useMemo(() => {
    const steps = [];
    if (dbPath) steps.push('backup');
    if (serverStatus.django || serverStatus.fastapi) steps.push('stop');
    if (dbPath) steps.push('delete');
    steps.push('migrate');
    return steps;
  }, [dbPath, serverStatus]);

  async function handleConfirm() {
    setConfirmOpen(false);
    setStage('running');
    setProgress(Object.fromEntries(plannedSteps.map((s) => [s, { status: 'pending', detail: null }])));

    const unlisten = await listen('new-match-progress', (event) => {
      const { step, status, detail } = event.payload;
      setProgress((prev) => ({ ...prev, [step]: { status, detail } }));
    });
    unlistenRef.current = unlisten;

    try {
      const res = await invoke('run_new_match', { skipBackup: !dbPath });
      setResult(res);
      setStage('done');
    } catch (err) {
      setResult({ ok: false, errors: [String(err)], backup_path: null });
      setStage('done');
    } finally {
      if (unlistenRef.current) { unlistenRef.current(); unlistenRef.current = null; }
    }
  }

  useEffect(() => () => { if (unlistenRef.current) unlistenRef.current(); }, []);

  const outerSx = {
    width: '100%',
    maxWidth: 720,
    mx: 'auto',
    px: { xs: 1.5, sm: 2, md: 0 },
  };

  if (stage === 'loading') {
    return (
      <Box sx={outerSx}>
        <SCard sx={{ textAlign: 'center', py: { xs: 5, sm: 7 } }}>
          <Typography sx={{ color: C.textSecondary, fontSize: { xs: 13, sm: 14 } }}>
            Checking current database and server status…
          </Typography>
        </SCard>
      </Box>
    );
  }

  if (stage === 'error') {
    return (
      <Box sx={outerSx}>
        <SCard sx={{ textAlign: 'center', py: { xs: 5, sm: 7 } }}>
          <Typography sx={{ color: C.error, fontWeight: 600, mb: 1, fontSize: { xs: 14, sm: 15 } }}>
            Couldn&apos;t load match status
          </Typography>
          <Typography sx={{ color: C.textSecondary, fontSize: { xs: 12, sm: 13 }, wordBreak: 'break-word' }}>
            {loadError}
          </Typography>
          <Button variant="outlined" sx={{ mt: 2.5 }} onClick={load}>Retry</Button>
        </SCard>
      </Box>
    );
  }

  const running = [serverStatus.django && 'Django', serverStatus.fastapi && 'FastAPI'].filter(Boolean);

  return (
    <Box sx={outerSx}>
      <Stack gap={{ xs: 2, sm: 2.5 }}>
        {stage === 'review' && (
          <SCard>
            <CardTitle
              title="Review and confirm"
              subtitle="Nothing has happened yet. This is what will run when you confirm."
            />

            <Box sx={{
              border: `1px solid ${C.borderLight}`,
              borderRadius: '12px',
              px: { xs: 1.5, sm: 2 },
              bgcolor: C.surfaceSubtle,
            }}>
              <ActionRow
                icon={ICON_META.backup}
                label={dbPath ? 'Back up database' : 'Skip backup'}
                detail={dbPath ? `${shortName(dbPath)} → ${backupBaseDir}` : 'No database file found — nothing to back up.'}
              />
              <ActionRow
                icon={ICON_META.stop}
                label={running.length ? 'Stop servers' : 'No servers to stop'}
                detail={running.length ? running.join(' + ') : 'Both servers are already stopped.'}
                tone={running.length ? 'caution' : 'muted'}
              />
              <ActionRow
                icon={ICON_META.delete}
                label="Delete current database"
                detail={dbPath || 'No database file found — skipping.'}
                tone="caution"
              />
              <ActionRow
                icon={ICON_META.migrate}
                label="Run migrations"
                detail="python manage.py migrate — creates a fresh database"
                isLast
              />
            </Box>

            <Stack direction="row" alignItems="flex-start" spacing={1.1} sx={{
              mt: 2, p: 1.5, borderRadius: '10px',
              bgcolor: C.warningBg, color: C.warningDark,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, lineHeight: '20px' }}>info</span>
              <Typography sx={{ fontSize: { xs: 12, sm: 12.5 }, color: 'inherit', lineHeight: 1.5 }}>
                This permanently deletes the current database. A backup is saved automatically to{' '}
                <MonoText sx={{ fontSize: { xs: 11.5, sm: 12 }, color: 'inherit' }}>{backupBaseDir}</MonoText> first.
              </Typography>
            </Stack>

            <Stack alignItems="center" sx={{ mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => setConfirmOpen(true)}
                sx={{
                  fontWeight: 700,
                  bgcolor: C.primary,
                  '&:hover': { bgcolor: C.successDark },
                  width: { xs: '100%', sm: 'auto' },
                  minWidth: { sm: 240 },
                  px: 4,
                  py: 1.2,
                  borderRadius: '10px',
                  boxShadow: '0 4px 14px rgba(6,78,59,0.18)',
                }}
                startIcon={<span className="material-symbols-outlined" style={{ fontSize: 20 }}>restart_alt</span>}
              >
                Reset database
              </Button>
            </Stack>
          </SCard>
        )}

        {stage === 'running' && (
          <SCard>
            <CardTitle title="Resetting — please wait…" subtitle="Each step updates as it completes." />
            <Stack spacing={0.5}>
              {plannedSteps.map((step) => {
                const state = progress[step] || { status: 'pending' };
                const color = state.status === 'ok' ? C.success : state.status === 'error' ? C.error : C.textMuted;
                const icon = state.status === 'ok' ? 'check_circle' : state.status === 'error' ? 'cancel' : 'hourglass_empty';
                return (
                  <Stack key={step} direction="row" alignItems="center" spacing={1.5} sx={{ py: 1 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color, lineHeight: 1 }}>{icon}</span>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: { xs: 12.5, sm: 13 }, fontWeight: 600, color }}>
                        {STEP_META[step]?.label || step}
                      </Typography>
                      {state.detail && state.status === 'error' && (
                        <Typography sx={{ fontSize: { xs: 11.5, sm: 12 }, color: C.error, mt: 0.25 }}>
                          {state.detail}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                );
              })}
            </Stack>
          </SCard>
        )}

        {stage === 'done' && (
          <SCard>
            <CardTitle title={result?.ok ? 'All done — ready for the next match!' : 'Finished with some issues'} />
            {result?.ok ? (
              <>
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: C.success, lineHeight: 1 }}>
                    check_circle
                  </span>
                  <Typography sx={{ fontWeight: 700, color: C.successDark, fontSize: { xs: 13.5, sm: 14.5 } }}>
                    Database reset complete.
                  </Typography>
                </Stack>
                <Typography sx={{ color: C.textSecondary, fontSize: { xs: 12.5, sm: 13.5 }, lineHeight: 1.6 }}>
                  {result?.backup_path
                    ? `The previous database was saved to ${backupBaseDir}.`
                    : 'No previous database existed to back up.'}{' '}
                  A fresh database has been created. You can launch the servers now.
                </Typography>
                <Chip
                  label="Ready"
                  size="small"
                  sx={{
                    mt: 2, bgcolor: C.primaryLighter, color: C.primary, fontWeight: 600,
                    '& .MuiChip-label': { px: 1.5 },
                  }}
                />
              </>
            ) : (
              <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: C.errorBg, color: C.errorDark, fontSize: { xs: 12, sm: 12.5 } }}>
                {result?.errors?.map((e, i) => <div key={i} style={{ marginBottom: 4 }}>• {e}</div>)}
              </Box>
            )}

            <Stack alignItems="center" sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                onClick={load}
                sx={{
                  width: { xs: '100%', sm: 'auto' },
                  minWidth: { sm: 220 },
                  px: 3.5, py: 1.1,
                  borderRadius: '10px',
                  fontWeight: 600,
                }}
              >
                Start another reset
              </Button>
            </Stack>
          </SCard>
        )}
      </Stack>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: '14px', width: '100%', maxWidth: 420, mx: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
            bgcolor: C.warningBg, color: C.warningDark,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>warning</span>
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: 15, sm: 16 }, color: C.textPrimary }}>
            Reset the database?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Typography sx={{ fontSize: { xs: 13, sm: 13.5 }, color: C.textSecondary, lineHeight: 1.6 }}>
            {dbPath
              ? `The current database will be backed up to ${backupBaseDir}, then deleted and recreated. This can't be undone from here.`
              : 'A fresh database will be created. No existing database was found to back up or delete.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} sx={{ color: C.textSecondary }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            sx={{ bgcolor: C.warning, color: '#fff', fontWeight: 700, '&:hover': { bgcolor: '#C2730A' } }}
          >
            Yes, reset database
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}