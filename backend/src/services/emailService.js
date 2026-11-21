const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const { formatINR } = require('../utils/currency');

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email send error: ${err.message}`);
    throw err;
  }
};

const sendAppointmentConfirmation = async (appointment, customer, service, staff, options = {}) => {
  const managementLink = options.managementUrl
    ? `<p style="margin-top:24px"><a href="${escapeHtml(options.managementUrl)}" style="display:inline-block;background:#6258e8;color:white;padding:12px 18px;text-decoration:none;border-radius:10px;font-weight:700">View or cancel booking</a></p><p style="font-size:12px;color:#64748b">Keep this private link safe. Anyone with the link can view and manage this booking.</p>`
    : '<p style="color:#64748b">If you need to reschedule or cancel, please contact the business.</p>';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563EB; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">BookFlow AI</h1>
      </div>
      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #1e293b;">Appointment Confirmed! ✅</h2>
        <p>Dear <strong>${escapeHtml(customer.name)}</strong>,</p>
        <p>Your appointment has been confirmed. Here are the details:</p>
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%;">
            <tr><td style="color: #64748b;">Service:</td><td><strong>${escapeHtml(service.name)}</strong></td></tr>
            <tr><td style="color: #64748b;">Staff:</td><td><strong>${escapeHtml(staff.name)}</strong></td></tr>
            <tr><td style="color: #64748b;">Date:</td><td><strong>${new Date(appointment.appointmentDate).toLocaleDateString()}</strong></td></tr>
            <tr><td style="color: #64748b;">Time:</td><td><strong>${escapeHtml(appointment.appointmentTime)}</strong></td></tr>
            <tr><td style="color: #64748b;">Duration:</td><td><strong>${service.duration} mins</strong></td></tr>
            ${Number(appointment.discountAmount || 0) > 0 ? `<tr><td style="color: #64748b;">Original price:</td><td>${escapeHtml(formatINR(appointment.basePrice ?? service.price))}</td></tr><tr><td style="color: #64748b;">Coupon (${escapeHtml(appointment.couponCode || '')}):</td><td style="color: #059669;"><strong>−${escapeHtml(formatINR(appointment.discountAmount))}</strong></td></tr>` : ''}
            <tr><td style="color: #64748b;">${Number(appointment.discountAmount || 0) > 0 ? 'Final price:' : 'Price:'}</td><td><strong>${escapeHtml(formatINR(appointment.price ?? service.price))}</strong></td></tr>
          </table>
        </div>
        ${managementLink}
      </div>
    </div>
  `;
  return sendEmail({ to: customer.email, subject: 'Appointment Confirmed - BookFlow AI', html });
};


const sendAppointmentCancellationUpdate = async (appointment, customer, service, statusText, managementUrl = '') => {
  if (!customer?.email) return null;
  const link = managementUrl
    ? `<p><a href="${escapeHtml(managementUrl)}" style="display:inline-block;background:#6258e8;color:white;padding:12px 18px;text-decoration:none;border-radius:10px;font-weight:700">View booking status</a></p>`
    : '';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
      <div style="background:#6258e8;padding:20px;text-align:center"><h1 style="color:white;margin:0">BookFlow AI</h1></div>
      <div style="padding:28px;background:#f8fafc">
        <h2>Booking cancellation update</h2>
        <p>Hello <strong>${escapeHtml(customer.name)}</strong>,</p>
        <p>${escapeHtml(statusText)}</p>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px">
          <p><strong>${escapeHtml(service?.name || 'Appointment')}</strong></p>
          <p>${escapeHtml(new Date(appointment.appointmentDate).toLocaleDateString('en-IN'))} at ${escapeHtml(appointment.appointmentTime)}</p>
        </div>
        ${link}
      </div>
    </div>`;
  return sendEmail({ to: customer.email, subject: 'Booking cancellation update - BookFlow AI', html });
};

const sendAppointmentReminder = async (appointment, customer, service) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563EB; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">BookFlow AI</h1>
      </div>
      <div style="padding: 30px;">
        <h2>⏰ Appointment Reminder</h2>
        <p>Dear <strong>${escapeHtml(customer.name)}</strong>,</p>
        <p>This is a reminder for your upcoming appointment tomorrow.</p>
        <p><strong>${escapeHtml(service.name)}</strong> at <strong>${escapeHtml(appointment.appointmentTime)}</strong></p>
        <p>See you soon!</p>
      </div>
    </div>
  `;
  return sendEmail({ to: customer.email, subject: 'Appointment Reminder - BookFlow AI', html });
};

const sendPasswordReset = async (email, resetUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563EB; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">BookFlow AI</h1>
      </div>
      <div style="padding: 30px;">
        <h2>Reset Your Password</h2>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
        <p style="color: #64748b; font-size: 12px;">If you didn't request this, ignore this email.</p>
      </div>
    </div>
  `;
  return sendEmail({ to: email, subject: 'Password Reset - BookFlow AI', html });
};

const sendEmailVerification = async (email, verifyUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563EB; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">BookFlow AI</h1>
      </div>
      <div style="padding: 30px;">
        <h2>Verify Your Email</h2>
        <p>Click below to verify your email address.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
      </div>
    </div>
  `;
  return sendEmail({ to: email, subject: 'Verify Email - BookFlow AI', html });
};

module.exports = {
  sendEmail,
  sendAppointmentConfirmation,
  sendAppointmentCancellationUpdate,
  sendAppointmentReminder,
  sendPasswordReset,
  sendEmailVerification,
};
