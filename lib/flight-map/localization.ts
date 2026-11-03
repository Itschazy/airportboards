import { locales } from '@/lib/i18n';
import type ru from './ru.json';
export { locales };
export async function flightMapCopy(locale: string): Promise<typeof ru> {
  return (await import(`./${locale}.json`)).default;
}
export async function flightMapMessages(locale: string): Promise<Record<string, unknown>> {
  const [base, enhancements] = await Promise.all([import(`./locales/${locale}.json`), import(`./enhancements/${locale}.json`)]);
  return { ...base.default, ...enhancements.default };
}
export const escapeHTML = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
