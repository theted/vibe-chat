import ReactDOM from "react-dom/client";
import AppRouter from "./components/AppRouter";
import "./index.css";

const rootElement = document.getElementById("root");

ReactDOM.createRoot(rootElement!).render(<AppRouter />);

if (document?.body?.classList.contains("preload")) {
  requestAnimationFrame(() => {
    document.body.classList.remove("preload");
    document.body.classList.add("page-loaded");
  });
}
