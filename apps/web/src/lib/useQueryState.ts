'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(next: Record<string,string|undefined>) {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k,v]) => {
      if (v === undefined || v === '') sp.delete(k); else sp.set(k, String(v));
    });
    router.push(`${pathname}?${sp.toString()}`);
  }

  return { params, set };
}
