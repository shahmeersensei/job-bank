import { ShieldCheck } from 'lucide-react';
import NextLink from 'next/link';
import { BrandMark } from '@/components/brand';
import { ThemeToggle } from '@/components/molecules/ThemeToggle';
import type { AuthLayoutProps } from './authLayout.types';

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(28rem,36rem)]">
      <aside className="bg-primary text-primary-fg relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="text-lg font-semibold">Saylani Job Bank</div>
        <div className="grid max-w-md gap-4">
          <p className="text-3xl leading-tight font-semibold">
            One verified profile. One traceable journey to work.
          </p>
          <p className="text-primary-fg/80">
            Register once, get matched with verified employers near you, and attend interviews in
            person.
          </p>
        </div>
        <p className="text-primary-fg/80 flex items-center gap-2 text-sm">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Your personal details are never shared with employers.
        </p>
      </aside>

      <main className="page-gutter flex flex-col py-6">
        <div className="flex items-center justify-between">
          <NextLink href="/" className="focus-visible:focus-ring rounded-lg">
            <BrandMark />
          </NextLink>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="grid w-full max-w-sm gap-6">
            <div className="grid gap-1.5">
              <h1 className="text-fg text-2xl font-semibold">{title}</h1>
              {subtitle && <p className="text-fg-muted text-sm">{subtitle}</p>}
            </div>
            {children}
            {footer && <div className="text-fg-muted text-center text-sm">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
