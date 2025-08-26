import {
  StylesLandingPageBodyWrapper,
  StylesLandingPageHeader,
  StylesLandingPageWrapper,
} from "./styles";

//images
import Logo from "../../assets/images/logo.png";
import UpArrow from "../../assets/images/up-arrow.svg";
import Banner from "../../assets/images/landing-page-banner.png";
import { useSocketContext } from "../../context/WebSocketContext";
import { useEffect } from "react";

//static prompts
const searchPrompts = [
  "Show Tesla’s net income trend over the last 5 years.",
  "What was Amazon’s free cash flow in 2023?",
  "Break down Meta’s operating expenses by category in 2024.",
  "Rank the companies by total assets in their latest filings.",
];

export default function LandingPage() {
  const {
    setMessages,
    inputMessage,
    setInputMessage,
    isLoading,
    handleSendMessage,
    setActiveDocuments,
    handleInputKeyDown,
  } = useSocketContext();

  useEffect(() => {
    sessionStorage.removeItem("appMounted");
    setMessages([]);
    setActiveDocuments([]);
    localStorage.removeItem("threadId");
  }, []);
  return (
    <div className="h-screen bg-[#151415]  flex flex-col overflow-hidden">
      <div className="overflow-hidden bg-[#151415]">
        {/* Show full-width chat when no documents, split view when documents available */}
        <StylesLandingPageHeader>
          <div className="flex items-center">
            <img src={Logo} alt="logo" />
            <div className="w-[2px] bg-[#333234] h-[60px] mx-[20px]"></div>
            <span className="logo-text">The Magnificent 7</span>
          </div>
          <span className="header-right">support@bookshelf.diy</span>
        </StylesLandingPageHeader>
        {/* {activeDocuments.length === 0 && messages.length === 0 && ( */}
        <div className="w-full  ">
          {/* <p>
              {messages?.type === "error" && (
                <span className="text-white text-3xl z-50">Error</span>
              )}
            </p> */}
          <StylesLandingPageWrapper>
            <StylesLandingPageBodyWrapper>
              <div className="section left-part">
                <div className="left-part-header">
                  <div className="left-part-header-left"></div>
                  <div className="left-part-header-right"></div>
                </div>
                <div className="left-part-body">
                  <img src={Banner} alt="banner" loading="lazy" />
                </div>
                <div></div>
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
                      <form onSubmit={handleSendMessage}>
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
        </div>
        {/* )} */}
      </div>
    </div>
  );
}
