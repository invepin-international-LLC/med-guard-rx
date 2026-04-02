/**
 * Secure PIN hashing using Web Crypto API (SHA-256).
 * The PIN is salted with a fixed app-level prefix to prevent rainbow table attacks.
 */
const PIN_SALT = 'medguardrx_pin_v1_';

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(PIN_SALT + pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
