const cron = require('node-cron');
const Appointment = require('../../models/Appointment');
const { sendAppointmentReminder } = require('../../services/emailService');
const logger = require('../../utils/logger');

// Run daily at 9 AM - send reminders for tomorrow's appointments
const reminderJob = cron.schedule('0 9 * * *', async () => {
  logger.info('Running appointment reminder job...');
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      appointmentDate: { $gte: tomorrow, $lte: tomorrowEnd },
      status: 'confirmed',
      reminderSent: false,
    }).populate('customerId').populate('serviceId');

    logger.info(`Sending reminders for ${appointments.length} appointments`);

    for (const appt of appointments) {
      try {
        if (appt.customerId?.email) {
          await sendAppointmentReminder(appt, appt.customerId, appt.serviceId);
          await appt.updateOne({ reminderSent: true });
        }
      } catch (err) {
        logger.error(`Reminder failed for appointment ${appt._id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`Reminder job error: ${err.message}`);
  }
}, { scheduled: false });

module.exports = reminderJob;
