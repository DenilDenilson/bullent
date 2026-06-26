type PageMode = "standalone" | "embed" | "mobile";

export function getPageMode(): PageMode {
    const params = new URLSearchParams(window.location.search);
    
    return params.get("embed") === "1" ? "embed" : params.get("mobile") === "1" ? "mobile" : "standalone";
}

export function applyPageMode(mode: PageMode): void {
  document.body.classList.add(`mode-${mode}`);
}

export function supportsTouchFirstControls(): boolean {
  return (
    window.matchMedia("(pointer: coarse)").matches &&
    !window.matchMedia("(any-pointer: fine)").matches &&
    !window.matchMedia("(hover: hover)").matches
  );
}

export function shouldRedirectStandaloneToMobile(mode: PageMode): boolean {
  return mode === "standalone" && (supportsTouchFirstControls() || window.innerWidth <= 720);
}

export function goToMobileMode(): void {
  window.location.href = `${window.location.pathname}?mobile=1`;
}