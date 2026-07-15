// Notification/email delivery must never fail the core write it's attached
// to (task create/update/move, comment create) — the DB write has already
// committed by the time these run, so a flaky SMTP server or notification
// error becoming a thrown exception would turn a successful write into a
// 500 response. Failures are logged, not surfaced or retried.
export async function notifySafely(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch (err) {
    console.error(`[notify] ${label} failed:`, err)
  }
}
