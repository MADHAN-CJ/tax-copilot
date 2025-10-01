import { useNavigate } from "react-router";
//styles
import { StylesLandingPageHeader } from "../LandingPage/styles";
//images
import Logo from "../../assets/images/logo.png";
import CallIcon from "../../assets/images/call-help-icon.svg";
import NotificationIcon from "../../assets/images/notification.svg";
//utils
import { onClickBounceEffect } from "../../utils/utils";
//contexts
import { useUIContext } from "../../context/UIContext";
import { useChatContext } from "../../context/ChatContext";
import { useDocsContext } from "../../context/DocumentsContext";

const Navbar = () => {
  const navigate = useNavigate();

  //context
  const { isSidebarOpen, setIsSidebarOpen } = useUIContext();
  const { setMessages } = useChatContext();
  const { setActiveDocuments } = useDocsContext();

  //handle logo click
  const handleLogoClick = () => {
    setMessages([]);
    setActiveDocuments([]);
    navigate("/");
  };
  return (
    <StylesLandingPageHeader>
      <div className="flex items-center">
        <img
          src={Logo}
          alt="logo"
          className="cursor-pointer "
          onClick={(event) =>
            onClickBounceEffect(event, 150, () => {
              handleLogoClick();
            })
          }
        />
        <div className="w-[2px] bg-[#333234] h-[60px] ml-[20px]"></div>
        <button
          className="h-[60px] bg-[#151415] hover:bg-[#2a292b] transition p-[20px]"
          onClick={(event) =>
            onClickBounceEffect(event, 150, () =>
              setIsSidebarOpen(!isSidebarOpen)
            )
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />

            <path
              d="M3 5a2 2 0 0 1 2-2h4v18H5a2 2 0 0 1-2-2V5z"
              fill={isSidebarOpen ? "white" : ""}
            />
          </svg>
        </button>
        <div className="w-[2px] bg-[#333234] h-[60px] mr-[20px]"></div>

        <span className="logo-text">
          Accurate Answers. Straight from the Law.
        </span>
      </div>
      <div className="header-right">
        <button className="help-button">
          <img src={CallIcon} alt="call" />
          Book a Call to Shape TaxAI
        </button>

        <button className="help-button">
          <img src={NotificationIcon} alt="notify" />
          Notify Me When Coverage Expands
        </button>
      </div>
    </StylesLandingPageHeader>
  );
};

export default Navbar;
