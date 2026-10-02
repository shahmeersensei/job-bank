'use client';

import { useState } from 'react';
import { Button, Link } from '@/components/atoms';
import { FormField, OTPInput, PhoneInput, toast } from '@/components/molecules';
import { AuthLayout } from '@/components/templates';
import { formatPkMobileDisplay } from '@/lib/format/phone';

export default function AuthDemoPage() {
  const [phone, setPhone] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);

  const send = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setStep('otp');
      toast.success('Verification code sent');
    }, 700);
  };

  return (
    <AuthLayout
      title={step === 'phone' ? 'Sign in' : 'Enter verification code'}
      subtitle={
        step === 'phone'
          ? 'Use your mobile number. We will text you a 6-digit code.'
          : `We sent a code to ${phone ? formatPkMobileDisplay(phone) : 'your phone'}.`
      }
      footer={
        <>
          Employer? <Link href="/dev/components/auth">Sign in with email</Link>
        </>
      }
    >
      {step === 'phone' ? (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (phone) send();
          }}
        >
          <FormField label="Mobile number" required>
            <PhoneInput onChange={(change) => setPhone(change.e164)} autoFocus />
          </FormField>
          <Button type="submit" fullWidth disabled={!phone} loading={sending}>
            Send code
          </Button>
        </form>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            toast.success('Signed in (demo)');
          }}
        >
          <OTPInput value={code} onChange={setCode} autoFocus />
          <Button type="submit" fullWidth disabled={code.length < 6}>
            Verify
          </Button>
          <Button variant="link" onClick={() => setStep('phone')}>
            Use a different number
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
