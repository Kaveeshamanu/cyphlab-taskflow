export function verifyEmailTemplate(
  name: string,
  verifyUrl: string,
): { subject: string; html: string; text: string } {
  const subject = 'Verify your TaskFlow email address'
  const text = `Hi ${name},\n\nWelcome to TaskFlow! Verify your email by visiting:\n${verifyUrl}\n\nIf you didn't create this account, you can ignore this email.`
  const html = `<p>Hi ${name},</p><p>Welcome to TaskFlow! Verify your email by clicking the link below:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>If you didn't create this account, you can ignore this email.</p>`
  return { subject, text, html }
}
