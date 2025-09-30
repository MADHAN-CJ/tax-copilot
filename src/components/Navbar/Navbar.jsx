//styles
import { StylesLandingPageHeader } from "../LandingPage/styles";
//images
import Logo from "../../assets/images/logo.png";
//utils
import { onClickBounceEffect } from "../../utils/utils";
//contexts
import { useUIContext } from "../../context/UIContext";

const Navbar = () => {
  //context
  const { isSidebarOpen, setIsSidebarOpen } = useUIContext();

  return (
    <StylesLandingPageHeader>
      <div className="flex items-center">
        <img src={Logo} alt="logo" />
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
          Your AI-powered research partner for every regulation.
        </span>
      </div>
      <span className="header-right">support@revise.network</span>
    </StylesLandingPageHeader>
  );
};

export default Navbar;
