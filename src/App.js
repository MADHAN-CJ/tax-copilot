import { BrowserRouter, Route, Routes } from "react-router";
import LandingPage from "./components/LandingPage/LandingPage";
import PDFViewerPage from "./components/WSPDFViewerPage";
import { WebSocketProvider } from "./context/WebSocketContext";

function App() {
  return (
    <BrowserRouter>
      <WebSocketProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/c/:threadId" element={<PDFViewerPage />} />
        </Routes>
      </WebSocketProvider>
    </BrowserRouter>
  );
}

export default App;
