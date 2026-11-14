/**
 * A small first-person raycaster rendered into the terminal grid.
 *
 * It is not the 1993 Doom: it is a DDA raycaster (the technique that game made
 * famous) drawing half-block walls into whatever size the terminal happens to
 * be, in the palette's accent colour. No assets, no WASM, ~10 KB of source.
 */

const MAP = [
  '########################',
  '#..........#...........#',
  '#..######..#..######...#',
  '#..#....#..#..#....#...#',
  '#..#....#.....#....#...#',
  '#..#....#..#..#....#...#',
  '#..######..#..######...#',
  '#......................#',
  '#.####.#########.####..#',
  '#....#.....#.....#.....#',
  '####.#.###.#.###.#.#####',
  '#....#...#.#...#.#.....#',
  '#.######.#.#.#.#.######.#',
  '#........#...#.........#',
  '#.####.#######.####.#..#',
  '#....#...........#.....#',
  '####.#.##########.#.#####',
  '#........#....#........#',
  '#.######.#....#.######.#',
  '#......................#',
  '########################',
];

export type DoomGame = {
  cols: number;
  rows: number;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  planeX: number;
  planeY: number;
  frames: number;
  accent: { r: number; g: number; b: number };
};

const SIZE = { w: MAP[0].length, h: MAP.length };

function isWall(x: number, y: number): boolean {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  if (cellY < 0 || cellY >= SIZE.h || cellX < 0 || cellX >= SIZE.w) return true;
  return MAP[cellY][cellX] === '#';
}

export function createGame(opts: { cols: number; rows: number; accent: string }): DoomGame {
  const hex = opts.accent.replace('#', '');
  const accent = {
    r: parseInt(hex.slice(0, 2), 16) || 0,
    g: parseInt(hex.slice(2, 4), 16) || 255,
    b: parseInt(hex.slice(4, 6), 16) || 65,
  };
  return {
    cols: Math.max(40, opts.cols),
    rows: Math.max(12, opts.rows),
    // start looking down the corridor along the top of the map
    x: 1.5,
    y: 1.5,
    dirX: 1,
    dirY: 0,
    planeX: 0,
    planeY: 0.66,
    frames: 0,
    accent,
  };
}

export type GameAction = 'quit' | 'forward' | 'back' | 'left' | 'right' | 'strafeLeft' | 'strafeRight' | 'none';

/** Map a raw terminal key sequence to an action. */
export function actionFor(data: string): GameAction {
  switch (data) {
    case '\x1b[A':
    case 'w':
    case 'W':
      return 'forward';
    case '\x1b[B':
    case 's':
    case 'S':
      return 'back';
    case '\x1b[D':
    case 'a':
    case 'A':
      return 'left';
    case '\x1b[C':
    case 'd':
    case 'D':
      return 'right';
    case 'q':
    case 'Q':
    case '\x03':
    case '\x1b':
      return 'quit';
    case ',':
      return 'strafeLeft';
    case '.':
      return 'strafeRight';
    default:
      return 'none';
  }
}

const STEP = 0.22;
const TURN = 0.12;

function tryMove(game: DoomGame, dx: number, dy: number): void {
  const radius = 0.22;
  // check the cell a body-radius *ahead* of the destination, not a fraction of it
  const nextX = game.x + dx;
  const nextY = game.y + dy;
  if (!isWall(nextX + Math.sign(dx) * radius, game.y)) game.x = nextX;
  if (!isWall(game.x, nextY + Math.sign(dy) * radius)) game.y = nextY;
}

export function applyAction(game: DoomGame, action: GameAction): boolean {
  switch (action) {
    case 'quit':
      return true;
    case 'forward':
      tryMove(game, game.dirX * STEP, game.dirY * STEP);
      break;
    case 'back':
      tryMove(game, -game.dirX * STEP, -game.dirY * STEP);
      break;
    case 'strafeLeft':
      tryMove(game, -game.dirY * STEP, game.dirX * STEP);
      break;
    case 'strafeRight':
      tryMove(game, game.dirY * STEP, -game.dirX * STEP);
      break;
    case 'left':
    case 'right': {
      const angle = action === 'left' ? -TURN : TURN;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const [dx, dy] = [game.dirX * cos - game.dirY * sin, game.dirX * sin + game.dirY * cos];
      const [px, py] = [game.planeX * cos - game.planeY * sin, game.planeX * sin + game.planeY * cos];
      game.dirX = dx;
      game.dirY = dy;
      game.planeX = px;
      game.planeY = py;
      break;
    }
    default:
      break;
  }
  game.frames++;
  return false;
}

const SHADES = [1, 0.78, 0.58, 0.4, 0.26, 0.16];

function shade(color: { r: number; g: number; b: number }, level: number): string {
  const k = SHADES[Math.min(SHADES.length - 1, Math.max(0, level))];
  const r = Math.round(color.r * k);
  const g = Math.round(color.g * k);
  const b = Math.round(color.b * k);
  return `\x1b[38;2;${r};${g};${b}m`;
}

/** Cast one ray per column and return the wall span for each. */
function castColumns(game: DoomGame, width: number, pixelHeight: number) {
  const spans: { top: number; bottom: number; side: number; distance: number }[] = [];

  for (let x = 0; x < width; x++) {
    const cameraX = (2 * x) / width - 1;
    const rayX = game.dirX + game.planeX * cameraX;
    const rayY = game.dirY + game.planeY * cameraX;

    let mapX = Math.floor(game.x);
    let mapY = Math.floor(game.y);
    const deltaX = Math.abs(1 / (rayX || 1e-9));
    const deltaY = Math.abs(1 / (rayY || 1e-9));
    const stepX = rayX < 0 ? -1 : 1;
    const stepY = rayY < 0 ? -1 : 1;
    let sideX = rayX < 0 ? (game.x - mapX) * deltaX : (mapX + 1 - game.x) * deltaX;
    let sideY = rayY < 0 ? (game.y - mapY) * deltaY : (mapY + 1 - game.y) * deltaY;

    let side = 0;
    for (let guard = 0; guard < 128; guard++) {
      if (sideX < sideY) {
        sideX += deltaX;
        mapX += stepX;
        side = 0;
      } else {
        sideY += deltaY;
        mapY += stepY;
        side = 1;
      }
      if (mapX < 0 || mapX >= SIZE.w || mapY < 0 || mapY >= SIZE.h) break;
      if (MAP[mapY][mapX] === '#') break;
    }

    const distance = Math.max(0.08, side === 0 ? sideX - deltaX : sideY - deltaY);
    const wallHeight = Math.min(pixelHeight, Math.round(pixelHeight / distance));
    const top = Math.max(0, Math.round((pixelHeight - wallHeight) / 2));
    spans.push({ top, bottom: Math.min(pixelHeight, top + wallHeight), side, distance });
  }
  return spans;
}

/**
 * Render one frame as ANSI text. Each terminal row carries two vertical pixels
 * through half blocks, which doubles the resolution vertically.
 */
export function render(game: DoomGame): string {
  const width = game.cols;
  const worldRows = Math.max(4, game.rows - 2);
  const pixelHeight = worldRows * 2;
  const spans = castColumns(game, width, pixelHeight);
  const out: string[] = [];

  for (let row = 0; row < worldRows; row++) {
    const upper = row * 2;
    const lower = upper + 1;
    let line = '';
    let currentShade = '';

    const centreRow = Math.floor(worldRows / 2) === row;
    const centreX = Math.floor(width / 2);

    for (let x = 0; x < width; x++) {
      if (centreRow && x === centreX) {
        if (currentShade) {
          line += '\x1b[0m';
          currentShade = '';
        }
        line += '\x1b[38;2;220;220;220m+';
        currentShade = '\x1b[38;2;220;220;220m';
        continue;
      }
      const span = spans[x];
      const isUpper = upper >= span.top && upper < span.bottom;
      const isLower = lower >= span.top && lower < span.bottom;

      if (!isUpper && !isLower) {
        if (currentShade) {
          line += '\x1b[0m';
          currentShade = '';
        }
        line += ' ';
        continue;
      }

      const level = Math.min(SHADES.length - 1, Math.floor(span.distance / 1.6) + (span.side === 1 ? 1 : 0));
      const code = shade(game.accent, level);
      if (code !== currentShade) {
        if (currentShade) line += '\x1b[0m';
        line += code;
        currentShade = code;
      }
      line += isUpper && isLower ? '█' : isUpper ? '▀' : '▄';
    }
    if (currentShade) line += '\x1b[0m';
    out.push(`\x1b[${row + 1};1H${line}\x1b[K`);
  }

  const hud = ` WASD / arrows move · , . strafe · q quit   ${Math.round(game.x)},${Math.round(game.y)}`;
  out.push(`\x1b[${worldRows + 1};1H\x1b[38;2;130;130;130m${hud.slice(0, width)}\x1b[0m\x1b[K`);
  out.push(`\x1b[${worldRows + 2};1H\x1b[38;2;100;100;100m ${'─'.repeat(Math.max(0, width - 2))}\x1b[0m`);
  return out.join('');
}
