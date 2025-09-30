import { BrowserRouter, Route, Routes } from "react-router";
import LandingPage from "./components/LandingPage/LandingPage";
import PDFViewerPage from "./components/WSPDFViewerPage";
import { AppProviders } from "./context/providers/AppProvider";

function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/c/:threadId" element={<PDFViewerPage />} />
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}

export default App;
