import type { FinancialAccountType } from './api.service';

function normalizeSegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function collapseDuplicateAccountName(name: string) {
  const segments = name
    .split('·')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length <= 1) {
    return name.trim();
  }

  const uniqueSegments = segments.reduce<string[]>((acc, segment) => {
    if (!acc.some((current) => normalizeSegment(current) === normalizeSegment(segment))) {
      acc.push(segment);
    }
    return acc;
  }, []);

  return uniqueSegments.join(' · ');
}

export function formatFinancialAccountLabel(
  name: string,
  type: FinancialAccountType,
  sharedLabel: string
) {
  const cleanedName = collapseDuplicateAccountName(name);
  if (type === 'personal') {
    const segments = cleanedName.split('·').map((segment) => segment.trim()).filter(Boolean);
    return segments[0] ?? cleanedName;
  }

  const sharedLabelNormalized = normalizeSegment(sharedLabel);
  const segments = cleanedName.split('·').map((segment) => segment.trim()).filter(Boolean);
  const lastSegment = segments.at(-1);

  if (lastSegment && normalizeSegment(lastSegment) === sharedLabelNormalized) {
    return cleanedName;
  }

  if (normalizeSegment(cleanedName) === sharedLabelNormalized) {
    return cleanedName;
  }

  return `${cleanedName} · ${sharedLabel}`;
}
