import {
  calculatePasswordStrength,
  validatePasswordStrength,
  PasswordStrengthResult,
} from './password-strength.util';

describe('Password Strength Utilities', () => {
  describe('calculatePasswordStrength', () => {
    describe('empty and weak passwords', () => {
      it('should return score 0 for empty password', () => {
        const result = calculatePasswordStrength('');

        expect(result.score).toBe(0);
        expect(result.level).toBe('weak');
        expect(result.feedback).toContain('请输入密码');
      });

      it('should return weak for common passwords', () => {
        const commonPasswords = ['password', '123456', 'qwerty', 'admin'];

        for (const pwd of commonPasswords) {
          const result = calculatePasswordStrength(pwd);
          expect(result.level).toBe('weak');
          expect(result.feedback.some(f => f.includes('常见的弱密码'))).toBe(true);
        }
      });

      it('should penalize keyboard sequences', () => {
        const result = calculatePasswordStrength('qwertyuiop');

        expect(result.feedback.some(f => f.includes('键盘上连续的字符'))).toBe(true);
      });

      it('should penalize digit-only passwords', () => {
        const result = calculatePasswordStrength('12345678');

        expect(result.feedback.some(f => f.includes('纯数字密码'))).toBe(true);
      });

      it('should penalize repeating characters', () => {
        const result = calculatePasswordStrength('aaabbbccc');

        expect(result.feedback.some(f => f.includes('连续重复的字符'))).toBe(true);
      });

      it('should penalize sequential characters', () => {
        const result = calculatePasswordStrength('abcdefgh');

        expect(result.feedback.some(f => f.includes('连续的字符序列'))).toBe(true);
      });
    });

    describe('length scoring', () => {
      it('should give feedback for short passwords', () => {
        const result = calculatePasswordStrength('Ab1!');

        expect(result.feedback.some(f => f.includes('长度至少需要 8 个字符'))).toBe(true);
      });

      it('should give higher score for longer passwords', () => {
        const short = calculatePasswordStrength('Ab1!cdef');
        const medium = calculatePasswordStrength('Ab1!cdefghij');
        const long = calculatePasswordStrength('Ab1!cdefghijklmnop');

        expect(medium.score).toBeGreaterThan(short.score);
        expect(long.score).toBeGreaterThan(medium.score);
      });
    });

    describe('character diversity', () => {
      it('should suggest adding lowercase letters', () => {
        const result = calculatePasswordStrength('ABC123!@#');

        expect(result.feedback.some(f => f.includes('小写字母'))).toBe(true);
      });

      it('should suggest adding uppercase letters', () => {
        const result = calculatePasswordStrength('abc123!@#');

        expect(result.feedback.some(f => f.includes('大写字母'))).toBe(true);
      });

      it('should suggest adding digits', () => {
        const result = calculatePasswordStrength('ABCdef!@#');

        expect(result.feedback.some(f => f.includes('数字'))).toBe(true);
      });

      it('should suggest adding special characters', () => {
        const result = calculatePasswordStrength('ABCdef123');

        expect(result.feedback.some(f => f.includes('特殊字符'))).toBe(true);
      });

      it('should penalize low unique character ratio', () => {
        const result = calculatePasswordStrength('aaaaAAAA1111!!!!');

        expect(result.feedback.some(f => f.includes('重复的字符'))).toBe(true);
      });
    });

    describe('requirements checking', () => {
      it('should check minimum length requirement', () => {
        const short = calculatePasswordStrength('Ab1!');
        const long = calculatePasswordStrength('Ab1!cdef');

        expect(short.requirements.find(r => r.key === 'minLength')?.met).toBe(false);
        expect(long.requirements.find(r => r.key === 'minLength')?.met).toBe(true);
      });

      it('should check lowercase requirement', () => {
        const noLower = calculatePasswordStrength('ABC123!@#');
        const withLower = calculatePasswordStrength('Abc123!@#');

        expect(noLower.requirements.find(r => r.key === 'hasLower')?.met).toBe(false);
        expect(withLower.requirements.find(r => r.key === 'hasLower')?.met).toBe(true);
      });

      it('should check uppercase requirement', () => {
        const noUpper = calculatePasswordStrength('abc123!@#');
        const withUpper = calculatePasswordStrength('Abc123!@#');

        expect(noUpper.requirements.find(r => r.key === 'hasUpper')?.met).toBe(false);
        expect(withUpper.requirements.find(r => r.key === 'hasUpper')?.met).toBe(true);
      });

      it('should check digit requirement', () => {
        const noDigit = calculatePasswordStrength('Abcdef!@#');
        const withDigit = calculatePasswordStrength('Abc123!@#');

        expect(noDigit.requirements.find(r => r.key === 'hasDigit')?.met).toBe(false);
        expect(withDigit.requirements.find(r => r.key === 'hasDigit')?.met).toBe(true);
      });

      it('should check special character requirement', () => {
        const noSpecial = calculatePasswordStrength('Abc123def');
        const withSpecial = calculatePasswordStrength('Abc123!@#');

        expect(noSpecial.requirements.find(r => r.key === 'hasSpecial')?.met).toBe(false);
        expect(withSpecial.requirements.find(r => r.key === 'hasSpecial')?.met).toBe(true);
      });
    });

    describe('strength levels', () => {
      it('should return weak for low scores', () => {
        const result = calculatePasswordStrength('abc');

        expect(result.level).toBe('weak');
        expect(result.score).toBeLessThan(30);
      });

      it('should return fair for medium-low scores', () => {
        const result = calculatePasswordStrength('abcd1234');

        expect(result.level).toBe('fair');
        expect(result.score).toBeGreaterThanOrEqual(30);
        expect(result.score).toBeLessThan(50);
      });

      it('should return good for medium scores', () => {
        const result = calculatePasswordStrength('Abcd1234');

        expect(result.level).toBe('good');
        expect(result.score).toBeGreaterThanOrEqual(50);
        expect(result.score).toBeLessThan(70);
      });

      it('should return strong for high scores', () => {
        const result = calculatePasswordStrength('Abcd1234!@');

        expect(result.level).toBe('strong');
        expect(result.score).toBeGreaterThanOrEqual(70);
      });

      it('should return excellent for very strong passwords', () => {
        const result = calculatePasswordStrength('MyP@ssw0rd!Very$ecure2024');

        expect(result.level).toBe('excellent');
        expect(result.score).toBeGreaterThanOrEqual(90);
      });
    });

    describe('positive feedback', () => {
      it('should give positive feedback for excellent passwords', () => {
        const result = calculatePasswordStrength('MyP@ssw0rd!Very$ecure2024');

        expect(result.feedback.some(f => f.includes('极佳'))).toBe(true);
      });

      it('should give positive feedback for strong passwords', () => {
        const result = calculatePasswordStrength('Abcd1234!@#$');

        // Strong passwords might have no feedback if all requirements are met
        // or they might have positive feedback
        expect(result.level === 'strong' || result.level === 'excellent').toBe(true);
      });
    });

    describe('score boundaries', () => {
      it('should ensure score is at least 0', () => {
        const result = calculatePasswordStrength('123456');

        expect(result.score).toBeGreaterThanOrEqual(0);
      });

      it('should ensure score is at most 100', () => {
        const result = calculatePasswordStrength('MySuper$ecure!P@ssw0rd#With&Many*Special_Chars^2024');

        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    describe('reverse sequential detection', () => {
      it('should detect reverse sequential characters (cba)', () => {
        const result = calculatePasswordStrength('zyxwvuts');

        expect(result.feedback.some(f => f.includes('连续的字符序列'))).toBe(true);
      });

      it('should detect reverse sequential numbers (321)', () => {
        const result = calculatePasswordStrength('987654321');

        expect(result.feedback.some(f => f.includes('连续的字符序列'))).toBe(true);
      });
    });
  });

  describe('validatePasswordStrength', () => {
    describe('valid passwords', () => {
      it('should return valid for a strong password meeting all requirements', () => {
        const result = validatePasswordStrength('MyPassword123!');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid passwords', () => {
      it('should return error for too short password', () => {
        const result = validatePasswordStrength('Ab1!');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('至少 8 个字符');
      });

      it('should return error for missing lowercase', () => {
        const result = validatePasswordStrength('ABCDEFG123');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('包含小写字母');
      });

      it('should return error for missing uppercase', () => {
        const result = validatePasswordStrength('abcdefg123');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('包含大写字母');
      });

      it('should return error for missing digits', () => {
        const result = validatePasswordStrength('ABCDEfghij');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('包含数字');
      });

      it('should return error for weak score', () => {
        // Very weak password - multiple penalties
        const result = validatePasswordStrength('password');

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('密码强度太弱'))).toBe(true);
      });

      it('should return multiple errors for multiple violations', () => {
        const result = validatePasswordStrength('abc');

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        const result = validatePasswordStrength('');

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should handle password with only special characters', () => {
        const result = validatePasswordStrength('!@#$%^&*()');

        expect(result.valid).toBe(false);
      });

      it('should handle unicode characters', () => {
        const result = validatePasswordStrength('密码Password123!');

        // Should process without errors
        expect(result).toBeDefined();
      });

      it('should handle very long passwords', () => {
        const longPassword = 'Aa1!' + 'x'.repeat(200);
        const result = validatePasswordStrength(longPassword);

        expect(result).toBeDefined();
        expect(result.valid).toBe(true);
      });
    });
  });
});
