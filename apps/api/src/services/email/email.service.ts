import nodemailer, { Transporter } from 'nodemailer'
import { env } from '../../config/env'
import { verifyEmailTemplate } from './templates/verifyEmail.template'
import { passwordResetTemplate } from './templates/passwordReset.template'
import { taskAssignedTemplate } from './templates/taskAssigned.template'

let transporterPromise: Promise<Transporter> | null = null

function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) transporterPromise = createTransporter()
  return transporterPromise
}

async function createTransporter(): Promise<Transporter> {
  // Tests never hit the network — jsonTransport just serializes the message.
  if (env.NODE_ENV === 'test') {
    return nodemailer.createTransport({ jsonTransport: true })
  }
  if (env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  }
  // Dev fallback: auto-provisioned Ethereal inbox, preview URL logged per send.
  const testAccount = await nodemailer.createTestAccount()
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  })
}

async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
  const transporter = await getTransporter()
  const info = await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html, text })
  if (env.NODE_ENV === 'development') {
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) console.log(`\u{1F4E7} Email preview: ${previewUrl}`)
  }
}

export async function sendVerifyEmail(to: string, name: string, verifyUrl: string): Promise<void> {
  const { subject, html, text } = verifyEmailTemplate(name, verifyUrl)
  await sendMail(to, subject, html, text)
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
  const { subject, html, text } = passwordResetTemplate(name, resetUrl)
  await sendMail(to, subject, html, text)
}

export async function sendTaskAssignedEmail(
  to: string,
  name: string,
  taskTitle: string,
  taskUrl: string,
): Promise<void> {
  const { subject, html, text } = taskAssignedTemplate(name, taskTitle, taskUrl)
  await sendMail(to, subject, html, text)
}
