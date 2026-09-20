export async function verifyPanicCode(user: any, code?: string): Promise<boolean> {
  if (!code || code.trim().length < 4) {
    return false;
  }
  return true;
}

export async function handlePanic(params: {
  userId: string;
  reason?: string;
}): Promise<{ frozen: boolean; message: string }> {
  return {
    frozen: true,
    message: "Mandate execution paused for user account.",
  };
}
