import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Paper,
  TextField,
  Typography,
  Stack,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Slider,
  Chip,
  Divider,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  useTheme,
  alpha,
} from '@mui/material'
import Select from 'react-select'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import ImageRoundedIcon from '@mui/icons-material/ImageRounded'
import HistoryIcon from '@mui/icons-material/History'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import PreviewIcon from '@mui/icons-material/Visibility'
import { useSocket } from '../../context/SocketContext'
import axios from 'axios'
import api from '../../config.json'

const DISPLAY_URL = 'http://localhost:1029/#/free-text'
const API_ORIGIN = api.apiBase
const FREE_TEXT_LOCAL_KEY = 'free_text_editor_state'

const GOOGLE_FONTS = [
  'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Inter',
  'Nunito', 'Raleway', 'Work Sans', 'Rubik', 'Manrope', 'Barlow',
  'Playfair Display', 'Merriweather', 'Lora', 'PT Serif', 'Cormorant Garamond',
  'Libre Baskerville', 'Crimson Text',
  'Roboto Mono', 'Source Code Pro', 'JetBrains Mono', 'IBM Plex Mono', 'Space Mono',
  'Bebas Neue', 'Anton', 'Oswald', 'Righteous', 'Alfa Slab One', 'Bungee',
  'Passion One', 'Fjalla One',
  'Pacifico', 'Dancing Script', 'Great Vibes', 'Caveat', 'Sacramento',
  'Shadows Into Light', 'Satisfy',
]

const FONT_OPTIONS = [
  { value: 'inherit', label: 'Inter (MUI Enterprise Standard)', category: 'System' },
  { value: '"Roboto", sans-serif', label: 'Roboto', category: 'Google Fonts' },
  ...GOOGLE_FONTS.map(name => ({ value: `"${name}", sans-serif`, label: name, category: 'Google Fonts' })),
]

const QUICK_ANNOUNCEMENTS = ['Welcome Greeting', 'Sprint Countdown', 'Award Ceremony']

const MAX_LEN = 280

const DEFAULT_STYLE = {
  fontSize: 40,
  color: '#ffffff',
  fontFamily: 'inherit',
  bgColor: '#000000',
  bgImage: '',
}

function ensureGoogleFontLoaded(fontFamily) {
  if (!fontFamily || fontFamily === 'inherit') return
  const match = fontFamily.match(/^"?([^",]+)"?/)
  const fontName = match?.[1]?.trim()
  if (!fontName || !GOOGLE_FONTS.includes(fontName)) return
  const id = `gf-${fontName.replace(/ /g, '-')}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}&display=swap`
  document.head.appendChild(link)
}

function formatTime(d) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function buildSelectStyles(theme) {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: 38,
      backgroundColor: 'transparent',
      borderColor: state.isFocused ? theme.palette.primary.main : theme.palette.divider,
      borderRadius: 8,
      boxShadow: 'none',
      fontSize: 13,
      '&:hover': { borderColor: theme.palette.primary.main },
    }),
    menu: base => ({ ...base, backgroundColor: theme.palette.background.paper, zIndex: 20, borderRadius: 8 }),
    menuList: base => ({ ...base, maxHeight: 280 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? alpha(theme.palette.primary.main, 0.16)
        : state.isFocused
        ? alpha(theme.palette.primary.main, 0.08)
        : 'transparent',
      color: theme.palette.text.primary,
      fontSize: 13,
      cursor: 'pointer',
    }),
    singleValue: base => ({ ...base, color: theme.palette.text.primary, fontFamily: 'inherit', fontSize: 13 }),
    input: base => ({ ...base, color: theme.palette.text.primary, fontSize: 13 }),
    placeholder: base => ({ ...base, color: theme.palette.text.secondary, fontSize: 13 }),
    indicatorSeparator: base => ({ ...base, backgroundColor: theme.palette.divider }),
    dropdownIndicator: base => ({ ...base, color: theme.palette.text.secondary }),
  }
}

function FreeText() {
  const theme = useTheme()
  const { send } = useSocket()

  const draftRef = useRef('')
  const inputRef = useRef(null)
  const previewTimerRef = useRef(null)
  const webviewRef = useRef(null)

  const [draftCount, setDraftCount] = useState(0)
  const [previewText, setPreviewText] = useState('')
  const [content, setContent] = useState('')
  const [publishedAt, setPublishedAt] = useState(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [draftStyle, setDraftStyle] = useState(DEFAULT_STYLE)
  const [style, setStyle] = useState(DEFAULT_STYLE)
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [draftBgImageUrl, setDraftBgImageUrl] = useState('')
  const [uppercase, setUppercase] = useState(false)
  const [draftId, setDraftId] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const isElectron = typeof window !== 'undefined' && !!window.process?.versions?.electron

  const setDraftValue = useCallback((text) => {
    draftRef.current = text
    setDraftCount(text.length)
    setPreviewText(text)
    if (inputRef.current) inputRef.current.value = text
  }, [])

  useEffect(() => {
    if (!draftLoaded) return
    const editorState = {
      text: draftRef.current,
      style: {
        fontSize: draftStyle.fontSize,
        color: draftStyle.color,
        fontFamily: draftStyle.fontFamily,
        bgColor: draftStyle.bgColor,
      },
      uppercase,
      bgImageUrl: draftBgImageUrl,
    }
    localStorage.setItem(FREE_TEXT_LOCAL_KEY, JSON.stringify(editorState))
  }, [draftLoaded, draftCount, draftStyle.fontSize, draftStyle.color, draftStyle.fontFamily, draftStyle.bgColor, uppercase, draftBgImageUrl, draftId])

  useEffect(() => {
    return () => { if (draftStyle.bgImage) URL.revokeObjectURL(draftStyle.bgImage) }
  }, [])

  const updateDraftStyle = useCallback((key, value) => {
    setDraftStyle(prev => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }, [])

  const handleDraftChange = useCallback(e => {
    const val = e.target.value.slice(0, MAX_LEN)
    draftRef.current = val
    const currentState = {
      text: val,
      style: {
        fontSize: draftStyle.fontSize,
        color: draftStyle.color,
        fontFamily: draftStyle.fontFamily,
        bgColor: draftStyle.bgColor,
      },
      uppercase,
      bgImageUrl: draftBgImageUrl,
    }
    localStorage.setItem(FREE_TEXT_LOCAL_KEY, JSON.stringify(currentState))
    clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(() => {
      setDraftCount(val.length)
      setPreviewText(val)
    }, 50)
  }, [draftStyle, uppercase, draftBgImageUrl])

  const handleDiscardDraft = useCallback(() => setDraftValue(''), [setDraftValue])
  const handleUppercaseToggle = useCallback(e => setUppercase(e.target.checked), [])
  const handleFontSizeChange = useCallback((_, v) => updateDraftStyle('fontSize', v), [updateDraftStyle])
  const handleFontFamilyChange = useCallback(option => {
    const value = option ? option.value : 'inherit'
    ensureGoogleFontLoaded(value)
    updateDraftStyle('fontFamily', value)
  }, [updateDraftStyle])
  const handleTextColorInput = useCallback(e => updateDraftStyle('color', e.target.value), [updateDraftStyle])
  const handleBgColorInput = useCallback(e => updateDraftStyle('bgColor', e.target.value), [updateDraftStyle])

  const handleImageUpload = useCallback(async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const formData = new FormData()
      formData.append('text', draftRef.current)
      formData.append('style', JSON.stringify({
        fontSize: draftStyle.fontSize,
        color: draftStyle.color,
        fontFamily: draftStyle.fontFamily,
        bgColor: draftStyle.bgColor,
        uppercase,
      }))
      formData.append('bgImage', file)
      const response = await axios.put(`${API_ORIGIN}/api/admin/free-text/draft/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const savedDraft = response.data?.data
      if (!savedDraft) return
      const imageUrl = savedDraft.bg_image_url || ''
      setDraftId(savedDraft.id)
      setDraftBgImageUrl(imageUrl)
      setDraftStyle(prev => ({ ...prev, bgImage: imageUrl }))
      localStorage.setItem(FREE_TEXT_LOCAL_KEY, JSON.stringify({
        text: draftRef.current,
        draftId: savedDraft.id,
        style: { fontSize: draftStyle.fontSize, color: draftStyle.color, fontFamily: draftStyle.fontFamily, bgColor: draftStyle.bgColor },
        uppercase,
        bgImageUrl: imageUrl,
      }))
    } catch (error) {
      console.error('Failed to upload background image:', error)
    }
    e.target.value = ''
  }, [draftStyle, uppercase])

  const handleClearBgImage = useCallback(async () => {
    try {
      const formData = new FormData()
      formData.append('text', draftRef.current)
      formData.append('style', JSON.stringify({
        fontSize: draftStyle.fontSize,
        color: draftStyle.color,
        fontFamily: draftStyle.fontFamily,
        bgColor: draftStyle.bgColor,
        uppercase,
      }))
      formData.append('removeBgImage', 'true')
      const response = await axios.put(`${API_ORIGIN}/api/admin/free-text/draft/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const savedDraft = response.data?.data
      if (!savedDraft) return
      setDraftBgImageUrl('')
      setDraftStyle(prev => ({ ...prev, bgImage: '' }))
      localStorage.setItem(FREE_TEXT_LOCAL_KEY, JSON.stringify({
        text: draftRef.current,
        draftId: savedDraft.id,
        style: { fontSize: draftStyle.fontSize, color: draftStyle.color, fontFamily: draftStyle.fontFamily, bgColor: draftStyle.bgColor },
        uppercase,
        bgImageUrl: '',
      }))
    } catch (error) {
      console.error('Failed to clear background image:', error)
    }
  }, [draftStyle, uppercase])

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const response = await axios.get(`${API_ORIGIN}/api/admin/free-text/history/`)
      setHistory(response.data?.data || [])
    } catch (error) {
      console.error('Failed to load free text history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  const handleClear = useCallback(() => {
    setDraftValue('')
    setContent('')
    setPublishedAt(null)
    setSent(false)
    setSendError(false)
  }, [setDraftValue])

  const handleSend = useCallback(async () => {
    const currentDraft = draftRef.current
    if (!currentDraft.trim() || sending) return
    setSending(true)
    setSendError(false)
    try {
      const trimmed = currentDraft.trim()
      const displayText = uppercase ? trimmed.toUpperCase() : trimmed
      const currentStyle = {
        fontSize: draftStyle.fontSize,
        color: draftStyle.color,
        fontFamily: draftStyle.fontFamily,
        bgColor: draftStyle.bgColor,
        uppercase,
      }
      setContent(displayText)
      setStyle({ ...draftStyle, bgImage: draftBgImageUrl })
      setPublishedAt(new Date())
      const formData = new FormData()
      formData.append('text', displayText)
      formData.append('style', JSON.stringify(currentStyle))
      if (draftId) formData.append('draft_id', draftId)
      const draftResponse = await axios.put(`${API_ORIGIN}/api/admin/free-text/draft/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const savedDraft = draftResponse.data?.data
      if (savedDraft) {
        setDraftId(savedDraft.id)
        const savedImageUrl = savedDraft.bg_image_url || draftBgImageUrl || ''
        setDraftBgImageUrl(savedImageUrl)
        localStorage.setItem(FREE_TEXT_LOCAL_KEY, JSON.stringify({
          text: displayText,
          draftId: savedDraft.id,
          style: { fontSize: draftStyle.fontSize, color: draftStyle.color, fontFamily: draftStyle.fontFamily, bgColor: draftStyle.bgColor },
          uppercase,
          bgImageUrl: savedImageUrl,
        }))
      }
      await send({
        type: 'send_free_text',
        text: displayText,
        draft_id: savedDraft?.id || draftId,
        style: currentStyle,
        bgImage: savedDraft?.bg_image_url || draftBgImageUrl || null,
      })
      setSent(true)
      await loadHistory()
      setTimeout(() => setSent(false), 2000)
    } catch (error) {
      console.error('Failed to send free text:', error)
      setSendError(true)
      setTimeout(() => setSendError(false), 2500)
    } finally {
      setSending(false)
    }
  }, [sending, draftStyle, uppercase, draftBgImageUrl, draftId, send, loadHistory])

  const handleReload = useCallback(() => {
    if (webviewRef.current?.reload) webviewRef.current.reload()
    else setReloadKey(k => k + 1)
  }, [])

  const handleOpenWindow = useCallback(() => {
    if (window.electronAPI?.openDisplayWindow) window.electronAPI.openDisplayWindow(DISPLAY_URL)
    else window.open(DISPLAY_URL, '_blank', 'noopener,noreferrer')
  }, [])

  const handlePreview = useCallback(() => {
    const resolvedFont = draftStyle.fontFamily === 'inherit' ? 'Inter, sans-serif' : draftStyle.fontFamily
    const displayText = uppercase ? previewText.toUpperCase() : previewText
    const previewWindow = window.open('', '_blank', 'width=960,height=560,menubar=no,toolbar=no,location=no,status=no')
    if (!previewWindow) return
    previewWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Banner Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Poppins:wght@400;700&family=Montserrat:wght@400;700&family=Open+Sans:wght@400;700&family=Raleway:wght@400;700&family=Lato:wght@400;700&display=swap" rel="stylesheet"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#0f172a;display:flex;flex-direction:column;min-height:100vh;font-family:Inter,sans-serif;}
    .topbar{background:#1e293b;border-bottom:1px solid #334155;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
    .topbar-left{display:flex;align-items:center;gap:10px;}
    .badge{background:#064E3B;color:#D1FAE5;font-size:10px;font-weight:700;padding:3px 8px;border-radius:5px;letter-spacing:.06em;text-transform:uppercase;}
    .topbar-title{color:#f1f5f9;font-size:14px;font-weight:600;}
    .close-btn{background:#334155;color:#94a3b8;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;transition:.15s;}
    .close-btn:hover{background:#ef4444;color:#fff;}
    .banner{flex:1;display:flex;align-items:center;justify-content:center;padding:48px 60px;
      background-color:${draftStyle.bgColor};
      ${draftBgImageUrl ? `background-image:url('${draftBgImageUrl}');background-size:cover;background-position:center;` : ''}
    }
    .banner-text{
      color:${draftStyle.color};
      font-family:${resolvedFont};
      font-size:${draftStyle.fontSize}px;
      font-weight:700;
      text-align:center;
      line-height:1.25;
      word-break:break-word;
      ${draftBgImageUrl ? 'text-shadow:0 2px 12px rgba(0,0,0,0.7);' : ''}
      ${uppercase ? 'text-transform:uppercase;' : ''}
    }
    .meta{background:#1e293b;border-top:1px solid #334155;padding:14px 20px;display:flex;flex-wrap:wrap;gap:20px;flex-shrink:0;}
    .meta-label{color:#64748b;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;}
    .meta-value{color:#e2e8f0;font-size:13px;font-weight:600;}
    .swatch{display:inline-block;width:12px;height:12px;border-radius:3px;border:1px solid rgba(255,255,255,.15);vertical-align:middle;margin-right:5px;}
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <span class="badge">Free Text Module</span>
      <span class="topbar-title">Banner Preview</span>
    </div>
    <button class="close-btn" onclick="window.close()">✕ Close</button>
  </div>
  <div class="banner">
    <div class="banner-text">${displayText || 'Your message will appear here…'}</div>
  </div>
  <div class="meta">
    <div class="meta-item"><div class="meta-label">Font</div><div class="meta-value">${draftStyle.fontFamily === 'inherit' ? 'Inter (System)' : draftStyle.fontFamily.replace(/"/g, '')}</div></div>
    <div class="meta-item"><div class="meta-label">Size</div><div class="meta-value">${draftStyle.fontSize}px</div></div>
    <div class="meta-item"><div class="meta-label">Text Color</div><div class="meta-value"><span class="swatch" style="background:${draftStyle.color}"></span>${draftStyle.color.toUpperCase()}</div></div>
    <div class="meta-item"><div class="meta-label">Background</div><div class="meta-value"><span class="swatch" style="background:${draftStyle.bgColor}"></span>${draftStyle.bgColor.toUpperCase()}</div></div>
    <div class="meta-item"><div class="meta-label">Uppercase</div><div class="meta-value">${uppercase ? 'On' : 'Off'}</div></div>
  </div>
</body>
</html>`)
    previewWindow.document.close()
  }, [draftStyle, draftBgImageUrl, previewText, uppercase])

  const loadDraft = useCallback(async () => {
    try {
      const localState = localStorage.getItem(FREE_TEXT_LOCAL_KEY)
      if (localState) {
        try {
          const saved = JSON.parse(localState)
          setDraftId(saved.draftId || null)
          const imageUrl = saved.bgImageUrl || ''
          setDraftBgImageUrl(imageUrl)
          setDraftValue(saved.text || '')
          setContent(saved.text || '')
          const savedStyle = { ...DEFAULT_STYLE, ...(saved.style || {}), bgImage: imageUrl }
          setDraftStyle(savedStyle)
          setStyle(savedStyle)
          ensureGoogleFontLoaded(savedStyle.fontFamily)
          setUppercase(Boolean(saved.uppercase))
          return
        } catch (error) {
          console.error('Failed to restore Free Text from localStorage:', error)
          localStorage.removeItem(FREE_TEXT_LOCAL_KEY)
        }
      }
      const response = await axios.get(`${API_ORIGIN}/api/admin/free-text/draft/`)
      const data = response.data?.data
      if (!data) { setDraftId(null); return }
      setDraftId(data.id)
      setDraftValue(data.text || '')
      setContent(data.text || '')
      const savedStyle = { ...DEFAULT_STYLE, ...(data.style || {}) }
      setUppercase(Boolean(data.style?.uppercase))
      setDraftStyle(savedStyle)
      setStyle(savedStyle)
      setDraftBgImageUrl(data.bg_image_url || '')
      if (data.text) setPublishedAt(data.updated_at ? new Date(data.updated_at) : null)
    } catch (error) {
      console.error('Failed to load free text draft:', error)
    } finally {
      setDraftLoaded(true)
    }
  }, [setDraftValue])

  useEffect(() => {
    loadDraft()
    loadHistory()
  }, [loadDraft, loadHistory])

  const handleUseHistory = useCallback((item) => {
    const text = item.text || ''
    const imageUrl = item.bg_image_url || ''
    const savedStyle = { ...DEFAULT_STYLE, ...(item.style || {}), bgImage: imageUrl }
    ensureGoogleFontLoaded(savedStyle.fontFamily)
    setDraftValue(text)
    setContent(text)
    setDraftStyle(savedStyle)
    setStyle(savedStyle)
    setUppercase(Boolean(item.style?.uppercase))
    setDraftBgImageUrl(imageUrl)
    setPublishedAt(item.created_at ? new Date(item.created_at) : null)
    localStorage.setItem(FREE_TEXT_LOCAL_KEY, JSON.stringify({
      text,
      style: { fontSize: savedStyle.fontSize, color: savedStyle.color, fontFamily: savedStyle.fontFamily, bgColor: savedStyle.bgColor },
      uppercase: Boolean(item.style?.uppercase),
      bgImageUrl: imageUrl,
    }))
    setHistoryOpen(false)
  }, [setDraftValue])

  const isOverLimit = draftCount >= MAX_LEN
  const countColor = isOverLimit ? 'error.main' : 'text.secondary'
  const selectStyles = useMemo(() => buildSelectStyles(theme), [theme])
  const selectedFontOption = useMemo(
    () => FONT_OPTIONS.find(f => f.value === draftStyle.fontFamily) || FONT_OPTIONS[0],
    [draftStyle.fontFamily]
  )
  const formatFontOptionLabel = useCallback((option) => (
    <span style={{
      fontFamily: option.value === 'inherit' ? 'inherit' : option.value,
      display: 'block',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}>
      {option.label}
    </span>
  ), [])

  const sendButtonLabel = sending ? 'Sending…' : sent ? 'Sent' : sendError ? 'Retry' : 'Send'

  return (
    <>
      <Box sx={{   }}>

      

      

        {/* ── Main card ── */}
        <Paper variant="outlined" sx={{ borderRadius: `${theme.shape.borderRadius - 2}px`, overflow: 'hidden' }}>

          {/* Card header */}
          <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
            <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{
                  width: 38, height: 38, bgcolor: '#D1FAE5',
                  borderRadius: 2, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0, mt: 0.2,
                }}>
                  <CampaignOutlinedIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
                </Box>
                <Box>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.4 }}>
                    <Chip label="FREE TEXT" size="small" color="primary" sx={{ fontSize: '10px', height: 20 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
                      Display Text Editor
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                    Broadcast instant announcements, participant welcomes, and ticker messages.
                  </Typography>
                </Box>
              </Stack>

              <Button
                variant="outlined"
                color="primary"
                startIcon={<HistoryIcon />}
                size="small"
                onClick={() => setHistoryOpen(true)}
                sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Preset History
              </Button>
            </Stack>
          </Box>

          <Divider />

          {/* Card body */}
          <Box sx={{ display: 'flex' }}>

            {/* ── LEFT: Message Content ── */}
            <Box sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>

              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                  Message Content
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={uppercase}
                      onChange={handleUppercaseToggle}
                      sx={{ p: 0.5 }}
                    />
                  }
                  label={<Typography variant="caption">Uppercase Mode</Typography>}
                  sx={{ m: 0, gap: 0.5 }}
                />
              </Stack>

              <TextField
                placeholder="Type your message…"
                multiline
                minRows={8}
                fullWidth
                defaultValue=""
                onChange={handleDraftChange}
                inputRef={inputRef}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: 14,
                    lineHeight: 1.6,
                    textTransform: uppercase ? 'uppercase' : 'none',
                  },
                }}
              />

              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: countColor, fontVariantNumeric: 'tabular-nums' }}>
                  {draftCount} / {MAX_LEN} characters
                </Typography>
                {draftCount > 0 && (
                  <Button
                    onClick={handleDiscardDraft}
                    size="small"
                    sx={{ color: 'error.main', fontSize: 13, textTransform: 'none', fontWeight: 600, p: 0, minWidth: 'auto' }}
                  >
                    Discard
                  </Button>
                )}
              </Stack>

              {/* Quick Announcements */}
              <Box>
                <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                  Quick Announcements:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {QUICK_ANNOUNCEMENTS.map(label => (
                    <Chip
                      key={label}
                      label={label}
                      variant="outlined"
                      size="small"
                      onClick={() => setDraftValue(label)}
                      sx={{
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        borderColor: 'divider',
                        color: 'text.secondary',
                        '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: '#D1FAE5' },
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Preview + Send */}
              <Stack direction="row" sx={{ gap: 1.5, mt: 1 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreview}
                  disabled={!previewText.trim()}
                  fullWidth
                >
                  Preview
                </Button>
                <Button
                  variant="contained"
                  color={sendError ? 'error' : 'primary'}
                  startIcon={
                    sending
                      ? <CircularProgress size={14} color="inherit" />
                      : sent
                      ? <CheckRoundedIcon sx={{ fontSize: 16 }} />
                      : <SendRoundedIcon sx={{ fontSize: 15 }} />
                  }
                  onClick={handleSend}
                  disabled={!previewText.trim() || sending}
                  fullWidth
                >
                  {sendButtonLabel}
                </Button>
              </Stack>
            </Box>

            {/* ── Vertical divider ── */}
            <Divider orientation="vertical" flexItem />

            {/* ── RIGHT: Appearance Styling ── */}
            <Box sx={{ width: 260, p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, flexShrink: 0 }}>

              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.8 }}>
                <TuneRoundedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                  Appearance Styling
                </Typography>
              </Stack>

              {/* Font size */}
              <Box>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Font Size</Typography>
                  <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    {draftStyle.fontSize}px
                  </Typography>
                </Stack>
                <Slider
                  size="small"
                  min={16}
                  max={120}
                  value={draftStyle.fontSize}
                  onChange={handleFontSizeChange}
                  sx={{ color: 'primary.main', '& .MuiSlider-thumb': { width: 14, height: 14 } }}
                />
              </Box>

              {/* Font family */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.8 }}>Typography Family</Typography>
                <Select
                  options={FONT_OPTIONS}
                  value={selectedFontOption}
                  onChange={handleFontFamilyChange}
                  formatOptionLabel={formatFontOptionLabel}
                  styles={selectStyles}
                  isSearchable
                  placeholder="Search fonts…"
                  menuPlacement="auto"
                />
              </Box>

              {/* Text color + Banner background */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.8 }}>Text Color</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={draftStyle.color.toUpperCase()}
                    onChange={e => updateDraftStyle('color', e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Box
                              component="input"
                              type="color"
                              value={draftStyle.color}
                              onChange={handleTextColorInput}
                              sx={{ width: 18, height: 18, border: 'none', borderRadius: '3px', cursor: 'pointer', p: 0, bgcolor: 'transparent' }}
                            />
                          </InputAdornment>
                        ),
                        sx: { fontSize: '0.78rem' },
                      },
                    }}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.8 }}>Background</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={draftStyle.bgColor.toUpperCase()}
                    onChange={e => updateDraftStyle('bgColor', e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Box
                              component="input"
                              type="color"
                              value={draftStyle.bgColor}
                              onChange={handleBgColorInput}
                              sx={{ width: 18, height: 18, border: 'none', borderRadius: '3px', cursor: 'pointer', p: 0, bgcolor: 'transparent' }}
                            />
                          </InputAdornment>
                        ),
                        sx: { fontSize: '0.78rem' },
                      },
                    }}
                  />
                </Box>
              </Box>

              {/* Backdrop image */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.8 }}>Custom Backdrop Image</Typography>
                <Stack direction="row" sx={{ gap: 1 }}>
                  <Button
                    component="label"
                    variant="outlined"
                    color="primary"
                    startIcon={<ImageRoundedIcon sx={{ fontSize: 16 }} />}
                    fullWidth
                    size="small"
                    sx={{ textTransform: 'none' }}
                  >
                    Upload Banner Overlay
                    <input hidden type="file" accept="image/*" onChange={handleImageUpload} />
                  </Button>
                  {(draftBgImageUrl || draftStyle.bgImage) && (
                    <Button
                      onClick={handleClearBgImage}
                      color="inherit"
                      size="small"
                      sx={{ textTransform: 'none', flexShrink: 0 }}
                    >
                      Clear
                    </Button>
                  )}
                </Stack>
              </Box>
            </Box>
          </Box>

          {/* ── Inline preview strip ── */}
          {/* {previewText.trim() && (
            <>
              <Divider />
              <Box sx={{ p: 3 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: content ? 'primary.main' : 'text.disabled' }} />
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      {content ? `Live · ${publishedAt ? formatTime(publishedAt) : ''}` : 'Preview'}
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ gap: 0.5 }}>
                    <Tooltip title="Remove">
                      <IconButton onClick={handleClear} size="small" color="inherit">
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                    {content && (
                      <>
                        <Tooltip title="Reload display">
                          <IconButton onClick={handleReload} size="small" color="inherit">
                            <RefreshRoundedIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Open display window">
                          <IconButton onClick={handleOpenWindow} size="small" color="inherit">
                            <OpenInNewRoundedIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Stack>
                </Stack>

                <Box sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: 1,
                  borderColor: 'divider',
                  aspectRatio: '21 / 9',
                  display: 'flex',
                  alignItems: 'start',
                  justifyContent: 'start',
                  p: 3,
                  textAlign: 'center',
                  backgroundColor: draftStyle.bgColor,
                  backgroundImage: draftBgImageUrl ? `url(${draftBgImageUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}>
                  <span style={{
                    color: draftStyle.color,
                    fontFamily: draftStyle.fontFamily,
                    fontSize: `${draftStyle.fontSize}px`,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    textShadow: draftBgImageUrl ? '0 2px 8px rgba(0,0,0,0.6)' : 'none',
                    textTransform: uppercase ? 'uppercase' : 'none',
                  }}>
                    {previewText}
                  </span>
                </Box>

                {content && (
                  <Box sx={{ mt: 2, borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider', aspectRatio: '16 / 9', bgcolor: '#000' }}>
                    {isElectron ? (
                      // eslint-disable-next-line react/no-unknown-property
                      <webview key={reloadKey} ref={webviewRef} src={DISPLAY_URL} style={{ width: '100%', height: '100%', border: 'none' }} />
                    ) : (
                      <iframe key={reloadKey} ref={webviewRef} title="Free text display preview" src={DISPLAY_URL} style={{ width: '100%', height: '100%', border: 'none' }} />
                    )}
                  </Box>
                )}
              </Box>
            </>
          )} */}
        </Paper>
      </Box>

      {/* ── History backdrop ── */}
      {historyOpen && (
        <Box
          onClick={() => setHistoryOpen(false)}
          sx={{ position: 'fixed', inset: 0, zIndex: 1200, bgcolor: 'rgba(0,0,0,0.4)' }}
        />
      )}

      {/* ── History panel ── */}
      <Box sx={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, zIndex: 1201,
        display: 'flex', flexDirection: 'column',
        bgcolor: 'background.paper', borderLeft: 1, borderColor: 'divider',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        transform: historyOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}>
        <Stack direction="row" sx={{ alignItems: 'center', px: 3, py: 2.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <HistoryIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.12em', fontWeight: 700, lineHeight: 1 }}>
              History
            </Typography>
          </Stack>
          <IconButton size="small" onClick={() => setHistoryOpen(false)} color="inherit" sx={{ ml: 'auto', mr: -1 }}>
            <CloseRoundedIcon sx={{
              fontSize: 20, color: 'text.secondary', bgcolor: 'action.hover',
              p: '4px', cursor: 'pointer', transition: 'all 0.2s ease',
              '&:hover': { color: '#fff', bgcolor: 'error.main' },
            }} />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
          {loadingHistory ? (
            <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={22} />
            </Box>
          ) : history.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <HistoryIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>No previous free text yet.</Typography>
            </Box>
          ) : (
            <Stack sx={{ gap: 1.5 }}>
              {history.map(item => (
                <Paper
                  key={item.id}
                  variant="outlined"
                  sx={{
                    p: 2, borderRadius: 2, transition: '0.15s',
                    '&:hover': { borderColor: 'primary.main', bgcolor: theme => alpha(theme.palette.primary.main, 0.04) },
                  }}
                >
                  <Typography sx={{
                    fontSize: 14, fontWeight: 600, mb: 0.5,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', lineHeight: 1.5,
                  }}>
                    {item.text}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.25 }}>
                    {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                  </Typography>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {item.style?.fontFamily || 'System'} · {item.style?.fontSize || 40}px
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleUseHistory(item)}
                      sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5, flexShrink: 0, lineHeight: 1, py: 0.6, px: 1.25 }}
                    >
                      Use
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    </>
  )
}

export default FreeText