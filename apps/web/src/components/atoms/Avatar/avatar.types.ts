export interface AvatarProps {
  /** Used for the initials fallback and the image alt text. */
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
