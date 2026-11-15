import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CowboyJohnsCropDefense from "./CowboyJohnsCropDefense";

const el = document.getElementById("root");
if (el) createRoot(el).render(<StrictMode><CowboyJohnsCropDefense /></StrictMode>);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  const host = location.hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => undefined); });
  }
}
