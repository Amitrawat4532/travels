import "server-only";
import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Used to keep login timing constant when the email does not exist.
let dummyHash: Promise<string> | null = null;
export async function fakeVerify(password: string): Promise<false> {
  dummyHash ??= bcrypt.hash("timing-equaliser-not-a-password", ROUNDS);
  await bcrypt.compare(password, await dummyHash);
  return false;
}
