declare global {
  interface Window {
    showTerminal: () => void;
    hideTerminal: () => void;
  }
}

export {};