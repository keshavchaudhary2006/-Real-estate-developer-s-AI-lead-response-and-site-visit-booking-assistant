'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/cms');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center text-xs text-neutral-400 font-mono">
      Loading Sales Head Portal...
    </div>
  );
}
