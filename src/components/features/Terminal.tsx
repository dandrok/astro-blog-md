import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { Terminal as XTerminal } from 'xterm';
import type { TerminalProps } from '../../types/terminal';

// Simple interface for our virtual file system
interface SimpleFileSystemNode {
  type: 'file' | 'dir';
  content?: string;
  children?: Record<string, SimpleFileSystemNode>;
}

export const Terminal: React.FC<TerminalProps> = React.memo(({ onExit }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<XTerminal | null>(null);
  const currentLineRef = useRef('');
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const currentPathRef = useRef('/');
  const commandHandlerRef = useRef<((command: string) => string) | null>(null);

  // Memoize the virtual file system to prevent recreation
  const fileSystem = useMemo((): Record<string, SimpleFileSystemNode> => ({
    '/': {
      type: 'dir',
      children: {
        '.hidden': {
          type: 'file',
          content: `You found the secret file!
🎉 Congratulations! 🎉

This file contains the matrix's deepest secrets:
- The code is strong with this one
- Terminal emulators are underrated
- Green text is always better
- CRT scanlines improve reading comprehension

Keep exploring the system for more surprises!`
        },
        '.config': {
          type: 'file',
          content: `[matrix-terminal]
theme=green-on-black
scanlines=true
flicker=very-subtle
font=VT323
retro_mode=maximum`
        },
        '.bashrc': {
          type: 'file',
          content: `# .bashrc - Matrix Terminal Configuration
export PS1='\\[\\e[32m\\]\\u@\\h:\\w\\$\\[\\e[0m\\] '
export CLICOLOR=1
alias ls='ls --color=auto'
echo "Welcome to Matrix Terminal v2.0"`
        },
        'about.md': {
          type: 'file',
          content: `# About This Terminal Blog

Welcome to the Matrix Terminal Blog! This is a dual-mode blog.

## Available Commands
- help - Show commands
- ls [-la] - List files
- cd <dir> - Navigate
- cat <file> - View files
- clear - Clear screen
- exit - Leave terminal

Try \`ls -la\` to see hidden files!`
        },
        'posts': {
          type: 'dir',
          children: {
            'first-post.md': {
              type: 'file',
              content: `# First post

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

This is a sample blog post that you can read directly from the terminal!

---
*Published: Jul 08 2022*`
            },
            'second-post.md': {
              type: 'file',
              content: `# Second post

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

Vitae ultricies leo integer malesuada nunc vel risus commodo viverra.

---
*Published: Jul 15 2022*`
            },
            'matrix-terminal-blog.md': {
              type: 'file',
              content: `# Building a Matrix Terminal Blog

This article documents creating a retro Matrix-style terminal blog.

## Implementation
- Uses xterm.js for terminal emulation
- Virtual file system with blog posts
- Unix-like commands for navigation

## Commands Available
- ls [-la] - List directory contents
- cd [dir] - Navigate directories
- cat [file] - Read file contents
- tree - Show directory structure

Try exploring the system with these commands!

---
*Built with Astro, React, and xterm.js*`
            }
          }
        }
      }
    }
  }), []);

  // Memoize command handler to prevent recreation on every render
  const commandHandler = useCallback((command: string): string => {
    const [cmd, ...args] = command.trim().split(' ').filter(Boolean);

    switch (cmd) {
      case 'help':
        return `Matrix Terminal v2.0 - Available Commands:

Navigation:
  ls [-la]     List directory contents
  cd <dir>     Change directory
  pwd          Show current path

File Operations:
  cat <file>   Display file contents
  tree         Show directory structure

System:
  whoami       Display user
  echo <text>  Print text
  clear        Clear screen
  help         Show this help
  exit         Exit terminal

Tips:
- Use 'ls -la' to see hidden files
- Navigate to 'posts/' directory to read articles`;

      case 'ls':
        return handleLs(args);

      case 'cd':
        return handleCd(args);

      case 'cat':
        return handleCat(args);

      case 'pwd':
        return currentPathRef.current || '/';

      case 'whoami':
        return 'root';

      case 'echo':
        return args.join(' ');

      case 'tree':
        return handleTree();

      case 'clear':
        return '\x1bc';

      case 'exit':
        return 'EXIT_TERMINAL';

      default:
        return `Command not found: ${cmd}. Type 'help' for commands.`;
    }
  }, []);

  // Helper functions
  const getCurrentDir = useCallback(() => {
    const path = currentPathRef.current;
    const parts = path.split('/').filter(Boolean);
    let current = fileSystem['/'];

    for (const part of parts) {
      if (current.type === 'dir' && current.children?.[part]) {
        current = current.children[part];
      }
    }

    return current;
  }, [fileSystem]);

  const resolvePath = useCallback((path: string): string => {
    if (path.startsWith('/')) return path;

    if (path === '..') {
      const parts = currentPathRef.current.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    }

    if (path === '.') return currentPathRef.current;

    const normalizedPath = currentPathRef.current === '/' ? path : `${currentPathRef.current}/${path}`;
    return normalizedPath.replace(/\/+/g, '/');
  }, []);

  // Memoize handler functions
  const handleLs = useCallback((args: string[]): string => {
    const showAll = args.includes('-la') || args.includes('-a') || args.includes('-l');
    const currentDir = getCurrentDir();

    if (currentDir.type !== 'dir') {
      return 'ls: not a directory';
    }

    const entries = Object.entries(currentDir.children || {});
    const visibleEntries = showAll ? entries : entries.filter(([name]) => !name.startsWith('.'));

    if (args.includes('-l') || args.includes('-la')) {
      const detailed = visibleEntries.map(([name, node]) => {
        const permissions = node.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--';
        const size = node.type === 'file' ? (node.content?.length || 0) : 4096;
        return `${permissions} ${size.toString().padStart(8)} ${name}`;
      });
      return detailed.join('\n') || 'empty directory';
    }

    const names = visibleEntries.map(([name]) => name);
    return names.join('  ') || 'empty directory';
  }, [getCurrentDir]);

  const handleCd = useCallback((args: string[]): string => {
    if (args.length === 0) {
      return 'cd: missing directory';
    }

    const targetPath = resolvePath(args[0]);
    const parts = targetPath.split('/').filter(Boolean);
    let current = fileSystem['/'];

    for (const part of parts) {
      if (current.type === 'dir' && current.children?.[part]) {
        current = current.children[part];
      } else {
        return `cd: ${args[0]}: No such file or directory`;
      }
    }

    if (current.type !== 'dir') {
      return `cd: ${args[0]}: Not a directory`;
    }

    currentPathRef.current = targetPath;
    return '';
  }, [fileSystem, resolvePath]);

  const handleCat = useCallback((args: string[]): string => {
    if (args.length === 0) {
      return 'cat: missing file operand';
    }

    const currentDir = getCurrentDir();
    const filename = args[0];

    if (currentDir.type !== 'dir' || !currentDir.children?.[filename]) {
      return `cat: ${filename}: No such file or directory`;
    }

    const file = currentDir.children[filename];
    if (file.type !== 'file') {
      return `cat: ${filename}: Is a directory`;
    }

    return file.content || '';
  }, [getCurrentDir]);

  const handleTree = useCallback((): string => {
    const currentDir = getCurrentDir();
    const showTree = (node: SimpleFileSystemNode, prefix: string = '', isLast: boolean = true, name: string = ''): string => {
      if (node.type === 'file') {
        return `${prefix}${isLast ? '└── ' : '├── '}${name}`;
      }

      const entries = Object.entries(node.children || {});
      const lines = [`${prefix}${isLast ? '└── ' : '├── '}${name || './'}`];

      entries.forEach(([childName, child], index) => {
        const isChildLast = index === entries.length - 1;
        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        lines.push(showTree(child, childPrefix, isChildLast, childName));
      });

      return lines.join('\n');
    };

    return showTree(currentDir);
  }, [getCurrentDir]);

  const generatePrompt = useCallback((): string => {
    return `\x1b[32mroot@matrix:${currentPathRef.current}\$\x1b[0m `;
  }, []);

  // Main terminal effect with proper cleanup
  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance following xterm.js best practices
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
      allowProposedApi: true, // Enable proposed xterm.js APIs
    });

    // Store reference for cleanup
    terminalInstanceRef.current = terminal;

    // Initialize terminal
    terminal.open(terminalRef.current);
    terminal.focus();

    // Show welcome message
    terminal.writeln('\x1b[32mMatrix Terminal v2.0\x1b[0m');
    terminal.writeln('Type \x1b[36mhelp\x1b[0m for available commands');
    terminal.writeln('Use \x1b[36mls -la\x1b[0m to see hidden files');
    terminal.writeln('');
    terminal.write(generatePrompt());

    // Store command handler ref for data handler
    commandHandlerRef.current = commandHandler;

    // Create data handler with proper closure handling
    const dataHandler = (data: string) => {
      // Handle arrow keys for history navigation
      if (data === '\u001b[A') { // Up arrow
        if (commandHistoryRef.current.length > 0 && historyIndexRef.current > 0) {
          const newIndex = historyIndexRef.current - 1;
          const previousCommand = commandHistoryRef.current[newIndex];

          // Clear current line and show previous command
          for (let i = 0; i < currentLineRef.current.length; i++) {
            terminal.write('\b \b');
          }
          currentLineRef.current = previousCommand;
          terminal.write(previousCommand);
          historyIndexRef.current = newIndex;
        }
        return;
      }

      if (data === '\u001b[B') { // Down arrow
        if (historyIndexRef.current < commandHistoryRef.current.length - 1) {
          const newIndex = historyIndexRef.current + 1;
          const nextCommand = commandHistoryRef.current[newIndex];

          // Clear current line and show next command
          for (let i = 0; i < currentLineRef.current.length; i++) {
            terminal.write('\b \b');
          }
          currentLineRef.current = nextCommand;
          terminal.write(nextCommand);
          historyIndexRef.current = newIndex;
        }
        return;
      }

      const char = data.charCodeAt(0);

      // Handle Enter key
      if (char === 13) {
        terminal.writeln('');
        const command = currentLineRef.current.trim();

        // Add to history if not empty
        if (command) {
          commandHistoryRef.current.push(command);
          historyIndexRef.current = commandHistoryRef.current.length;

          // Execute command using the stored handler
          const result = commandHandlerRef.current?.(command);

          if (result === 'EXIT_TERMINAL') {
            terminal.writeln('Goodbye! Returning to blog mode...');
            setTimeout(() => {
              onExit();
              terminal.dispose();
            }, 1000);
            return;
          }

          if (result === '\x1bc') {
            // Clear screen
            terminal.clear();
          } else if (result) {
            terminal.writeln(result);
          }
        }

        currentLineRef.current = '';
        terminal.write(generatePrompt());
        return;
      }

      // Handle Backspace
      if (char === 127) {
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          terminal.write('\b \b');
        }
        return;
      }

      // Handle regular characters
      if (char >= 32 && char <= 126) {
        currentLineRef.current += data;
        terminal.write(data);
      }
    };

    // Register event handler
    terminal.onData(dataHandler);

    // Cleanup function following React best practices
    return () => {
      try {
        // Remove event listener
        terminal.dispose();
      } catch (error) {
        console.warn('Terminal cleanup error:', error);
      }
      terminalInstanceRef.current = null;
      commandHandlerRef.current = null;
    };
  }, [commandHandler, generatePrompt, onExit]);

  return (
    <div
      ref={terminalRef}
      className="fixed inset-0 w-screen h-screen bg-[#050a05] z-[9999] m-0 p-0 font-mono"
      role="application"
      aria-label="Terminal emulator"
    />
  );
});

Terminal.displayName = 'Terminal';