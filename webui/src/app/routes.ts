import { createBrowserRouter } from "react-router";
import LandingPage from "./pages/LandingPage";
import DashboardLayout from "./pages/DashboardLayout";
import Overview from "./pages/Overview";
import FeatureGraph from "./pages/FeatureGraph";
import Futures from "./pages/Futures";
import Onboarding from "./pages/Onboarding";
import ComponentLibrary from "./pages/ComponentLibrary";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/onboarding",
    Component: Onboarding,
  },
  {
    path: "/components",
    Component: ComponentLibrary,
  },
  {
    path: "/dashboard",
    Component: DashboardLayout,
    children: [
      {
        index: true,
        Component: Overview,
      },
      {
        path: "graph",
        Component: FeatureGraph,
      },
      {
        path: "futures",
        Component: Futures,
      },
      {
        path: "*",
        Component: NotFound,
      },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);