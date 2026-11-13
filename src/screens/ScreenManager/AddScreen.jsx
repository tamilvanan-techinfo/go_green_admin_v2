import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  Divider,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import AddIcon from "@mui/icons-material/Add";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import api from "../../config.json";
import { GAMES } from "../../constants/game";

import { useToast } from "../Allocations/Ui";

const SCREENS_URL = `${api.apiBase}/api/admin/screens/`;

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// Shared compact field styling (same look as before).
const fieldSx = (mono = false) => ({
  "& .MuiOutlinedInput-root": {
    height: 44,
    fontSize: 13,
    borderRadius: "8px",
    alignItems: "center",
    ...(mono && { fontFamily: '"JetBrains Mono", monospace' }),
  },
  "& .MuiOutlinedInput-input": {
    boxSizing: "border-box",
    height: "100%",
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
  },
  "& .MuiInputLabel-root": {
    fontFamily: "Inter, sans-serif",
    fontSize: 13,
    color: "text.secondary",
    top: 0,
    transform: "translate(14px, 11px) scale(1)",
    transformOrigin: "top left",
  },
  "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled":
    {
      transform: "translate(14px, -9px) scale(0.78)",
      bgcolor: "background.paper",
      px: 0.5,
    },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "divider",
  },
});

function AddScreen({ onCreated }) {
  const fileInputRef = useRef(null);
  const toast = useToast();
  

  const [game, setGame] = useState("");
  const [screenName, setScreenName] = useState("");
  const [route, setRoute] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);

  // If the user picks an experience in Change Game after this form
  // opened, and hasn't chosen a game here yet, follow it.
  useEffect(() => {
    invoke("get_selected_experience")
      .then((exp) => setGame(exp || ""))
      .catch(() => setGame(""));
  }, []);

  const applyImage = (file) => {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast("Please upload a PNG, JPG, or SVG image.", "error");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast("Image size must be 10 MB or less.", "error");
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    applyImage(file);
    if (!file || !ALLOWED_TYPES.includes(file.type) || file.size > MAX_IMAGE_SIZE) {
      event.target.value = "";
    }
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);

    setImage(null);
    setImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    setScreenName("");
    setRoute("");
    removeImage();
   
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!screenName.trim() || !route.trim()) {
      toast("Please enter the screen name and route.", "error");
      return;
    }

    if (!game) {
      toast("No game experience selected. Go to Change Game first.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("name", screenName.trim());
    formData.append("path", route.trim());
    formData.append("is_live", "false");
    formData.append("game", game);
    if (image) formData.append("thumbnail", image);

    setSaving(true);

    try {
      // Don't set Content-Type: the browser adds the multipart boundary.
      const response = await fetch(SCREENS_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.status === false) {
        throw new Error(
          data.message ||
            (data.errors ? JSON.stringify(data.errors) : "Failed to create screen.")
        );
      }

      const gameTitle = GAMES.find((g) => g.id === game)?.title || game;
      toast(`Screen added to ${gameTitle}.`, "success");

      onCreated?.(data.data);
      handleClear();
    } catch (error) {
      console.error("Error creating screen:", error);
      toast(error.message || "Failed to create screen.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 440,
        mx: "auto",
        p: 1.5,
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        elevation={0}
        sx={{
          width: "100%",
          p: 2,
          boxSizing: "border-box",
          borderRadius: "14px",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "0 2px 10px rgba(15,23,42,0.035)",
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ mb: 1.75 }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "9px",
              bgcolor: "#ECFDF5",
              border: "1px solid #A7F3D0",
              color: "secondary.main",
            }}
          >
            <AddIcon sx={{ fontSize: 22 }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 700,
                color: "text.primary",
                lineHeight: 1.4,
              }}
            >
              Add New Screen
            </Typography>

            <Typography
              sx={{
                fontSize: 11,
                color: "text.secondary",
                lineHeight: 1.5,
              }}
            >
              Configure route &amp; broadcast layout
            </Typography>
          </Box>

          <Typography
            sx={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: '"JetBrains Mono", monospace',
              color: "primary.main",
              letterSpacing: "0.03em",
            }}
          >
            NEW ROUTE
          </Typography>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Screen name */}
        <Box sx={{ mb: 1.75 }}>
          <TextField
            fullWidth
            size="small"
            label="Screen Name"
            value={screenName}
            onChange={(event) => setScreenName(event.target.value)}
            required
            disabled={saving}
            inputProps={{ maxLength: 100 }}
            sx={fieldSx()}
          />
        </Box>

        {/* Path / Route */}
        <Box sx={{ mb: 1.75 }}>
          <TextField
            fullWidth
            size="small"
            label="Path / Route"
            value={route}
            onChange={(event) => setRoute(event.target.value)}
            required
            disabled={saving}
            inputProps={{ maxLength: 150 }}
            sx={fieldSx(true)}
          />
        </Box>

        {/* Game */}
        {/* Game (read-only, follows the active experience) */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", mb: 0.5 }}>
            ADDING TO
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
            {GAMES.find((g) => g.id === game)?.title || "No experience selected"}
          </Typography>
        </Box>

        {/* Upload heading */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1 }}
        >
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: "text.secondary",
            }}
          >
            SCREEN IMAGE / POSTER
          </Typography>

          <Typography
            sx={{
              fontSize: 10,
              fontFamily: '"JetBrains Mono", monospace',
              color: "text.disabled",
              whiteSpace: "nowrap",
            }}
          >
            16:9 Recommended
          </Typography>
        </Stack>

        {/* Image upload area */}
        <Box
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            applyImage(event.dataTransfer.files?.[0]);
          }}
          sx={{
            height: 125,
            boxSizing: "border-box",
            border: "1px dashed #CBD5E1",
            borderRadius: "10px",
            bgcolor: "#F8FAFC",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            overflow: "hidden",
            position: "relative",
            transition: "border-color 150ms ease, background 150ms ease",
            "&:hover": {
              borderColor: "secondary.main",
              bgcolor: "#F0FDF9",
            },
          }}
        >
          {imagePreview ? (
            <>
              <Box
                component="img"
                src={imagePreview}
                alt="Screen preview"
                sx={{
                  width: "100%",
                  height: "100%",
                  p: 1,
                  boxSizing: "border-box",
                  objectFit: "contain",
                }}
              />

              <IconButton
                size="small"
                aria-label="Remove uploaded image"
                onClick={(event) => {
                  event.stopPropagation();
                  removeImage();
                }}
                sx={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 28,
                  height: 28,
                  bgcolor: "#FFFFFF",
                  boxShadow: "0 1px 4px rgba(15,23,42,0.15)",
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </>
          ) : (
            <>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  color: "text.secondary",
                }}
              >
                <ImageOutlinedIcon sx={{ fontSize: 19 }} />
              </Box>

              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "text.primary",
                  textAlign: "center",
                }}
              >
                Click to upload or drag &amp; drop
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 10,
                  color: "text.secondary",
                  textAlign: "center",
                  px: 1,
                }}
              >
                PNG, JPG, SVG · Up to 10 MB (1920 × 1080)
              </Typography>
            </>
          )}
        </Box>

        <input
          ref={fileInputRef}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          onChange={handleImageChange}
        />

        {/* Footer buttons */}
        <Divider sx={{ my: 2 }} />

        <Stack
          direction="row"
          spacing={1}
          sx={{
            "& .MuiButton-root": {
              minHeight: 36,
              borderRadius: "8px",
              fontSize: 12,
              fontWeight: 600,
            },
          }}
        >
          <Button
            fullWidth
            type="button"
            variant="contained"
            onClick={handleClear}
            disabled={saving}
            sx={{
              bgcolor: "#F1F5F9",
              color: "text.secondary",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#E2E8F0",
                boxShadow: "none",
              },
            }}
          >
            Clear
          </Button>

          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={
              saving ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <AddIcon sx={{ fontSize: "17px !important" }} />
              )
            }
            sx={{
              bgcolor: "primary.main",
              color: "#FFFFFF",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "primary.light",
                boxShadow: "none",
              },
            }}
          >
            {saving ? "Adding..." : "Add Screen"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

export default AddScreen;