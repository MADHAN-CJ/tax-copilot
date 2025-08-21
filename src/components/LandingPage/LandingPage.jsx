import React, { useState } from "react";
import {
  StylesLandingPageBodyWrapper,
  StylesLandingPageHeader,
  StylesLandingPageWrapper,
} from "./styles";
import Logo from "../../assets/images/logo.png";
import UpArrow from "../../assets/images/up-arrow.svg";
import Banner from "../../assets/images/landing-page-banner.png";

const searchPrompts = [
  "Show Tesla’s net income trend over the last 5 years.",
  "What was Amazon’s free cash flow in 2023?",
  "Break down Meta’s operating expenses by category in 2024.",
  "Rank the companies by total assets in their latest filings.",
];

const LandingPage = () => {
  const [prompt, setPrompt] = useState("");
  return (
    <StylesLandingPageWrapper>
      <StylesLandingPageHeader>
        <div className="flex items-center">
          <img src={Logo} alt="logo" />
          <div className="w-[2px] bg-[#333234] h-[60px] mx-[20px]"></div>
          <span className="logo-text">The Magnificent 7</span>
        </div>
        <span className="header-right">support@bookshelf.diy</span>
      </StylesLandingPageHeader>
      <StylesLandingPageBodyWrapper>
        <div className="section left-part">
          <div className="left-part-header">
            <div className="left-part-header-left"></div>
            <div className="left-part-header-right"></div>
          </div>
          <div className="left-part-body">
            <img src={Banner} alt="banner" />
          </div>
          <div></div>
        </div>
        <div className="section right-part">
          <p>Welcome,</p>
          <p>Ask anything</p>
          <div className="search-container-wrapper">
            <div className="right-part-bottom-section">
              <div className="bottom-card-section">
                {searchPrompts?.map((prompt, uniquePrompt) => {
                  return (
                    <div
                      className="right-part-card"
                      key={uniquePrompt}
                      onClick={() => setPrompt(prompt)}
                    >
                      {prompt}
                    </div>
                  );
                })}
              </div>
              <div className="search-container">
                <textarea
                  placeholder="Start typing..."
                  value={prompt}
                ></textarea>
                <div className="button-text">
                  <span className="gpt-name">Using GPT-5 </span>
                  <div className="submit-button">
                    <img src={UpArrow} alt="Send" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </StylesLandingPageBodyWrapper>
    </StylesLandingPageWrapper>
  );
};

export default LandingPage;
