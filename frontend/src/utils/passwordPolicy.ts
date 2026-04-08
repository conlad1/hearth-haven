export const PASSWORD_MIN_LENGTH = 14;

export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'number',
    label: 'One number',
    test: (password) => /\d/.test(password),
  },
  {
    id: 'special',
    label: 'One special character',
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

export function getPasswordRuleStatus(password: string) {
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    isMet: rule.test(password),
  }));
}

export function validatePassword(password: string) {
  return PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.label);
}