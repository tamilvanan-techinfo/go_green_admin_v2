import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Chip,
  Divider,
  InputAdornment,
  Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import TuneIcon from "@mui/icons-material/Tune";
import BroadcastOnPersonalIcon from "@mui/icons-material/BroadcastOnPersonal";

export default function AppTitle() {
  const theme = useTheme();
  const [masterTitle, setMasterTitle] = useState(
    "GoGreen Cycle Pedaling Gamification"
  );

  return (
    <Card elevation={0} sx={{ width: "100%" }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header Row */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2.5,
          }}
        >
          {/* Left: Icon + Title + Description */}
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                bgcolor: theme.palette.success.light + "22",
                borderRadius: `${theme.shape.borderRadius - 2}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                mt: 0.3,
              }}
            >
              <TuneIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: theme.palette.text.primary,
                  lineHeight: 1.3,
                  mb: 0.4,
                }}
              >
                Application Title &amp; Brand Identity
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.8rem",
                  color: theme.palette.text.secondary,
                  lineHeight: 1.5,
                }}
              >
                Set master system naming shown across leaderboard headers,
                podium screens &amp; player pods.
              </Typography>
            </Box>
          </Box>

          {/* Tier Badge */}
          <Chip
            label="MNC Enterprise Tier"
            color="primary"
            size="small"
            sx={{
              flexShrink: 0,
              ml: 1,
              height: "auto",
              px: 1,
              py: 0.6,
              "& .MuiChip-label": {
                px: 0,
                whiteSpace: "normal",
                textAlign: "center",
                lineHeight: 1.35,
              },
            }}
          />
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {/* Master App Title Field */}
        <Box>
          <Typography
            sx={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: theme.palette.text.primary,
              mb: 0.8,
            }}
          >
            Master App Title{" "}
            <Box component="span" sx={{ color: theme.palette.error.main }}>
              *
            </Box>
          </Typography>

          <TextField
            fullWidth
            value={masterTitle}
            onChange={(e) => setMasterTitle(e.target.value)}
            variant="outlined"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <BroadcastOnPersonalIcon
                    sx={{ fontSize: 18, color: theme.palette.text.disabled }}
                  />
                </InputAdornment>
              ),
            }}
          />

          <Typography
            variant="caption"
            sx={{ mt: 0.7, display: "flex", alignItems: "center", gap: 0.5 }}
          >
            Broadcasted to top left header &amp; spectator displays.
          </Typography>
        </Box>

        {/* Save Button Row */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
          <Button variant="contained" color="primary">
            Save Changes
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}