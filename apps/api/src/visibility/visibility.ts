type Visibility = 'SHOW' | 'MASK' | 'HIDE';

type AffSettingsRow = {
  aff: string;
  nameVisibility: Visibility;
  emailVisibility: Visibility;
  phoneVisibility: Visibility;
};

function maskEmail(v: string | null): string | null {
  if (!v) return v;
  const [u, d] = v.split('@');
  if (!u || !d) return '*****';
  const head = u.slice(0, 2);
  return `${head}***@${d}`;
}

function maskPhone(v: string | null): string | null {
  if (!v) return v;
  const digits = v.replace(/\D+/g, '');
  const last = digits.slice(-2);
  return `***${last}`;
}

function maskName(firstName: string | null, lastName: string | null): { firstName: string | null; lastName: string | null } {
  const f = firstName ? firstName[0] + '***' : null;
  const l = lastName ? lastName[0] + '***' : null;
  return { firstName: f, lastName: l };
}

export function applyVisibility<T extends {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}>(lead: T, settings?: AffSettingsRow | null): T {
  if (!settings) return lead;

  let out: any = { ...lead };

  if (settings.nameVisibility === 'HIDE') {
    out.firstName = null;
    out.lastName = null;
  } else if (settings.nameVisibility === 'MASK') {
    const m = maskName(out.firstName ?? null, out.lastName ?? null);
    out.firstName = m.firstName;
    out.lastName = m.lastName;
  }

  if (settings.emailVisibility === 'HIDE') {
    out.email = null;
  } else if (settings.emailVisibility === 'MASK') {
    out.email = maskEmail(out.email ?? null);
  }

  if (settings.phoneVisibility === 'HIDE') {
    out.phone = null;
  } else if (settings.phoneVisibility === 'MASK') {
    out.phone = maskPhone(out.phone ?? null);
  }

  return out as T;
}
