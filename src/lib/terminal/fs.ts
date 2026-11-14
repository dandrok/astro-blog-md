/**
 * Virtual filesystem for the terminal site.
 *
 * The seed is generated at build time from the content collection; every
 * mutation lands in a localStorage overlay so `:w` survives a reload and
 * `reset` puts the site back to its published state.
 */

export type FileNode = { type: 'file'; content: string; mode: number; mtime: number };
export type DirNode = { type: 'dir'; children: Record<string, Node>; mode: number; mtime: number };
export type Node = FileNode | DirNode;

export type SeedEntry = { path: string; content: string; mode?: number; mtime?: number };

export type ListEntry = { name: string; node: Node };

const OVERLAY_KEY = 'dotfile.vfs.v2';

/** Bumped whenever the overlay shape changes; older payloads are discarded. */
const OVERLAY_VERSION = 2;

type OverlayEntry = {
  content: string;
  mtime: number;
  /** Fingerprint of the published file this edit was made against. */
  base: string;
};

type Overlay = {
  version: number;
  files: Record<string, OverlayEntry>;
  removed: string[];
};

/** FNV-1a: enough to notice that a published file changed under a saved edit. */
function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

/** Resolve `.`, `..` and relative segments against a cwd. Always absolute. */
export function normalize(path: string, cwd = '/'): string {
  const raw = path.startsWith('/') ? path : `${cwd}/${path}`;
  const parts: string[] = [];
  for (const segment of raw.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return `/${parts.join('/')}`;
}

export function dirname(path: string): string {
  const p = normalize(path);
  if (p === '/') return '/';
  const i = p.lastIndexOf('/');
  return i <= 0 ? '/' : p.slice(0, i);
}

export function basename(path: string): string {
  const p = normalize(path);
  return p === '/' ? '/' : p.slice(p.lastIndexOf('/') + 1);
}

const now = () => Date.now();

function dir(mode = 0o755): DirNode {
  return { type: 'dir', children: {}, mode, mtime: now() };
}

export class FileSystem {
  readonly root: DirNode = dir();
  private storage: Storage | null;
  private seed: SeedEntry[];
  /** Published content by path, so an edit can be checked against its base. */
  private published = new Map<string, string>();
  private overlay: Overlay = { version: OVERLAY_VERSION, files: {}, removed: [] };
  /** Saved edits thrown away because the published file changed under them. */
  droppedEdits = 0;

  constructor(seed: SeedEntry[], storage: Storage | null = null) {
    this.storage = storage;
    this.seed = seed;
    for (const entry of seed) {
      const path = normalize(entry.path);
      this.published.set(path, entry.content);
      this.putNode(path, {
        type: 'file',
        content: entry.content,
        mode: entry.mode ?? 0o644,
        mtime: entry.mtime ?? now(),
      });
    }
    this.loadOverlay();
  }

  // ---------------------------------------------------------------- lookup

  get(path: string): Node | undefined {
    const p = normalize(path);
    if (p === '/') return this.root;
    let node: Node | undefined = this.root;
    for (const segment of p.split('/').filter(Boolean)) {
      if (!node || node.type !== 'dir') return undefined;
      node = node.children[segment];
    }
    return node;
  }

  exists(path: string): boolean {
    return this.get(path) !== undefined;
  }

  isDir(path: string): boolean {
    return this.get(path)?.type === 'dir';
  }

  dir(path: string): DirNode | undefined {
    const node = this.get(path);
    return node?.type === 'dir' ? node : undefined;
  }

  read(path: string): string | undefined {
    const node = this.get(path);
    return node?.type === 'file' ? node.content : undefined;
  }

  list(path: string): ListEntry[] {
    const node = this.dir(path);
    if (!node) return [];
    return Object.entries(node.children)
      .map(([name, child]) => ({ name, node: child }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // -------------------------------------------------------------- mutation

  /** Internal insert that creates parent directories as needed. */
  private putNode(path: string, node: Node): void {
    const p = normalize(path);
    const parts = p.split('/').filter(Boolean);
    const name = parts.pop();
    if (!name) return;
    let parent = this.root;
    for (const segment of parts) {
      const next = parent.children[segment];
      if (!next || next.type !== 'dir') {
        const created = dir();
        parent.children[segment] = created;
        parent = created;
      } else {
        parent = next;
      }
    }
    parent.children[name] = node;
  }

  mkdir(path: string, parents = false): { ok: boolean; error?: string } {
    const p = normalize(path);
    if (this.exists(p)) return { ok: false, error: `mkdir: cannot create directory '${p}': File exists` };
    const parent = this.dir(dirname(p));
    if (!parent && !parents) {
      return { ok: false, error: `mkdir: cannot create directory '${p}': No such file or directory` };
    }
    this.putNode(p, dir());
    this.track(p);
    return { ok: true };
  }

  writeFile(path: string, content: string): { ok: boolean; error?: string } {
    const p = normalize(path);
    const existing = this.get(p);
    if (existing?.type === 'dir') return { ok: false, error: `Is a directory: ${p}` };
    this.putNode(p, { type: 'file', content, mode: existing?.type === 'file' ? existing.mode : 0o644, mtime: now() });
    this.track(p);
    return { ok: true };
  }

  appendFile(path: string, content: string): { ok: boolean; error?: string } {
    const current = this.read(path) ?? '';
    return this.writeFile(path, current + content);
  }

  touch(path: string): { ok: boolean; error?: string } {
    const p = normalize(path);
    const node = this.get(p);
    if (node?.type === 'file') {
      node.mtime = now();
      return { ok: true };
    }
    return this.writeFile(p, '');
  }

  remove(path: string, recursive = false): { ok: boolean; error?: string } {
    const p = normalize(path);
    if (p === '/') return { ok: false, error: 'rm: refusing to remove /' };
    const node = this.get(p);
    if (!node) return { ok: false, error: `rm: cannot remove '${p}': No such file or directory` };
    if (node.type === 'dir' && !recursive) return { ok: false, error: `rm: cannot remove '${p}': Is a directory` };
    const parent = this.dir(dirname(p));
    if (!parent) return { ok: false, error: `rm: cannot remove '${p}': No such file or directory` };
    delete parent.children[basename(p)];
    this.overlay.removed.push(p);
    for (const key of Object.keys(this.overlay.files)) {
      if (key === p || key.startsWith(`${p}/`)) delete this.overlay.files[key];
    }
    this.persist();
    return { ok: true };
  }

  copy(from: string, to: string): { ok: boolean; error?: string } {
    const source = this.get(from);
    if (!source) return { ok: false, error: `cp: cannot stat '${from}': No such file or directory` };
    if (source.type === 'file') return this.writeFile(to, source.content);
    // recursive directory copy
    const target = normalize(to);
    this.putNode(target, dir(source.mode));
    for (const { name, node } of this.list(from)) {
      const result =
        node.type === 'file'
          ? this.writeFile(`${target}/${name}`, node.content)
          : this.copy(`${normalize(from)}/${name}`, `${target}/${name}`);
      if (!result.ok) return result;
    }
    return { ok: true };
  }

  move(from: string, to: string): { ok: boolean; error?: string } {
    const copied = this.copy(from, to);
    if (!copied.ok) return copied;
    return this.remove(normalize(from), true);
  }

  /** Sum of file contents under a path, in bytes. */
  size(path: string): number {
    const node = this.get(path);
    if (!node) return 0;
    if (node.type === 'file') return node.content.length;
    return this.list(path).reduce((total, entry) => total + this.size(`${normalize(path)}/${entry.name}`), 0);
  }

  // ------------------------------------------------------------ overlay io

  private track(path: string): void {
    const node = this.get(path);
    if (node?.type !== 'file') return;
    this.overlay.files[path] = {
      content: node.content,
      mtime: node.mtime,
      base: this.baseFor(path),
    };
    this.overlay.removed = this.overlay.removed.filter((p) => p !== path);
    this.persist();
  }

  /** Fingerprint of the published version of a path ('' if it is not published). */
  private baseFor(path: string): string {
    const published = this.published.get(normalize(path));
    return published === undefined ? '' : fingerprint(published);
  }

  private persist(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(OVERLAY_KEY, JSON.stringify(this.overlay));
    } catch {
      // quota exceeded or storage disabled — the session keeps working in memory
    }
  }

  private loadOverlay(): void {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(OVERLAY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Overlay>;

      // An overlay written by an older build cannot be trusted: the published
      // files may have changed under it. Start clean instead of resurrecting
      // text the site no longer says.
      if (parsed.version !== OVERLAY_VERSION) {
        this.droppedEdits = Object.keys(parsed.files ?? {}).length;
        this.overlay = { version: OVERLAY_VERSION, files: {}, removed: [] };
        this.persist();
        return;
      }

      this.overlay = { version: OVERLAY_VERSION, files: {}, removed: parsed.removed ?? [] };

      // Keep only edits that still sit on top of the published text: if the
      // file changed upstream, the published version wins.
      for (const [path, entry] of Object.entries(parsed.files ?? {})) {
        const base = this.baseFor(path);
        if (base && entry.base !== base) {
          this.droppedEdits++;
          continue;
        }
        this.overlay.files[path] = entry;
      }

      for (const path of this.overlay.removed) {
        const parent = this.dir(dirname(path));
        if (parent) delete parent.children[basename(path)];
      }
      for (const [path, file] of Object.entries(this.overlay.files)) {
        this.putNode(path, { type: 'file', content: file.content, mode: 0o644, mtime: file.mtime });
      }
    } catch {
      this.overlay = { version: OVERLAY_VERSION, files: {}, removed: [] };
    }
  }

  /** Number of files changed vs the published site. */
  changedCount(): number {
    return Object.keys(this.overlay.files).length + this.overlay.removed.length;
  }

  reset(): void {
    // rebuild from the published seed so in-memory state matches a reload
    this.root.children = {};
    for (const entry of this.seed) {
      this.putNode(normalize(entry.path), {
        type: 'file',
        content: entry.content,
        mode: entry.mode ?? 0o644,
        mtime: entry.mtime ?? now(),
      });
    }
    this.overlay = { version: OVERLAY_VERSION, files: {}, removed: [] };
    this.droppedEdits = 0;
    if (this.storage) {
      try {
        this.storage.removeItem(OVERLAY_KEY);
      } catch {
        // ignore
      }
    }
  }
}
