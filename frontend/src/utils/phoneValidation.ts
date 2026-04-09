// Phone number validation following traditional guidelines
// Allows common international and US formats

export type PhoneRule = {
  id: string;
  label: string;
  test: (phone: string) => boolean;
};

export const PHONE_RULES: PhoneRule[] = [
  {
    id: 'length',
    label: 'At least 10 digits',
    test: (phone) => /\d/.test(phone) && (phone.replace(/\D/g, '').length >= 10),
  },
  {
    id: 'maxLength',
    label: 'No more than 15 digits',
    test: (phone) => phone.replace(/\D/g, '').length <= 15,
  },
  {
    id: 'validChars',
    label: 'Only digits and common separators (+, -, ., spaces, parentheses)',
    test: (phone) => /^[0-9\s\-\.\+\(\)]*$/.test(phone),
  },
];

export function getPhoneRuleStatus(phone: string) {
  if (!phone.trim()) {
    return [];
  }
  return PHONE_RULES.map((rule) => ({
    ...rule,
    isMet: rule.test(phone),
  }));
}

export function validatePhone(phone: string): string[] {
  if (!phone.trim()) {
    return [];
  }
  return PHONE_RULES.filter((rule) => !rule.test(phone)).map((rule) => rule.label);
}

/**
 * Check if a phone number is valid
 * Allows any phone number with 10-15 digits and common separators
 */
export function isValidPhone(phone: string | null): boolean {
  if (!phone || !phone.trim()) {
    return true; // Phone is optional
  }
  return validatePhone(phone).length === 0;
}
