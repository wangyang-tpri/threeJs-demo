export type Difficulty = 'easy' | 'normal' | 'hard';
export type Phase = 'ready' | 'running' | 'paused' | 'lost' | 'won';
export type EntityKind = 'coin' | 'hurdle' | 'block';
export interface Entity {
  id: number;
  kind: EntityKind;
  lane: number;
  at: number;
  resolved: boolean;
}
export const difficulties = {
  easy: { label: '休闲', speed: 8, max: 14 },
  normal: { label: '标准', speed: 11, max: 20 },
  hard: { label: '挑战', speed: 14, max: 26 },
};
export const GOAL = 1000;
export const LANE_WIDTH = 2.3;
export interface Game {
  phase: Phase;
  difficulty: Difficulty;
  distance: number;
  elapsed: number;
  lane: number;
  x: number;
  jumpTime: number;
  height: number;
  lives: number;
  coins: number;
  hits: number;
  invincible: number;
  entities: Entity[];
  nextWave: number;
  seed: number;
  serial: number;
}
export function createGame(difficulty: Difficulty = 'normal', seed = 123456): Game {
  return {
    phase: 'ready',
    difficulty,
    distance: 0,
    elapsed: 0,
    lane: 0,
    x: 0,
    jumpTime: -1,
    height: 0,
    lives: 3,
    coins: 0,
    hits: 0,
    invincible: 0,
    entities: [],
    nextWave: 24,
    seed: seed >>> 0,
    serial: 0,
  };
}
export function speed(game: Game) {
  const d = difficulties[game.difficulty];
  return Math.min(d.max, d.speed + game.distance / 120);
}
export function score(game: Game) {
  return Math.floor(game.distance) + game.coins * 50;
}
export function steer(game: Game, direction: number) {
  if (game.phase === 'running')
    game.lane = Math.max(-1, Math.min(1, game.lane + Math.sign(direction)));
}
export function jump(game: Game) {
  if (game.phase === 'running' && game.jumpTime < 0) game.jumpTime = 0;
}
function random(g: Game) {
  g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0;
  return g.seed / 4294967296;
}
function spawn(g: Game) {
  const safe = Math.floor(random(g) * 3) - 1;
  for (const lane of [-1, 0, 1]) {
    if (lane === safe) {
      for (let i = 0; i < 3; i++)
        g.entities.push({
          id: ++g.serial,
          kind: 'coin',
          lane,
          at: g.nextWave + i * 3,
          resolved: false,
        });
    } else if (random(g) > 0.22)
      g.entities.push({
        id: ++g.serial,
        kind: random(g) > 0.5 ? 'hurdle' : 'block',
        lane,
        at: g.nextWave,
        resolved: false,
      });
  }
  g.nextWave += 26 + random(g) * 9;
}
/** 固定步长调用。碰撞检测涵盖这一帧走过的区间，避免高速穿透。 */
export function step(g: Game, dt: number) {
  if (g.phase !== 'running' || !Number.isFinite(dt) || dt <= 0) return;
  const previous = g.distance;
  g.elapsed += dt;
  g.distance = Math.min(GOAL, g.distance + speed(g) * dt);
  g.invincible = Math.max(0, g.invincible - dt);
  const target = g.lane * LANE_WIDTH;
  g.x += Math.sign(target - g.x) * Math.min(Math.abs(target - g.x), dt * 12);
  if (g.jumpTime >= 0) {
    g.jumpTime += dt;
    g.height = Math.max(0, 8 * g.jumpTime - 8 * g.jumpTime * g.jumpTime);
    if (g.jumpTime >= 1) {
      g.jumpTime = -1;
      g.height = 0;
    }
  }
  while (g.nextWave < g.distance + 85 && g.nextWave < GOAL - 8) spawn(g);
  for (const entity of g.entities) {
    if (entity.resolved || entity.at < previous - 0.65 || entity.at > g.distance + 0.65) continue;
    if (Math.abs(g.x - entity.lane * LANE_WIDTH) > 0.8) continue;
    if (entity.kind === 'coin') {
      if (g.height < 1.5) {
        entity.resolved = true;
        g.coins++;
      }
    } else if (entity.kind === 'block' || g.height < 1.25) {
      entity.resolved = true;
      if (g.invincible === 0) {
        g.lives--;
        g.hits++;
        g.invincible = 2;
        if (g.lives <= 0) {
          g.phase = 'lost';
          break;
        }
      }
    }
  }
  g.entities = g.entities.filter((e) => !e.resolved && e.at > g.distance - 3);
  if (g.phase === 'running' && g.distance >= GOAL) g.phase = 'won';
}
