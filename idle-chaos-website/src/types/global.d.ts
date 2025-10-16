export {};

declare global {
  interface Window {
    showToast?: (msg: string, variant?: "success" | "error" | "info") => void;
  }
}
