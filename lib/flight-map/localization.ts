import { locales } from '@/lib/i18n';
import type ru from './ru.json';
export { locales };
export async function flightMapCopy(locale: string): Promise<typeof ru> {
  return (await import(`./${locale}.json`)).default;
}
export async function flightMapMessages(locale: string): Promise<Record<string, unknown>> {
  return (await import(`./locales/${locale}.json`)).default;
}
export const escapeHTML = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
