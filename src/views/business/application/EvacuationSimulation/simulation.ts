export const WIDTH = 25,
  DEPTH = 19;
export type Cell = [number, number];
export const exits = [
  { id: 'west', name: '西侧出口', cell: [0, 9] as Cell },
  { id: 'east', name: '东侧出口', cell: [24, 9] as Cell },
  { id: 'south', name: '南侧出口', cell: [12, 18] as Cell },
];
export const hazards = {
  none: { label: '无危险区', cell: [-10, -10] as Cell, radius: 0 },
  west: { label: '西侧危险区', cell: [4, 9] as Cell, radius: 2 },
  center: { label: '中央危险区', cell: [12, 9] as Cell, radius: 2 },
  east: { label: '东侧危险区', cell: [20, 9] as Cell, radius: 2 },
};
export type Hazard = keyof typeof hazards;
export interface Config {
  count: number;
  speed: number;
  capacity: number;
  open: string[];
  hazard: Hazard;
  seed: number;
}
export interface Agent {
  id: number;
  cell: Cell;
  from: Cell;
  progress: number;
  credit: number;
  evacuated: boolean;
  exitId: string | null;
}
export interface Simulation {
  phase: 'ready' | 'running' | 'paused' | 'completed';
  config: Config;
  agents: Agent[];
  elapsed: number;
  evacuated: number;
  throughput: Record<string, number>;
  exitCredit: Record<string, number>;
  distances: number[];
  samples: { time: number; evacuated: number }[];
  turn: number;
}
export const key = ([x, z]: Cell) => z * WIDTH + x;
export function wall([x, z]: Cell) {
  if (x < 0 || x >= WIDTH || z < 0 || z >= DEPTH) return true;
  if (x === 0 || x === WIDTH - 1 || z === 0 || z === DEPTH - 1)
    return !exits.some((e) => e.cell[0] === x && e.cell[1] === z);
  return (
    ((x === 8 || x === 16) && z !== 5 && z !== 13) ||
    ((x === 4 || x === 20) && (z === 4 || z === 5))
  );
}
export function dangerous(cell: Cell, hazard: Hazard) {
  const h = hazards[hazard];
  return h.radius > 0 && Math.hypot(cell[0] - h.cell[0], cell[1] - h.cell[1]) <= h.radius;
}
export function walkable(cell: Cell, config: Config) {
  return (
    !wall(cell) &&
    !dangerous(cell, config.hazard) &&
    !exits.some((e) => key(e.cell) === key(cell) && !config.open.includes(e.id))
  );
}
export function neighbors([x, z]: Cell): Cell[] {
  return [
    [x - 1, z],
    [x + 1, z],
    [x, z - 1],
    [x, z + 1],
  ];
}
export function distanceField(config: Config) {
  const values = Array(WIDTH * DEPTH).fill(Infinity) as number[],
    queue: Cell[] = [];
  for (const e of exits)
    if (config.open.includes(e.id) && walkable(e.cell, config)) {
      values[key(e.cell)] = 0;
      queue.push(e.cell);
    }
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i]!;
    for (const n of neighbors(cell))
      if (walkable(n, config) && values[key(n)] === Infinity) {
        values[key(n)] = values[key(cell)]! + 1;
        queue.push(n);
      }
  }
  return values;
}
export function createSimulation(config: Config): Simulation {
  const next = { ...config, open: [...config.open] },
    cells: Cell[] = [];
  for (let z = 1; z < DEPTH - 1; z++)
    for (let x = 1; x < WIDTH - 1; x++) if (walkable([x, z], next)) cells.push([x, z]);
  let seed = next.seed >>> 0;
  for (let i = cells.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = Math.floor((seed / 4294967296) * (i + 1));
    [cells[i], cells[j]] = [cells[j]!, cells[i]!];
  }
  const agents = cells
    .slice(0, Math.min(cells.length, Math.max(1, Math.round(config.count))))
    .map((cell, id) => ({
      id,
      cell: [...cell] as Cell,
      from: [...cell] as Cell,
      progress: 1,
      credit: 0,
      evacuated: false,
      exitId: null,
    }));
  next.count = agents.length;
  return {
    phase: 'ready',
    config: next,
    agents,
    elapsed: 0,
    evacuated: 0,
    throughput: { west: 0, east: 0, south: 0 },
    exitCredit: { west: 0, east: 0, south: 0 },
    distances: distanceField(next),
    samples: [{ time: 0, evacuated: 0 }],
    turn: 0,
  };
}
export function replan(s: Simulation, open: string[], hazard: Hazard) {
  s.config.open = [...open];
  s.config.hazard = hazard;
  s.distances = distanceField(s.config);
}
export function trapped(s: Simulation) {
  return s.agents.filter((a) => !a.evacuated && !reachable(s, a.cell)).length;
}
export function reachable(s: Simulation, cell: Cell) {
  return (
    Number.isFinite(s.distances[key(cell)]) ||
    neighbors(cell).some((n) => walkable(n, s.config) && Number.isFinite(s.distances[key(n)]))
  );
}
export function advance(s: Simulation, dt: number) {
  if (s.phase !== 'running' || !Number.isFinite(dt) || dt <= 0) return;
  s.elapsed += dt;
  const occupied = new Set(s.agents.filter((a) => !a.evacuated).map((a) => key(a.cell)));
  for (const e of exits)
    s.exitCredit[e.id] = Math.min(1, s.exitCredit[e.id]! + dt * s.config.capacity);
  const offset = s.turn++ % s.agents.length;
  for (let i = 0; i < s.agents.length; i++) {
    const a = s.agents[(i + offset) % s.agents.length]!;
    if (a.evacuated) continue;
    a.progress = Math.min(1, a.progress + dt * s.config.speed);
    a.credit = Math.min(1, a.credit + dt * s.config.speed);
    const exit = exits.find((e) => key(e.cell) === key(a.cell) && s.config.open.includes(e.id));
    if (exit && a.progress >= 1 && s.exitCredit[exit.id]! >= 1) {
      a.evacuated = true;
      a.exitId = exit.id;
      s.evacuated++;
      s.throughput[exit.id] = (s.throughput[exit.id] ?? 0) + 1;
      s.exitCredit[exit.id]!--;
      occupied.delete(key(a.cell));
      continue;
    }
    if (a.credit < 1 || a.progress < 1) continue;
    const current = s.distances[key(a.cell)] ?? Infinity;
    const choices = neighbors(a.cell)
      .filter(
        (n) =>
          walkable(n, s.config) &&
          !occupied.has(key(n)) &&
          (s.distances[key(n)] ?? Infinity) < current
      )
      .sort((a, b) => s.distances[key(a)]! - s.distances[key(b)]!);
    const next = choices[0];
    if (!next) continue;
    occupied.delete(key(a.cell));
    a.from = [...a.cell];
    a.cell = next;
    a.progress = 0;
    a.credit = 0;
    occupied.add(key(next));
  }
  if (s.elapsed - (s.samples.at(-1)?.time ?? 0) >= 1)
    s.samples = [
      ...s.samples.slice(-119),
      { time: Math.round(s.elapsed * 10) / 10, evacuated: s.evacuated },
    ];
  if (s.evacuated === s.agents.length) {
    s.phase = 'completed';
    s.samples.push({ time: Math.round(s.elapsed * 10) / 10, evacuated: s.evacuated });
  }
}
