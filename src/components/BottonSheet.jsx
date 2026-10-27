import React from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Slide,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

export const SHEET_Z_INDEX = 99999;

const BottomSheet = ({
  children,
  title,
  onClose,
  height = "92vh",
  width = "100%",
  open = true,
}) => {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      disableEnforceFocus
      slots={{
        transition: Slide,
      }}
      slotProps={{
        transition: {
          direction: "up",
          timeout: {
            enter: 450,
            exit: 350,
          },
          appear: true,
        },
      }}
      transitionDuration={{
        enter: 450,
        exit: 350,
      }}
      sx={{
        zIndex: SHEET_Z_INDEX,

        // Center the paper using the Drawer root.
        "& .MuiDrawer-paper": {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,

          width: width,
          maxWidth: "100%",
          height,
          maxHeight: height,
          marginLeft: "auto",
          marginRight: "auto",
          boxSizing: "border-box",

          borderTopLeftRadius: "24px",
          borderTopRightRadius: "24px",
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,

          overflow: "hidden",
          bgcolor: "background.paper",
          boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.18)",
        },
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 3,
            py: 2,
            flexShrink: 0,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            {title}
          </Typography>

          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Close bottom sheet"
            sx={{
              borderRadius: "10px",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        <Divider />

        {/* Scrollable Content */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            p: 3,
            overflowY: "auto",
            overscrollBehavior: "contain",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </Drawer>
  );
};

export default BottomSheet;