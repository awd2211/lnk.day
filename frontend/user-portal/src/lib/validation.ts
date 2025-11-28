/**
 * Form validation utilities for common input types
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  if (!url.trim()) {
    return { isValid: false, error: 'URL 不能为空' };
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { isValid: false, error: 'URL 必须以 http:// 或 https:// 开头' };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: '请输入有效的 URL 地址' };
  }
}

/**
 * Validate domain name format
 */
export function validateDomain(domain: string): ValidationResult {
  if (!domain.trim()) {
    return { isValid: false, error: '域名不能为空' };
  }

  // Remove protocol if present
  let cleanDomain = domain.trim().toLowerCase();
  cleanDomain = cleanDomain.replace(/^https?:\/\//, '');
  cleanDomain = cleanDomain.replace(/\/.*$/, '');

  // Domain regex pattern
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

  if (!domainRegex.test(cleanDomain)) {
    return { isValid: false, error: '请输入有效的域名格式，例如: example.com' };
  }

  // Check for reserved domains
  const reserved = ['localhost', 'example.com', 'test.com'];
  if (reserved.includes(cleanDomain)) {
    return { isValid: false, error: '此域名为保留域名，无法使用' };
  }

  return { isValid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) {
    return { isValid: false, error: '邮箱不能为空' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: '请输入有效的邮箱地址' };
  }

  return { isValid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: '密码不能为空' };
  }

  if (password.length < 8) {
    return { isValid: false, error: '密码长度至少为 8 个字符' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: '密码需要包含至少一个大写字母' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: '密码需要包含至少一个小写字母' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: '密码需要包含至少一个数字' };
  }

  return { isValid: true };
}

/**
 * Validate slug format (for short links)
 */
export function validateSlug(slug: string): ValidationResult {
  if (!slug.trim()) {
    return { isValid: true }; // Empty slug is allowed (auto-generate)
  }

  if (slug.length < 3) {
    return { isValid: false, error: '自定义短码至少需要 3 个字符' };
  }

  if (slug.length > 32) {
    return { isValid: false, error: '自定义短码不能超过 32 个字符' };
  }

  const slugRegex = /^[a-zA-Z0-9_-]+$/;
  if (!slugRegex.test(slug)) {
    return { isValid: false, error: '短码只能包含字母、数字、下划线和连字符' };
  }

  // Check for reserved slugs
  const reserved = ['api', 'admin', 'login', 'register', 'dashboard', 'settings'];
  if (reserved.includes(slug.toLowerCase())) {
    return { isValid: false, error: '此短码为系统保留，请选择其他' };
  }

  return { isValid: true };
}

/**
 * Validate team/campaign name
 */
export function validateName(name: string, minLength = 2, maxLength = 50): ValidationResult {
  if (!name.trim()) {
    return { isValid: false, error: '名称不能为空' };
  }

  if (name.trim().length < minLength) {
    return { isValid: false, error: `名称至少需要 ${minLength} 个字符` };
  }

  if (name.trim().length > maxLength) {
    return { isValid: false, error: `名称不能超过 ${maxLength} 个字符` };
  }

  return { isValid: true };
}

/**
 * Validate webhook URL
 */
export function validateWebhookUrl(url: string): ValidationResult {
  const urlResult = validateUrl(url);
  if (!urlResult.isValid) return urlResult;

  try {
    const parsed = new URL(url);

    // Must be HTTPS for security
    if (parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Webhook URL 必须使用 HTTPS 协议' };
    }

    // Check for localhost/internal IPs
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return { isValid: false, error: 'Webhook URL 不能指向本地或内网地址' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: '请输入有效的 Webhook URL' };
  }
}

/**
 * Validate X.509 certificate format (basic check)
 */
export function validateCertificate(cert: string): ValidationResult {
  if (!cert.trim()) {
    return { isValid: false, error: '证书不能为空' };
  }

  const trimmed = cert.trim();
  if (!trimmed.startsWith('-----BEGIN CERTIFICATE-----')) {
    return { isValid: false, error: '证书格式无效，需以 -----BEGIN CERTIFICATE----- 开头' };
  }

  if (!trimmed.endsWith('-----END CERTIFICATE-----')) {
    return { isValid: false, error: '证书格式无效，需以 -----END CERTIFICATE----- 结尾' };
  }

  return { isValid: true };
}

/**
 * Combine multiple validations
 */
export function combineValidations(
  ...validations: ValidationResult[]
): ValidationResult {
  for (const validation of validations) {
    if (!validation.isValid) {
      return validation;
    }
  }
  return { isValid: true };
}

/**
 * Create a validator function that returns error message or undefined
 */
export function createValidator<T>(
  validateFn: (value: T) => ValidationResult
): (value: T) => string | undefined {
  return (value: T) => {
    const result = validateFn(value);
    return result.isValid ? undefined : result.error;
  };
}
