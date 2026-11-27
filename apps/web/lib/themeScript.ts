export const THEME_STORAGE_KEY = "rct-theme";

/**
 * Runs inline in <head> before first paint so the saved theme is applied without a flash.
 * Kept as a plain string (not a client module) so the server layout can embed it.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");document.documentElement.dataset.theme=(p==="light"||p==="dark")?p:"system";}catch(e){document.documentElement.dataset.theme="system";}})();`;
