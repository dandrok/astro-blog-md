import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window functions for terminal
Object.defineProperty(window, 'showTerminal', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(window, 'hideTerminal', {
  value: vi.fn(),
  writable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));