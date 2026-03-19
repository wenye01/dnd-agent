// 骰子工具函数

/**
 * 掷骰子
 * @param n 骰子数量
 * @param s 骰子面数
 * @returns 骰子结果数组
 */
export function roll(n: number, s: number): number[] {
  const results: number[] = [];
  for (let i = 0; i < n; i++) {
    results.push(Math.floor(Math.random() * s) + 1);
  }
  return results;
}

/**
 * 掷骰子并返回总和
 * @param n 骰子数量
 * @param s 骰子面数
 * @returns 总和
 */
export function rollSum(n: number, s: number): number {
  return roll(n, s).reduce((a, b) => a + b, 0);
}

/**
 * 掷 d20
 * @returns 1-20 的随机数
 */
export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * 解析骰子公式 (如 "2d6+3", "1d20", "4d6k3")
 * @param formula 骰子公式
 * @returns 解析结果
 */
export function parseDiceFormula(formula: string): {
  count: number;
  sides: number;
  modifier: number;
  keepHighest?: number;
} | null {
  // 基础格式: NdS+M 或 NdS-M
  const baseMatch = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (baseMatch) {
    return {
      count: parseInt(baseMatch[1], 10),
      sides: parseInt(baseMatch[2], 10),
      modifier: baseMatch[3] ? parseInt(baseMatch[3], 10) : 0,
    };
  }

  // 保留最高格式: NdSkH (如 4d6k3)
  const keepMatch = formula.match(/^(\d+)d(\d+)k(\d+)([+-]\d+)?$/i);
  if (keepMatch) {
    return {
      count: parseInt(keepMatch[1], 10),
      sides: parseInt(keepMatch[2], 10),
      keepHighest: parseInt(keepMatch[3], 10),
      modifier: keepMatch[4] ? parseInt(keepMatch[4], 10) : 0,
    };
  }

  return null;
}
