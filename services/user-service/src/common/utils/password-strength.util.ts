/**
 * 密码强度检测工具
 */

export interface PasswordStrengthResult {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong' | 'excellent';
  feedback: string[];
  requirements: PasswordRequirement[];
}

export interface PasswordRequirement {
  key: string;
  label: string;
  met: boolean;
}

// 常见弱密码列表
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123',
  'password1', 'admin', 'letmein', 'welcome', 'monkey',
  '111111', '123123', '1234567', '12345', '1234567890',
  'iloveyou', 'sunshine', 'princess', 'football', 'shadow',
];

// 常见键盘序列
const KEYBOARD_SEQUENCES = [
  'qwerty', 'asdfgh', 'zxcvbn', 'qwertyuiop', 'asdfghjkl',
  '1234567890', '0987654321', 'qazwsx', 'edcrfv',
];

// 重复字符检测
function hasRepeatingChars(password: string, count: number = 3): boolean {
  const regex = new RegExp(`(.)\\1{${count - 1},}`);
  return regex.test(password);
}

// 序列字符检测 (abc, 123, etc.)
function hasSequentialChars(password: string, count: number = 3): boolean {
  const lower = password.toLowerCase();

  for (let i = 0; i <= lower.length - count; i++) {
    let isSequential = true;
    for (let j = 1; j < count; j++) {
      if (lower.charCodeAt(i + j) !== lower.charCodeAt(i) + j) {
        isSequential = false;
        break;
      }
    }
    if (isSequential) return true;

    // 检查逆序
    isSequential = true;
    for (let j = 1; j < count; j++) {
      if (lower.charCodeAt(i + j) !== lower.charCodeAt(i) - j) {
        isSequential = false;
        break;
      }
    }
    if (isSequential) return true;
  }

  return false;
}

// 计算字符类型多样性
function getCharacterDiversity(password: string): {
  hasLower: boolean;
  hasUpper: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
  uniqueChars: number;
} {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  const uniqueChars = new Set(password).size;

  return { hasLower, hasUpper, hasDigit, hasSpecial, uniqueChars };
}

/**
 * 计算密码强度
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  // 基础要求检查
  const requirements: PasswordRequirement[] = [
    { key: 'minLength', label: '至少 8 个字符', met: password.length >= 8 },
    { key: 'hasLower', label: '包含小写字母', met: /[a-z]/.test(password) },
    { key: 'hasUpper', label: '包含大写字母', met: /[A-Z]/.test(password) },
    { key: 'hasDigit', label: '包含数字', met: /\d/.test(password) },
    { key: 'hasSpecial', label: '包含特殊字符', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) },
  ];

  if (!password) {
    return {
      score: 0,
      level: 'weak',
      feedback: ['请输入密码'],
      requirements,
    };
  }

  const diversity = getCharacterDiversity(password);

  // 长度评分 (最高 30 分)
  if (password.length >= 16) {
    score += 30;
  } else if (password.length >= 12) {
    score += 25;
  } else if (password.length >= 10) {
    score += 20;
  } else if (password.length >= 8) {
    score += 15;
  } else {
    score += password.length * 2;
    feedback.push('密码长度至少需要 8 个字符');
  }

  // 字符多样性评分 (最高 40 分)
  let diversityScore = 0;
  if (diversity.hasLower) diversityScore += 10;
  else feedback.push('添加小写字母可以增强密码强度');

  if (diversity.hasUpper) diversityScore += 10;
  else feedback.push('添加大写字母可以增强密码强度');

  if (diversity.hasDigit) diversityScore += 10;
  else feedback.push('添加数字可以增强密码强度');

  if (diversity.hasSpecial) diversityScore += 10;
  else feedback.push('添加特殊字符 (!@#$%^&*) 可以增强密码强度');

  score += diversityScore;

  // 唯一字符评分 (最高 15 分)
  const uniqueRatio = diversity.uniqueChars / password.length;
  if (uniqueRatio >= 0.8) {
    score += 15;
  } else if (uniqueRatio >= 0.6) {
    score += 10;
  } else if (uniqueRatio >= 0.4) {
    score += 5;
  } else {
    feedback.push('避免使用重复的字符');
  }

  // 扣分项

  // 常见密码检测 (-30 分)
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    score -= 30;
    feedback.push('这是一个常见的弱密码，请选择更独特的密码');
  }

  // 键盘序列检测 (-15 分)
  const lowerPassword = password.toLowerCase();
  for (const seq of KEYBOARD_SEQUENCES) {
    if (lowerPassword.includes(seq)) {
      score -= 15;
      feedback.push('避免使用键盘上连续的字符');
      break;
    }
  }

  // 重复字符检测 (-10 分)
  if (hasRepeatingChars(password)) {
    score -= 10;
    feedback.push('避免连续重复的字符 (如 "aaa")');
  }

  // 序列字符检测 (-10 分)
  if (hasSequentialChars(password)) {
    score -= 10;
    feedback.push('避免连续的字符序列 (如 "abc" 或 "123")');
  }

  // 仅数字密码 (-15 分)
  if (/^\d+$/.test(password)) {
    score -= 15;
    feedback.push('纯数字密码容易被破解');
  }

  // 确保分数在 0-100 之间
  score = Math.max(0, Math.min(100, score));

  // 额外奖励：满足所有基本要求 (+15 分)
  const allBasicMet = requirements.every(r => r.met);
  if (allBasicMet && score < 85) {
    score = Math.min(100, score + 15);
  }

  // 确定强度级别
  let level: PasswordStrengthResult['level'];
  if (score >= 90) {
    level = 'excellent';
  } else if (score >= 70) {
    level = 'strong';
  } else if (score >= 50) {
    level = 'good';
  } else if (score >= 30) {
    level = 'fair';
  } else {
    level = 'weak';
  }

  // 如果没有反馈，添加正面反馈
  if (feedback.length === 0) {
    if (level === 'excellent') {
      feedback.push('密码强度极佳！');
    } else if (level === 'strong') {
      feedback.push('密码强度良好');
    }
  }

  return {
    score,
    level,
    feedback,
    requirements,
  };
}

/**
 * 验证密码是否满足最低要求
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const result = calculatePasswordStrength(password);
  const errors: string[] = [];

  // 必须满足的基本要求
  const requiredKeys = ['minLength', 'hasLower', 'hasUpper', 'hasDigit'];
  for (const req of result.requirements) {
    if (requiredKeys.includes(req.key) && !req.met) {
      errors.push(req.label);
    }
  }

  // 最低分数要求
  if (result.score < 30) {
    errors.push('密码强度太弱，请创建更复杂的密码');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
