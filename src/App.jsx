import { Box } from "@mui/material";
import AppBar from "./components/AppBar";
import Footer from './components/Footer'
function App() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        backgroundColor: "background.default",
      }}
    >
      <AppBar />
      <Footer/>
      <Box
        sx={{
          pt: "48px",
          minHeight: "100vh",
        }}
      >
        {/* Your dashboard will come here */}
      </Box>
    </Box>
  );
}

export default App;