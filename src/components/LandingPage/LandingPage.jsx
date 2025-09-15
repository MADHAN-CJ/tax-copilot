import {
  StylesHistoryWrapper,
  StylesLandingPageBodyWrapper,
  StylesLandingPageHeader,
  StylesLandingPageWrapper,
  StylesNewChatButton,
  StylesSearchInput,
  StylesTokenUsage,
} from "./styles";

//images
import Logo from "../../assets/images/logo.png";
import UpArrow from "../../assets/images/up-arrow.svg";
import Banner from "../../assets/images/landing-page-banner.png";
import SidebarIcon from "../../assets/images/sidebar-icon.svg";
import SearchIcon from "../../assets/images/search-icon.svg";
import NewChatButton from "../../assets/images/new-chat-button.svg";

import { useSocketContext } from "../../context/WebSocketContext";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { onClickBounceEffect } from "../../utils/utils";

//static prompts
const searchPrompts = [
  "Summarize Microsoft’s latest performance and key risks using the most recent 10-K, 10-Qs, and earnings calls. Highlight trends in revenue, expenses (CapEx, R&D), margins, and any management commentary on future outlook.",
  "Break down Meta’s operating expenses by category in 2024.",
  "Rank the companies by total assets in their latest filings.",
];

const totalTokenCount = "100000";
export default function LandingPage() {
  const {
    inputMessage,
    setInputMessage,
    isLoading,
    handleSendMessage,
    handleInputKeyDown,
    tokenUsage,
    isSidebarOpen,
    setIsSidebarOpen,
  } = useSocketContext();
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue.toLowerCase());
    }, 300); // 300ms delay

    return () => clearTimeout(handler);
  }, [searchValue]);

  useEffect(() => {
    sessionStorage.setItem("appMounted", "false");
    sessionStorage.removeItem("appMounted");
    localStorage.removeItem("threadId");
  }, []);

  const filteredThreads = tokenUsage?.data?.userThreadData
    ?.filter((query) =>
      query?.initialMessage?.toLowerCase().includes(debouncedSearch)
    )
    ?.sort(
      (a, b) => new Date(b.messageCreatedAt) - new Date(a.messageCreatedAt)
    );
  const usedTokens = tokenUsage?.data?.userData?.tokensUsed || 0;
  const progress = Math.min((usedTokens / totalTokenCount) * 100, 100);

  return (
    <div className="h-screen bg-[#151415] flex flex-col overflow-hidden">
      <StylesLandingPageHeader>
        <div className="flex items-center">
          <img src={Logo} alt="logo" />
          <div className="w-[2px] bg-[#333234] h-[60px] ml-[20px]"></div>
          <button
            className="h-[60px] bg-[#151415] hover:bg-[#2a292b] transition p-[20px]"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <img src={SidebarIcon} alt="sidebar" />
          </button>
          <div className="w-[2px] bg-[#333234] h-[60px] mr-[20px]"></div>

          <span className="logo-text">The Magnificent 7</span>
        </div>
        <span className="header-right">support@bookshelf.diy</span>
      </StylesLandingPageHeader>
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
              className=" bg-[#1c1b1d]  overflow-hidden"
            >
              {isSidebarOpen && (
                <div>
                  <StylesSearchInput>
                    <img src={SearchIcon} alt="" />
                    <input
                      type="text"
                      placeholder="Search Chats"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                    />
                  </StylesSearchInput>
                  <StylesTokenUsage>
                    <p className="token-header">Tokens</p>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="token-numbers">
                      <p>
                        {tokenUsage
                          ? tokenUsage?.data?.userData?.tokensUsed
                          : "0"}
                      </p>
                      <p>{totalTokenCount}</p>
                    </div>
                    <div className="token-text">
                      <p>Used</p>
                      <p>Total</p>
                    </div>
                  </StylesTokenUsage>

                  <StylesNewChatButton
                    onClick={(event) =>
                      onClickBounceEffect(event, 150, () => navigate("/"))
                    }
                  >
                    <img src={NewChatButton} alt="chat" /> New Chat
                  </StylesNewChatButton>

                  <StylesHistoryWrapper>
                    <h1 className="history-header">HISTORY</h1>
                    <ul className="history-list">
                      {filteredThreads?.length > 0 ? (
                        filteredThreads?.map((query, uniqueQuery) => (
                          <li
                            className="hover:text-gray-300 cursor-pointer query-name"
                            key={uniqueQuery}
                            onClick={() => {
                              sessionStorage.setItem("appMounted", "true");
                              navigate(`/c/${query?.id}`);
                            }}
                          >
                            {query?.initialMessage}
                          </li>
                        ))
                      ) : (
                        <p className="text-center">No history found</p>
                      )}
                    </ul>
                  </StylesHistoryWrapper>
                </div>
              )}
            </motion.aside>
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
        </motion.div>
      </div>
    </div>
  );
}
