// Terminal types following CLAUDE.md principles

export type FileSystemNode =
  | { type: 'file'; content: string; permissions?: string; size?: number }
  | { type: 'dir'; children: Record<string, FileSystemNode>; permissions?: string };

export type VirtualFileSystem = Record<string, FileSystemNode>;

export type TerminalState = {
  currentPath: string;
  fileSystem: VirtualFileSystem;
  commandHistory: string[];
  historyIndex: number;
  user: string;
  hostname: string;
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
  tree: TerminalCommand;
  pwd: TerminalCommand;
  whoami: TerminalCommand;
  echo: TerminalCommand;
  mkdir: TerminalCommand;
  touch: TerminalCommand;
  rm: TerminalCommand;
};

export type VirtualFileContent = {
  content: string;
  permissions?: string;
  size?: number;
  modified?: Date;
};

// Terminal component props type
export type TerminalProps = {
  onExit: () => void;
};

export type CommandResult = {
  output: string;
  prompt: string;
  shouldExit?: boolean;
};