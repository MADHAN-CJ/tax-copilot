//styles
import { StylesLandingPageHeader } from "../LandingPage/styles";

//images
import Logo from "../../assets/images/logo.png";
import SidebarIcon from "../../assets/images/sidebar-icon.svg";
import { useSocketContext } from "../../context/WebSocketContext";

const Navbar = () => {
  //context
  const { setIsSidebarOpen, isSidebarOpen } = useSocketContext();

  return (
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

        <span className="logo-text">
          Your AI-powered research partner for every regulation.
        </span>
      </div>
      <span className="header-right">support@revise.network</span>
    </StylesLandingPageHeader>
  );
};

export default Navbar;
