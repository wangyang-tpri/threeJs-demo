import { computed, type ComputedRef, type Ref } from 'vue';
import { highlightCode } from '../utils/codeHighlight';

/**
 * 教学面板通用逻辑：由 codeMap / explainMap（函数式动态生成）驱动，
 * 输出高亮后的代码 HTML 与讲解文本，随 activeKey 实时刷新。
 *
 * 用法：
 * const { code, explanation } = useCodeExplain(codeMap, explainMap, activeFeature)
 */
export function useCodeExplain<T extends string>(
  codeMap: Record<T, () => string>,
  explainMap: Record<T, () => string>,
  activeKey: Ref<T>
) {
  const code = computed(() => {
    const fn = codeMap[activeKey.value];
    return fn ? highlightCode(fn()) : '';
  });
  const explanation = computed(() => {
    const fn = explainMap[activeKey.value];
    return fn ? fn() : '';
  });
  return { code, explanation } as {
    code: ComputedRef<string>;
    explanation: ComputedRef<string>;
  };
}
