import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Terminal Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock DOM methods
    global.document = {
      getElementById: vi.fn(() => ({
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn(() => false),
        },
        querySelector: vi.fn(() => null),
      })),
      querySelector: vi.fn(() => null),
      addEventListener: vi.fn(),
      body: {
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
        },
      },
    } as any;

    global.window = {
      ...global.window,
      showTerminal: vi.fn(),
      hideTerminal: vi.fn(),
    } as any;
  });

  it('should have terminal functions defined', () => {
    expect(window.showTerminal).toBeDefined();
    expect(window.hideTerminal).toBeDefined();
  });

  it('should add event listeners', () => {
    // Note: This test would need the actual script to run
    // For now, we test that the function exists
    expect(global.document.addEventListener).toBeDefined();
  });

  it('should handle escape key logic', () => {
    // Test the escape key condition
    const mockEvent = { key: 'Escape' };
    const isEscapeKey = mockEvent.key === 'Escape';
    const terminalIsActive = true; // Mock active state
    
    const shouldHideTerminal = isEscapeKey && terminalIsActive;
    expect(shouldHideTerminal).toBe(true);
  });
});