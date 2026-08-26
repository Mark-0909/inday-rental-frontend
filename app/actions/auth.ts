"use server";

export async function loginAction(email: string, password: string) {
  // Use server-side environment variables instead of NEXT_PUBLIC_ which exposes them to the client bundle
  const validEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").trim();
  const validPassword = (process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "").trim();

  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  console.log("Login attempt:", { email: trimmedEmail, expected: validEmail });

  if (trimmedEmail === validEmail && trimmedPassword === validPassword) {
    return { success: true };
  }
  
  return { success: false, error: "Invalid admin email or password. Please try again." };
}
