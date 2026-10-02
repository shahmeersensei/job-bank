import { THEME_STORAGE_KEY } from './tokens';

/**
 * Inline <head> script: applies the saved/system theme before first paint so there is
 * no light→dark flash. Kept dependency-free and tiny on purpose.
 */
export const themeScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s==='light'||s==='dark'?s:(d?'dark':'light');var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t;}catch(e){}})();`;
