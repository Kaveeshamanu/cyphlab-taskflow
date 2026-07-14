export function passwordResetTemplate(
  name: string,
  resetUrl: string,
): { subject: string; html: string; text: string } {
  const subject = 'Reset your TaskFlow password'
  const text = `Hi ${name},\n\nA password reset was requested for your account. Visit the link below within 1 hour to choose a new password:\n${resetUrl}\n\nIf you didn't request this, you can ignore this email — your password won't change.`
  const html = `<p>Hi ${name},</p><p>A password reset was requested for your account. Click the link below within 1 hour to choose a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email — your password won't change.</p>`
  return { subject, text, html }
}
