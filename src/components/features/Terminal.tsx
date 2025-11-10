import React, { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from 'xterm';

interface TerminalProps {
  onExit: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({ onExit }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<XTerminal | null>(null);
  const currentLineRef = useRef('');

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal with Matrix theme configuration
    const terminal = new XTerminal({
      theme: {
        background: '#050a05',
        foreground: '#00ff41',
        cursor: '#00ff41',
        cursorAccent: '#050a05',
        selectionBackground: '#00ff4140',
      },
      fontFamily: 'VT323, ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      fontSize: 16,
      lineHeight: 1.4,
      letterSpacing: 1,
      scrollback: 1000,
      rows: 40,
      cols: 120,
    });

    // Open terminal
    terminal.open(terminalRef.current);
    terminalInstanceRef.current = terminal;

    // Focus the terminal
    terminal.focus();

    // Handle input
    terminal.onData((data) => {
      const char = data.charCodeAt(0);

      // Enter key
      if (char === 13) {
        terminal.writeln('');
        const command = currentLineRef.current.trim();

        if (command === 'exit') {
          terminal.writeln('Goodbye!');
          setTimeout(onExit, 500);
          return;
        }

        if (command === 'clear') {
          terminal.clear();
          currentLineRef.current = '';
          terminal.write('$ ');
          return;
        }

        if (command) {
          terminal.writeln(`You typed: ${command}`);
        }

        currentLineRef.current = '';
        terminal.write('$ ');
        return;
      }

      // Backspace
      if (char === 127) {
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          terminal.write('\b \b');
        }
        return;
      }

      // Regular character
      if (char >= 32 && char <= 126) {
        currentLineRef.current += data;
        terminal.write(data);
      }
    });

    // Initial prompt
    terminal.writeln('Simple Terminal');
    terminal.writeln('Type "exit" to close');
    terminal.writeln('');
    terminal.write('$ ');

    return () => {
      terminal.dispose();
    };
  }, [onExit]);

  return (
    <div
      ref={terminalRef}
      className="fixed inset-0 w-screen h-screen bg-[#050a05] z-[9999] m-0 p-0 font-mono"
    />
  );
};