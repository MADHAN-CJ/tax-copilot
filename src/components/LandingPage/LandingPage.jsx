//styles
import {
  StylesLandingPageBodyWrapper,
  StylesLandingPageWrapper,
} from "./styles";

//images
import UpArrow from "../../assets/images/up-arrow.svg";
import Banner from "../../assets/images/landing-page-banner.png";

import { useSocketContext } from "../../context/WebSocketContext";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router";
import Navbar from "../Navbar/Navbar";
import SidebarComponent from "../Sidebar/Sidebar";

//static prompts
const searchPrompts = [
  "What are the deduction limits under Section 80D?",
  "Transfer Pricing documentation thresholds?",
  "What is FEMA ODI cap for unlisted entities?",
];

export default function LandingPage() {
  //context
  const {
    inputMessage,
    setInputMessage,
    isLoading,
    handleLandingPageSendMessage,
    handleInputKeyDown,
    isSidebarOpen,
    setMessages,
    setActiveDocuments,
    setActiveTabIndex,
  } = useSocketContext();
  const location = useLocation();

  //start as a fresh attempt
  useEffect(() => {
    localStorage.removeItem("threadId");
  }, []);

  //reset the chat and document states
  useEffect(() => {
    const isPageReload = performance
      .getEntriesByType("navigation")
      .some((nav) => nav.type === "reload");

    if (location.pathname === "/") {
      setMessages([]);
      setActiveDocuments([]);
      setActiveTabIndex(0);
    }

    if (isPageReload) {
      setMessages([]);
      setActiveDocuments([]);
      setActiveTabIndex(0);
    }
  }, [location.pathname, setMessages, setActiveDocuments, setActiveTabIndex]);

  return (
    <div className="h-screen bg-[#151415] flex flex-col overflow-hidden">
      <Navbar />
      <div className="overflow-hidden bg-[#151415]">
        <motion.div
          initial={false}
          transition={{ type: "tween", duration: 0.3 }}
        >
          <StylesLandingPageWrapper>
            <motion.aside
              initial={false}
              animate={{ width: isSidebarOpen ? 220 : 0 }}
              transition={{ type: "tween", duration: 0.3 }}
              className=" bg-[#1c1b1d]  overflow-hidden rounded-tl-md"
            >
              <SidebarComponent />
            </motion.aside>
            <StylesLandingPageBodyWrapper $isSidebarOpen={isSidebarOpen}>
              <div className="section left-part">
                <div className="left-part-header">
                  <div className="left-part-header-left"></div>
                  <div className="left-part-header-right"></div>
                </div>
                <div className="left-part-body">
                  <img src={Banner} alt="banner" loading="lazy" />
                  <div className="left-part-body-bottom">
                    <h1>Start with a question.</h1>
                    <p>
                      Ask in the chat. We’ll fetch the right document, highlight
                      the exact text, and give you accurate answers you can
                      trust, no hallucinations.
                    </p>
                  </div>
                </div>
              </div>
              <div className="section right-part">
                <p>Welcome,</p>
                <p>Ask anything</p>
                <div className="search-container-wrapper">
                  <div className="right-part-bottom-section">
                    <div className="bottom-card-section custom-scrollbar">
                      {searchPrompts?.map((prompt, uniquePrompt) => {
                        return (
                          <div
                            className="right-part-card"
                            key={uniquePrompt}
                            onClick={() => setInputMessage(prompt)}
                          >
                            {prompt}
                          </div>
                        );
                      })}
                    </div>
                    <div className="search-container">
                      <form onSubmit={handleLandingPageSendMessage}>
                        <textarea
                          placeholder="Start typing..."
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          disabled={isLoading}
                        ></textarea>
                        <div className="button-text">
                          <span className="gpt-name">Using GPT-5 </span>
                          <button
                            className="submit-button"
                            type="submit"
                            disabled={isLoading || !inputMessage.trim()}
                          >
                            <img src={UpArrow} alt="Send" />
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </StylesLandingPageBodyWrapper>
          </StylesLandingPageWrapper>
        </motion.div>
      </div>
    </div>
  );
}
