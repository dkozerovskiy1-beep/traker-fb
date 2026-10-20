import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hashes plain text password using bcrypt with salt rounds = 10.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies whether password matches bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Helper to check whether a string is already a bcrypt hash.
 */
export function isBcryptHash(str: string): boolean {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str);
}
