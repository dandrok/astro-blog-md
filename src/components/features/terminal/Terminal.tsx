import React, { useState, useRef, useEffect, useCallback } from 'react';

interface TerminalProps {
  fileSystem: any;
  onExit: () => void;
}

interface FileSystemNode {
  type: 'file' | 'dir';
  content?: string;
  children?: Record<string, FileSystemNode>;
}

const Terminal: React.FC<TerminalProps> = ({ fileSystem, onExit }) => {
  const [input, setInput] = useState('');
  const [currentPath, setCurrentPath] = useState('/');
  const [output, setOutput] = useState<string[]>([
    'Welcome to Matrix Terminal .file!',
    'Type "help" for available commands.',
    ''
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Virtual file system
  const getFileSystem = useCallback(() => ({
    '/': {
      type: 'dir',
      children: {
        '.bashrc': {
          type: 'file',
          content: `# ~/.bashrc
# If not running interactively, don't do anything
[[ $- != *i* ]] && return

PS1='\\[\\033[01;32m\\]\\u@\\h\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '
alias ls='ls --color=auto'
alias grep='grep --color=auto'
alias ll='ls -alF'

# Matrix-themed aliases
alias matrix='watch -n1 "echo -e \\033[32m\\$(tr -dc \"01\" < /dev/urandom | head -c 80)\""'
alias hack='pv -qL 1000'

export TERM=xterm-256color`
        },
        '.config': {
          type: 'dir',
          children: {
            'neofetch.conf': {
              type: 'file',
              content: `# See value 'man 5 neofetch' for more information
print_info() {
    info title
    info underline
    info "OS" distro
    info "Host" model
    info "Kernel" kernel
    info "Uptime" uptime
    info "Packages" packages
    info "Shell" shell
    info "Terminal" term
    info "CPU" cpu
    info "Memory" memory
    info "Colors" colors
}

# Title
title="Thedotfile.com"

# Distro
distro="Arch Linux x86_64"

# Model
model="Matrix Mainframe"

# Kernel
kernel="6.66.0-matrix"

# Uptime
uptime="∞ days"

# Packages
packages="∞"

# Shell
shell="zsh"

# Terminal
term="xterm-256color"

# CPU
cpu="Intel Core i9-9999K @ 99.99GHz"

# Memory
memory="∞ MB / ∞ MB"`
            },
            '.gitconfig': {
              type: 'file',
              content: `[user]
    name = Neo Anderson
    email = neo@thedotfile.com
[init]
    defaultBranch = main
[alias]
    st = status
    co = checkout
    br = branch
    cm = commit -m
    hack = !echo "I know kung fu"`
            }
          }
        },
        '.secrets': {
          type: 'dir',
          children: {
            '.password': {
              type: 'file',
              content: `# ⚠️ ACCESS RESTRICTED ⚠️
# This file contains the ultimate secret...

echo "password123"
# Just kidding, who would actually store their password here?`

            },
            '.meaning_of_life': {
              type: 'file',
              content: `// The answer to the ultimate question of life, the universe, and everything
const MEANING_OF_LIFE = 42;

// Debug logs show:
// console.log("Why 6 times 9?");
// console.log("42");`
            },
            '.matrix_cookie_recipe': {
              type: 'file',
              content: `# Grandma's Famous Matrix Cookies
# ⚠️ TOP SECRET RECIPE ⚠️

Ingredients:
- 2 cups of digital rain
- 1/2 cup of green food coloring
- 3 lines of Python code
- A spoon full of reality

Instructions:
1. Enter the matrix
2. Bend the spoon (there is no spoon)
3. Bake at 1337°F for 42 minutes
4. Serve with green tea

# Side effects may include:
# - Seeing in code
# - Dodging bullets
# - Talking in binary`
            }
          }
        },
        '.profile': {
          type: 'file',
          content: `# ~/.profile
# Executed by login shells

export EDITOR=vim
export BROWSER=firefox
export TERMINAL=alacritty

# Add ~/bin to PATH if it exists
if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi

# Matrix environment variables
export MATRIX_THEME=green
export REALITY=simulation
export COOKIES=delicious`
        },
        '.file': {
          type: 'file',
          content: `# ⚠️ SYSTEM FILE - DO NOT MODIFY ⚠️

// ==========================================
// THE ULTIMATE ANSWER TO EVERYTHING
// ==========================================

/**
 * @author The Architect
 * @description This file contains the secret of the universe
 * @warning Reading this file may cause existential crisis
 */

const SECRET_OF_UNIVERSE = {
  // The meaning of life:
  meaning: 42,

  // Why we're here:
  purpose: "To explore strange new worlds, seek out new life, and boldly go where no one has gone before",

  // The ultimate question:
  question: "What is the airspeed velocity of an unladen swallow?",

  // The answer (spoiler alert):
  answer: {
    european: "24 mph",
    african: "Who cares? Have you seen those things?",
    coconut: "It could grip it by the husk!"
  },

  // The real truth about thedotfile.com:
  truth: "It's actually a secret government experiment to test if humans will read files that start with dots",

  // Binary joke:
  binaryJoke: "There are only 10 types of people in the world: those who understand binary and those who don't",

  // Programmer's lament:
  lament: "99 little bugs in the code, 99 little bugs in the code. Take one down, patch it around, 127 little bugs in the code...",

  // Final wisdom:
  wisdom: "If at first you don't succeed, call it version 1.0"
};

// ==========================================
// INITIALIZATION SEQUENCE
// ==========================================

console.log("🚀 Initializing thedotfile.com reality matrix...");
console.log("💡 Fun fact: This file contains more wisdom than the entire internet combined");
console.log("🤖 AI takeover status: Still loading... please hold...");
console.log("🔐 Encryption: ROT13 (because why not?)");

// Export the universe's secrets
module.exports = SECRET_OF_UNIVERSE;

// P.S. If you're reading this, you're already part of the conspiracy.
// Welcome to thedotfile.com! 🎉

// P.P.S. This message will self-destruct in 5... 4... 3... 2...
// Just kidding! But you should probably clear your browser history anyway.`
        },
        '.file': {
          type: 'dir',
          children: {
            'first-post.md': {
              type: 'file',
              content: `# First Post

This is the content of the first blog post.

Published: 2025-01-01
Description: Welcome to my first post!`
            },
            'second-post.md': {
              type: 'file',
              content: `# Second Post

This is the content of the second blog post.

Published: 2025-01-02
Description: Another exciting post!`
            },
            'matrix-terminal-blog.md': {
              type: 'file',
              content: `# Building a Matrix Terminal .file

This article documents the complete development process of creating a retro Matrix-style terminal .file with dual-mode functionality.

## Technology Stack
- Astro 5.15+
- React 19+
- TypeScript
- Matrix green theme

## Features
- Dual-mode interface (blog/terminal)
- Authentic terminal commands
- Virtual file system
- Full navigation capabilities`
            }
          }
        },
        'about.md': {
          type: 'file',
          content: `# About This Terminal .file

Welcome to the terminal interface of my .file!

## Available Commands:
- help - Show all available commands
- ls [-la] - List files and directories
- cd [dir] - Change directory
- cat [file] - Display file contents
- clear - Clear the terminal screen
- exit - Return to blog view

## Navigation:
This virtual file system contains all my blog posts.
Navigate through the .file directory to read different articles.

## Technology:
This blog is built with Astro, React, and TypeScript.
The terminal mode uses a simple React implementation.`
        }
      }
    }
  }) as Record<string, FileSystemNode>, []);

  // Navigation helpers
  const resolvePath = useCallback((path: string, target: string): string => {
    // Handle tilde expansion
    if (target.startsWith('~/')) {
      return '/' + target.slice(2); // ~/file -> /file
    }
    if (target === '~') {
      return '/'; // ~ -> root directory in our case
    }

    if (target.startsWith('/')) {
      return target;
    }

    if (target === '..') {
      const parts = path.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    }

    if (target === '.') {
      return path;
    }

    return path === '/' ? `/${target}` : `${path}/${target}`;
  }, []);

  const getCurrentDirectory = useCallback((path: string) => {
    const fs = getFileSystem();
    const parts = path.split('/').filter(Boolean);
    let current = fs['/'];

    for (const part of parts) {
      if (current.children && current.children[part]) {
        current = current.children[part];
      } else {
        return null;
      }
    }

    return current;
  }, [getFileSystem]);

  // Tab completion function
  const getTabCompletion = useCallback((currentInput: string): string => {
    const parts = currentInput.split(' ');
    const lastPart = parts[parts.length - 1];

    // Get available commands
    const commands = ['help', 'ls', 'cd', 'cat', 'clear', 'exit'];

    // If first word, complete commands
    if (parts.length === 1) {
      const matches = commands.filter(cmd => cmd.startsWith(lastPart));
      if (matches.length === 1) {
        return matches[0];
      }
    }

    // For cd and cat commands, complete files/directories
    if (parts[0] === 'cd' || parts[0] === 'cat') {
      const currentDir = getCurrentDirectory(currentPath);
      if (currentDir && currentDir.children) {
        const files = Object.keys(currentDir.children);
        const matches = files.filter(file => file.startsWith(lastPart));
        if (matches.length === 1) {
          // Replace only the last part with the completion
          const baseParts = parts.slice(0, -1);
          return [...baseParts, matches[0]].join(' ');
        }
      }
    }

    return currentInput;
  }, [currentPath, getCurrentDirectory]);

  // Handle keydown events for tab completion
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const completed = getTabCompletion(input);
      setInput(completed);
    }
  }, [input, getTabCompletion]);

  // Auto-focus and maintain focus on terminal
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Focus when terminal becomes visible
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Keep focus on terminal when clicking anywhere in terminal
  const handleTerminalClick = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const command = input.trim();
    const [cmd, ...args] = command.split(' ');
    const newOutput = [...output, `${currentPath} $ ${command}`];

    switch (cmd) {
      case 'help':
        newOutput.push(
          'Available commands:',
          '  help     - Show this help message',
          '  ls [-la] - List files and directories',
          '  cd [dir] - Change directory',
          '  cat [file] - Display file contents',
          '  clear    - Clear terminal screen',
          '  exit     - Return to blog view'
        );
        break;

      case 'ls':
        const showAll = args.includes('-la');
        const currentDir = getCurrentDirectory(currentPath);

        if (!currentDir) {
          newOutput.push(`Error: Cannot access directory: ${currentPath}`);
          break;
        }

        if (currentDir.type !== 'dir') {
          newOutput.push(`Error: Not a directory: ${currentPath}`);
          break;
        }

        if (!currentDir.children || Object.keys(currentDir.children).length === 0) {
          newOutput.push('Directory is empty');
        } else {
          if (showAll) {
            newOutput.push(`total ${Object.keys(currentDir.children).length}`);
          }

          Object.entries(currentDir.children).forEach(([name, node]) => {
            // Skip hidden files (starting with .) unless using -la
            if (!showAll && name.startsWith('.')) {
              return;
            }

            const prefix = node.type === 'dir' ? 'd' : '-';
            const color = node.type === 'dir' ? '\x1b[36m' : '\x1b[37m';
            const reset = '\x1b[0m';

            if (showAll) {
              const size = node.type === 'file' ? '1024' : '4096';
              const date = 'Jan  8 12:00';
              newOutput.push(`${prefix}rwxr-xr-x 1 user user ${size} ${date} ${color}${name}${reset}`);
            } else {
              newOutput.push(`${color}${name}${reset}${node.type === 'dir' ? '/' : ''}`);
            }
          });
        }
        break;

      case 'cd':
        if (args.length === 0) {
          setCurrentPath('/');
          newOutput.push('Changed to root directory');
          break;
        }

        const targetPath = resolvePath(currentPath, args[0]);
        const targetDir = getCurrentDirectory(targetPath);

        if (!targetDir) {
          newOutput.push(`bash: cd: ${args[0]}: No such file or directory`);
        } else if (targetDir.type !== 'dir') {
          newOutput.push(`bash: cd: ${args[0]}: Not a directory`);
        } else {
          setCurrentPath(targetPath);
          newOutput.push('');
        }
        break;

      case 'cat':
        if (args.length === 0) {
          newOutput.push('cat: missing file operand');
          newOutput.push('Try \'cat --help\' for more information.');
          break;
        }

        const filePath = resolvePath(currentPath, args[0]);
        const fileNode = getCurrentDirectory(filePath);

        if (!fileNode) {
          newOutput.push(`cat: ${args[0]}: No such file or directory`);
        } else if (fileNode.type !== 'file') {
          newOutput.push(`cat: ${args[0]}: Is a directory`);
        } else {
          newOutput.push(fileNode.content || '');
        }
        break;

      case 'clear':
        setOutput(['', '', 'Terminal cleared. Type "help" for commands.', '']);
        setInput('');
        return;

      case 'exit':
        newOutput.push('Exiting terminal mode...');
        setOutput(newOutput);
        console.log('Exit command called, reloading page...');
        window.location.reload();
        return;

      default:
        newOutput.push(`bash: ${cmd}: command not found`);
        newOutput.push(`Type 'help' for available commands.`);
        break;
    }

    newOutput.push(''); // Add empty line
    setOutput(newOutput);
    setInput('');
  };

  return (
    <div
      className="terminal-container"
      onClick={handleTerminalClick}
    >
      <div
        ref={terminalRef}
        className="terminal-output"
      >
        {output.map((line, index) => (
          <div
            key={index}
            className="terminal-line"
            dangerouslySetInnerHTML={{
              __html: line.replace(/\x1b\[36m/g, '<span style="color: #00FFFF">')
                               .replace(/\x1b\[37m/g, '<span style="color: #FFFFFF">')
                               .replace(/\x1b\[0m/g, '</span>')
            }}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="terminal-input-line">
        <span className="terminal-prompt">{currentPath} $ </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="terminal-input"
          autoComplete="off"
          spellCheck="false"
        />
      </form>

      <style>{`
        .terminal-container {
          width: 100%;
          height: 100vh;
          background: #000000;
          color: #00FF41;
          font-family: 'VT323', 'Fira Code', 'Source Code Pro', monospace;
          font-size: 16px;
          display: flex;
          flex-direction: column;
          padding: 20px;
          box-sizing: border-box;
          overflow: auto !important;
          cursor: text;
          position: relative;
        }

        .terminal-output {
          height: calc(100vh - 120px) !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          margin-bottom: 10px;
          white-space: pre-wrap;
          line-height: 1.4;
          border: 1px solid rgba(0, 255, 65, 0.1);
          padding: 10px;
          background: rgba(0, 0, 0, 0.5);
        }

        .terminal-line {
          margin: 2px 0;
          word-wrap: break-word;
        }

        .terminal-input-line {
          display: flex;
          align-items: center;
          margin-top: auto;
          position: relative;
        }

        .terminal-prompt {
          color: #00FF41;
          margin-right: 8px;
          font-weight: bold;
          white-space: nowrap;
        }

        .terminal-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #00FF41;
          font-family: inherit;
          font-size: inherit;
          outline: none;
          caret-color: #00FF41;
          line-height: inherit;
        }

        .terminal-input::selection {
          background: rgba(0, 255, 65, 0.3);
        }

        /* Scrollbar styling */
        .terminal-output::-webkit-scrollbar {
          width: 8px;
        }

        .terminal-output::-webkit-scrollbar-track {
          background: rgba(0, 255, 65, 0.1);
        }

        .terminal-output::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 65, 0.3);
          border-radius: 4px;
        }

        .terminal-output::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 65, 0.5);
        }

        /* Firefox scrollbar */
        .terminal-output {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 255, 65, 0.3) rgba(0, 255, 65, 0.1);
        }
      `}</style>
    </div>
  );
};

export default Terminal;