import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { createGame, difficulties, jump, score, speed, steer, type Difficulty } from '../game';
export function useRunner(root: Ref<HTMLElement | null>) {
  const game = reactive(createGame()),
    difficulty = ref<Difficulty>('normal'),
    round = ref(0),
    best = reactive<Record<Difficulty, number>>({ easy: 0, normal: 0, hard: 0 }),
    storageMessage = ref('');
  watch(difficulty, (value) => {
    if (game.phase === 'ready') Object.assign(game, createGame(value));
  });
  function loadBest() {
    try {
      const data = JSON.parse(localStorage.getItem('three-runner-best') ?? '{}');
      for (const k of Object.keys(difficulties) as Difficulty[])
        if (Number.isSafeInteger(data[k]) && data[k] >= 0) best[k] = data[k];
    } catch {
      storageMessage.value = '浏览器无法读取历史记录，本次仍可正常游戏。';
    }
  }
  function record() {
    const value = score(game);
    if (value <= best[game.difficulty]) return;
    best[game.difficulty] = value;
    try {
      localStorage.setItem('three-runner-best', JSON.stringify(best));
    } catch {
      storageMessage.value = '最高分已保留在本次页面中，浏览器未能保存记录。';
    }
  }
  function start() {
    record();
    round.value++;
    Object.assign(game, createGame(difficulty.value, Math.floor(Math.random() * 0xffffffff)));
    game.phase = 'running';
    root.value?.focus({ preventScroll: true });
  }
  function togglePause() {
    if (game.phase === 'running') {
      game.phase = 'paused';
      record();
    } else if (game.phase === 'paused') {
      game.phase = 'running';
      root.value?.focus({ preventScroll: true });
    }
  }
  function pause() {
    if (game.phase === 'running') togglePause();
  }
  function move(direction: number) {
    steer(game, direction);
    root.value?.focus({ preventScroll: true });
  }
  function leap() {
    jump(game);
    root.value?.focus({ preventScroll: true });
  }
  function keydown(event: KeyboardEvent) {
    if (
      !root.value?.contains(document.activeElement) ||
      /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName) ||
      (event.target as HTMLElement).isContentEditable
    )
      return;
    const code = event.code;
    if (
      ![
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'KeyA',
        'KeyD',
        'KeyW',
        'Space',
        'KeyP',
        'Escape',
      ].includes(code)
    )
      return;
    if (code !== 'KeyP' && code !== 'Escape' && game.phase !== 'running') return;
    event.preventDefault();
    if (event.repeat) return;
    if (code === 'KeyP' || code === 'Escape') togglePause();
    else if (code === 'ArrowLeft' || code === 'KeyA') move(-1);
    else if (code === 'ArrowRight' || code === 'KeyD') move(1);
    else leap();
  }
  function visibility() {
    if (document.hidden) pause();
  }
  onMounted(() => {
    loadBest();
    window.addEventListener('keydown', keydown);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
  });
  onBeforeUnmount(() => {
    record();
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('blur', pause);
    document.removeEventListener('visibilitychange', visibility);
  });
  return {
    game,
    round,
    difficulty,
    best,
    storageMessage,
    start,
    togglePause,
    pause,
    move,
    leap,
    record,
    currentScore: computed(() => score(game)),
    currentSpeed: computed(() => speed(game)),
  };
}
export type RunnerState = ReturnType<typeof useRunner>;
