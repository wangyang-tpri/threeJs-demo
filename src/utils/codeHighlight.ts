/**
 * 代码语法高亮（基于 highlight.js，按需注册语言）
 *
 * 将纯文本代码转换为带 <span class="hljs-*"> 标签的高亮 HTML 字符串。
 * 输出使用 highlight.js 标准 token 类名（hljs-keyword / hljs-string 等），
 * 由使用方在 <style scoped> 中通过 :deep() 定义颜色。
 *
 * 使用示例：
 *   <pre v-html="highlightCode(codeStr)"></pre>
 *   <pre v-html="highlightCode(glslStr, 'glsl')"></pre>
 */
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import glsl from 'highlight.js/lib/languages/glsl'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('glsl', glsl)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)

/** 根据代码内容启发式识别语言（JS 特征优先，识别 GLSL/HTML/JSON） */
function detectLanguage(code: string): string {
  // 教学代码均为 JS 演示，GLSL 多以字符串/片段内嵌出现，JS 特征优先避免误判
  if (/\b(import|const|let|var|function|return|=>|new THREE\.|THREE\.|gl\.|document\.)/.test(code)) {
    return 'javascript'
  }
  if (
    /^\s*#version\s+\d+|gl_FragColor|gl_Position|gl_PointSize|precision\s+(lowp|mediump|highp)|varying\s+(vec|float|int)|attribute\s+(vec|float|int)/.test(
      code
    )
  ) {
    return 'glsl'
  }
  if (/^\s*<(!doctype|\w+)/i.test(code)) return 'xml'
  if (/^\s*[\{\[]/.test(code) && /^\s*[\{\[]\s*["'\w-]+\s*:/.test(code)) return 'json'
  return 'javascript'
}

export function highlightCode(code: string, language?: string): string {
  const lang = language ?? detectLanguage(code)
  try {
    if (hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
    }
  } catch {
    // 高亮失败时降级：仅做 HTML 转义
  }
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
