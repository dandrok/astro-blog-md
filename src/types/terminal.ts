// Terminal types following CLAUDE.md principles

export type FileSystemNode =
  | { type: 'file'; content: string }
  | { type: 'dir'; children: Record<string, FileSystemNode> };

export type VirtualFileSystem = Record<string, FileSystemNode>;

export type TerminalState = {
  currentPath: string;
  fileSystem: VirtualFileSystem;
  commandHistory: string[];
  historyIndex: number;
};

export type TerminalCommand = {
  name: string;
  description: string;
  handler: (args: string[], state: TerminalState) => {
    output: string;
    newState?: Partial<TerminalState>;
  };
};

export type CommandHandlers = {
  help: TerminalCommand;
  ls: TerminalCommand;
  cd: TerminalCommand;
  cat: TerminalCommand;
  clear: TerminalCommand;
  exit: TerminalCommand;
};

// Terminal component props type
export type TerminalProps = {
  fileSystem: VirtualFileSystem;
  onExit: () => void;
};