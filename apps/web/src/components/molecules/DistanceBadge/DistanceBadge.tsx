import { MapPin } from 'lucide-react';
import { Badge } from '@/components/atoms/Badge';
import { distanceBand, distanceTone, formatDistance } from '@/lib/format/distance';
import type { DistanceBadgeProps } from './distanceBadge.types';

const meaning = {
  success: 'within preferred radius',
  warning: 'beyond preferred radius, within maximum',
  danger: 'outside maximum radius',
} as const;

export function DistanceBadge({ meters, policy, masked = false, className }: DistanceBadgeProps) {
  const tone = distanceTone(meters, policy);
  const text = masked ? distanceBand(meters) : formatDistance(meters);
  const description =
    tone === 'success' || tone === 'warning' || tone === 'danger' ? meaning[tone] : '';

  return (
    <Badge tone={tone} size="sm" className={className} title={`${text} — ${description}`}>
      <MapPin aria-hidden="true" />
      <span className="numeric">{text}</span>
      <span className="sr-only">, {description}</span>
    </Badge>
  );
}
