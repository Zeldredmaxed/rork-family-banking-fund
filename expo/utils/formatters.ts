export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getCreditScoreLabel(score: number | null): { label: string; color: string } {
  if (!score) return { label: 'N/A', color: '#555570' };
  if (score >= 750) return { label: 'EXCELLENT', color: '#22c55e' };
  if (score >= 700) return { label: 'GOOD', color: '#22c55e' };
  if (score >= 650) return { label: 'FAIR', color: '#f59e0b' };
  return { label: 'POOR', color: '#ef4444' };
}

export function getInterestTier(creditScore: number | null, strikeCount: number): { tier: number; rate: number } {
  if (!creditScore) return { tier: 3, rate: 10 };
  if (creditScore >= 750 && strikeCount === 0) return { tier: 1, rate: 5 };
  if (creditScore >= 620 && strikeCount <= 1) return { tier: 2, rate: 8 };
  return { tier: 3, rate: 10 };
}

export function calculateMonthlyPayment(amount: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return amount / termMonths;
  return (amount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
}
