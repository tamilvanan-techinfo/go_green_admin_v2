import React, { useRef, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  Divider,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

function AddScreen() {
  const fileInputRef = useRef(null);

  const [screenName, setScreenName] = useState("");
  const [route, setRoute] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/svg+xml",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PNG, JPG, or SVG image.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image size must be 10 MB or less.");
      event.target.value = "";
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
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

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!screenName.trim() || !route.trim()) {
      alert("Please enter the screen name and route.");
      return;
    }

    // Connect your backend API here.
    console.log({
      screenName: screenName.trim(),
      route: route.trim(),
      image,
    });
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

        <Box sx={{ mb: 1.75 }}>
          <TextField
            fullWidth
            size="small"
            label="Screen Name"
            value={screenName}
            onChange={(event) => setScreenName(event.target.value)}
            required
            inputProps={{ maxLength: 100 }}
            sx={{
              "& .MuiOutlinedInput-root": {
                height: 44,
                fontSize: 13,
                borderRadius: "8px",
                alignItems: "center",
              },

              "& .MuiOutlinedInput-input": {
                boxSizing: "border-box",
                height: "100%",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
              },

              /* Center the label vertically when the field is empty */
              "& .MuiInputLabel-root": {
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                color: "text.secondary",
                top: 0,
                transform: "translate(14px, 11px) scale(1)",
                transformOrigin: "top left",
              },

              /* Keep the label floating above the text when focused or filled */
              "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled":
                {
                  transform: "translate(14px, -9px) scale(0.78)",
                  bgcolor: "background.paper",
                  px: 0.5,
                },

              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "divider",
              },
            }}
          />
        </Box>

        {/* Path / Route */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Path / Route"
            value={route}
            onChange={(event) => setRoute(event.target.value)}
            required
            inputProps={{ maxLength: 150 }}
            sx={{
              "& .MuiOutlinedInput-root": {
                height: 44,
                fontSize: 13,
                borderRadius: "8px",
                alignItems: "center",
                fontFamily: '"JetBrains Mono", monospace',
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
            }}
          />
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

            const file = event.dataTransfer.files?.[0];
            if (!file) return;

            const allowedTypes = [
              "image/png",
              "image/jpeg",
              "image/svg+xml",
            ];

            if (!allowedTypes.includes(file.type)) {
              alert("Please upload a PNG, JPG, or SVG image.");
              return;
            }

            if (file.size > 10 * 1024 * 1024) {
              alert("Image size must be 10 MB or less.");
              return;
            }

            if (fileInputRef.current) {
              const transfer = new DataTransfer();
              transfer.items.add(file);
              fileInputRef.current.files = transfer.files;
              handleImageChange({
                target: fileInputRef.current,
              });
            }
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
            sx={{
              bgcolor: "#F1F5F9",
              color: "text.secondary",
              "&:hover": {
                bgcolor: "#E2E8F0",
              },
            }}
          >
            Clear
          </Button>

          <Button
            fullWidth
            type="submit"
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: "17px !important" }} />}
            sx={{
              bgcolor: "primary.main",
              color: "#FFFFFF",
              "&:hover": {
                bgcolor: "primary.light",
              },
            }}
          >
            Add Screen
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

export default AddScreen;
