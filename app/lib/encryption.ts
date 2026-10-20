import crypto from "crypto";

// Derive 32-byte encryption key from environment variable
function getEncryptionKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.APP_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "varta_flow_fallback_secret_password_12345";

  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts sensitive string (e.g., Facebook OAuth access token) using AES-256-GCM.
 * Safe to call on already encrypted strings or null/undefined values.
 */
export function encryptToken(token: string | null | undefined): string {
  if (!token) return "";
  // If already encrypted, return as is
  if (token.startsWith("enc:")) return token;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // Standard 12-byte IV for AES-GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `enc:${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    return token; // Fallback to raw token if crypto fails
  }
}

/**
 * Decrypts sensitive string using AES-256-GCM.
 * If token is NOT encrypted (legacy token starting with EAA... or similar),
 * it returns the token unchanged, guaranteeing 100% backward compatibility.
 */
export function decryptToken(token: string | null | undefined): string {
  if (!token) return "";
  // If not encrypted with our prefix, return as-is (legacy unencrypted tokens)
  if (!token.startsWith("enc:")) return token;

  try {
    const parts = token.slice(4).split(":");
    if (parts.length !== 3) {
      console.warn("Invalid encrypted token format, returning raw string");
      return token;
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error (check ENCRYPTION_KEY / APP_SECRET):", error);
    return token;
  }
}
