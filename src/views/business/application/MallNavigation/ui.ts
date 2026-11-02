// @unocss-include
import type { Category } from './mall';

export const categories: (Category | '全部')[] = ['全部', '购物', '餐饮', '娱乐', '服务'];

// 完整原子类字符串，供 UnoCSS 静态提取。
export const categoryStyles: Record<Category, { tint: string; text: string; solid: string }> = {
  购物: { tint: 'bg-[#83b7d735]', text: 'text-[#83b7d7]', solid: 'bg-[#83b7d7]' },
  餐饮: { tint: 'bg-[#e7b78235]', text: 'text-[#e7b782]', solid: 'bg-[#e7b782]' },
  娱乐: { tint: 'bg-[#ac9cdd35]', text: 'text-[#ac9cdd]', solid: 'bg-[#ac9cdd]' },
  服务: { tint: 'bg-[#80bfae35]', text: 'text-[#80bfae]', solid: 'bg-[#80bfae]' },
};
