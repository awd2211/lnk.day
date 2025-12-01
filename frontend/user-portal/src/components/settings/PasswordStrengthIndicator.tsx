import { useMemo } from 'react';
import { Check, X, AlertTriangle, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordRequirement {
  key: string;
  label: string;
  met: boolean;
}

interface PasswordStrengthResult {
  score: number;
  level: 'weak' | 'fair' | 'good' | 'strong' | 'excellent';
  feedback: string[];
  requirements: PasswordRequirement[];
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

function hasRepeatingChars(password: string, count: number = 3): boolean {
  const regex = new RegExp(`(.)\\1{${count - 1},}`);
  return regex.test(password);
}

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

function calculatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  const requirements: PasswordRequirement[] = [
    { key: 'minLength', label: '至少 8 个字符', met: password.length >= 8 },
    { key: 'hasLower', label: '包含小写字母', met: /[a-z]/.test(password) },
    { key: 'hasUpper', label: '包含大写字母', met: /[A-Z]/.test(password) },
    { key: 'hasDigit', label: '包含数字', met: /\d/.test(password) },
    { key: 'hasSpecial', label: '包含特殊字符', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) },
  ];

  if (!password) {
    return { score: 0, level: 'weak', feedback: ['请输入密码'], requirements };
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  const uniqueChars = new Set(password).size;

  // 长度评分
  if (password.length >= 16) score += 30;
  else if (password.length >= 12) score += 25;
  else if (password.length >= 10) score += 20;
  else if (password.length >= 8) score += 15;
  else {
    score += password.length * 2;
    feedback.push('密码长度至少需要 8 个字符');
  }

  // 字符多样性
  if (hasLower) score += 10;
  else feedback.push('添加小写字母可以增强密码强度');

  if (hasUpper) score += 10;
  else feedback.push('添加大写字母可以增强密码强度');

  if (hasDigit) score += 10;
  else feedback.push('添加数字可以增强密码强度');

  if (hasSpecial) score += 10;
  else feedback.push('添加特殊字符 (!@#$%^&*) 可以增强密码强度');

  // 唯一字符评分
  const uniqueRatio = uniqueChars / password.length;
  if (uniqueRatio >= 0.8) score += 15;
  else if (uniqueRatio >= 0.6) score += 10;
  else if (uniqueRatio >= 0.4) score += 5;
  else feedback.push('避免使用重复的字符');

  // 扣分项
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    score -= 30;
    feedback.push('这是一个常见的弱密码，请选择更独特的密码');
  }

  const lowerPassword = password.toLowerCase();
  for (const seq of KEYBOARD_SEQUENCES) {
    if (lowerPassword.includes(seq)) {
      score -= 15;
      feedback.push('避免使用键盘上连续的字符');
      break;
    }
  }

  if (hasRepeatingChars(password)) {
    score -= 10;
    feedback.push('避免连续重复的字符');
  }

  if (hasSequentialChars(password)) {
    score -= 10;
    feedback.push('避免连续的字符序列');
  }

  if (/^\d+$/.test(password)) {
    score -= 15;
    feedback.push('纯数字密码容易被破解');
  }

  score = Math.max(0, Math.min(100, score));

  const allBasicMet = requirements.slice(0, 4).every(r => r.met);
  if (allBasicMet && score < 85) {
    score = Math.min(100, score + 15);
  }

  let level: PasswordStrengthResult['level'];
  if (score >= 90) level = 'excellent';
  else if (score >= 70) level = 'strong';
  else if (score >= 50) level = 'good';
  else if (score >= 30) level = 'fair';
  else level = 'weak';

  if (feedback.length === 0) {
    if (level === 'excellent') feedback.push('密码强度极佳！');
    else if (level === 'strong') feedback.push('密码强度良好');
  }

  return { score, level, feedback, requirements };
}

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

const levelConfig = {
  weak: {
    color: 'bg-red-500',
    textColor: 'text-red-600 dark:text-red-400',
    label: '弱',
    icon: ShieldAlert,
  },
  fair: {
    color: 'bg-orange-500',
    textColor: 'text-orange-600 dark:text-orange-400',
    label: '一般',
    icon: AlertTriangle,
  },
  good: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    label: '中等',
    icon: Shield,
  },
  strong: {
    color: 'bg-green-500',
    textColor: 'text-green-600 dark:text-green-400',
    label: '强',
    icon: ShieldCheck,
  },
  excellent: {
    color: 'bg-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    label: '极强',
    icon: ShieldCheck,
  },
};

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const result = useMemo(() => calculatePasswordStrength(password), [password]);
  const config = levelConfig[result.level];
  const Icon = config.icon;

  if (!password) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* 强度条 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">密码强度</span>
          <span className={cn('flex items-center gap-1 font-medium', config.textColor)}>
            <Icon className="h-4 w-4" />
            {config.label} ({result.score}/100)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={cn('h-full transition-all duration-300', config.color)}
            style={{ width: `${result.score}%` }}
          />
        </div>
      </div>

      {/* 要求清单 */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {result.requirements.map((req) => (
          <div
            key={req.key}
            className={cn(
              'flex items-center gap-1.5',
              req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
            )}
          >
            {req.met ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <X className="h-3.5 w-3.5 text-gray-400" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>

      {/* 反馈提示 */}
      {result.feedback.length > 0 && result.level !== 'excellent' && result.level !== 'strong' && (
        <div className="rounded-md bg-amber-50 p-3 dark:bg-amber-900/20">
          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
            {result.feedback.slice(0, 3).map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// 导出验证函数供其他组件使用
export { calculatePasswordStrength };
export type { PasswordStrengthResult };
