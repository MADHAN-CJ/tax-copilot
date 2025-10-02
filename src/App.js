import { BrowserRouter, Route, Routes } from "react-router";
import LandingPage from "./components/LandingPage/LandingPage";
import PDFViewerPage from "./components/WSPDFViewerPage";
import { AppProviders } from "./context/providers/AppProvider";
import { useEffect, useState } from "react";
//images
import Banner from "./assets/images/landing-page-banner.png";
import Logo from "./assets/images/logo.png";
function App() {
  //detect mobile devices
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      console.log("object");
      const isMobileUA =
        /iPhone|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      const isSmallScreen = window.innerWidth < 768;

      setIsBlocked(isMobileUA || isSmallScreen);
    };

    // Run once at load
    checkWidth();

    // Add listener for window resize
    window.addEventListener("resize", checkWidth);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("resize", checkWidth);
    };
  }, []);

  const styles = {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#1C1B1D",
    color: "white",
  };
  const topBarStyles = {
    position: "fixed",
    height: "50px",
    width: "100vw",
    display: "flex",
    alignItems: "center",
    justifyContent: "start",
    background: "#151415",
    top: 0,
  };
  if (isBlocked) {
    return (
      <div style={styles}>
        <div style={topBarStyles}>
          <img src={Logo} alt="Banner" className="pl-5" />
        </div>
        <img src={Banner} alt="Banner" className="mb-3" />
        Please open this site on a <strong>desktop or laptop</strong> to
        continue 🚀
      </div>
    );
  }

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
