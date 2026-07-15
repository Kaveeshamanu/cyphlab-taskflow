export function taskAssignedTemplate(
  name: string,
  taskTitle: string,
  taskUrl: string,
): { subject: string; html: string; text: string } {
  const subject = `You've been assigned: ${taskTitle}`
  const text = `Hi ${name},\n\nYou've been assigned a task: "${taskTitle}".\n\nView it here:\n${taskUrl}`
  const html = `<p>Hi ${name},</p><p>You've been assigned a task: <strong>${taskTitle}</strong>.</p><p><a href="${taskUrl}">${taskUrl}</a></p>`
  return { subject, text, html }
}
