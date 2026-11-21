require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('../src/models/Organization');
const User = require('../src/models/User');

const run = async () => {
  const email = String(process.env.PLATFORM_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.PLATFORM_ADMIN_PASSWORD || '');
  const name = String(process.env.PLATFORM_ADMIN_NAME || 'Platform Admin').trim();

  if (!email || !password) {
    throw new Error('Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD in backend/.env before bootstrapping.');
  }
  if (password.length < 14) {
    throw new Error('PLATFORM_ADMIN_PASSWORD must be at least 14 characters long.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('PLATFORM_ADMIN_EMAIL must be a valid email address.');
  }
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');

  await mongoose.connect(process.env.MONGO_URI);
  let platformOrg = await Organization.findOne({ isPlatformOrganization: true });
  if (!platformOrg) {
    platformOrg = await Organization.create({
      name: 'BookFlow Platform',
      email,
      businessType: 'other',
      active: true,
      isPlatformOrganization: true,
      publicBookingEnabled: false,
      settings: { workingHours: { start: '00:00', end: '23:59' }, slotDuration: 30, timezone: 'Asia/Kolkata' },
    });
  } else if (!platformOrg.active) {
    platformOrg.active = true;
    await platformOrg.save();
  }

  let admin = await User.findOne({ email, organizationId: platformOrg._id }).select('+password');
  if (!admin) {
    const conflictingUser = await User.findOne({ email }).select('_id organizationId role');
    if (conflictingUser) {
      throw new Error('This email already belongs to a user in another organization. Use a unique platform-admin email to avoid ambiguous login.');
    }
    admin = await User.create({
      organizationId: platformOrg._id,
      name,
      email,
      password,
      role: 'super_admin',
      isActive: true,
      isEmailVerified: true,
    });
    console.log(`Created platform Super Admin: ${email}`);
  } else {
    admin.name = name || admin.name;
    admin.role = 'super_admin';
    admin.isActive = true;
    admin.isEmailVerified = true;
    // Password is changed only with an explicit CLI flag to avoid accidental rotation.
    if (process.argv.includes('--reset-password')) admin.password = password;
    await admin.save();
    console.log(`Updated platform Super Admin record: ${email}${process.argv.includes('--reset-password') ? ' (password reset)' : ''}`);
  }
  console.log('Bootstrap complete. Sign in with this email from the normal login page; no public API can create a Super Admin role.');
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(`[Super Admin bootstrap] ${error.message}`);
  try { await mongoose.disconnect(); } catch {}
  process.exitCode = 1;
});
