/**
 * usePanelStyle — dark/light side-panel style toggle persisted to storage.
 */

import { useState } from "react";
import { getStorageItem, setStorageItem } from "@/utils/storage";
import {
  PANEL_STYLE_STORAGE_KEY,
  type PanelStyle,
} from "@/config/participantsPanel";

export const usePanelStyle = () => {
  const [panelStyle, setPanelStyle] = useState<PanelStyle>(
    () =>
      (getStorageItem(PANEL_STYLE_STORAGE_KEY) as PanelStyle | null) ?? "dark",
  );

  const togglePanelStyle = () => {
    const next: PanelStyle = panelStyle === "dark" ? "light" : "dark";
    setPanelStyle(next);
    setStorageItem(PANEL_STYLE_STORAGE_KEY, next);
  };

  return { panelStyle, togglePanelStyle };
};
