type PageMode = "standalone" | "embed" | "mobile";

export function getPageMode(): PageMode {
    const params = new URLSearchParams(window.location.search);
    
    return params.get("embed") === "1" ? "embed" : params.get("mobile") === "1" ? "mobile" : "standalone";
}

export function applyPageMode(mode: PageMode): void {
  document.body.classList.add(`mode-${mode}`);
}