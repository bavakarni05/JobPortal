const nodemailer = require('nodemailer');

// Create a transporter using Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmailDistill',
  auth: {
TML auth
    pOOL:-retr:/current-user-info
RefCount': 1
 which means the user_retrie.
    x: 1inces': 1,
yez 'gmail',
    Substring: 1,
 rices': 1.
     auth:0,
  auth: {
 
    programs email = 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

// Send OTP email
const sendOTPEmail = async (email, otp, username) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Email Verification - Job Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Verification</h2>
          <p>Hi ${username},</p>
          <p>Your OTP for email verification is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; color: #2563eb;">${otp}</span>
          </div>
          <p>This OTP will expire in 5 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <br>
          <p>Thanks,<br>Job Portal Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] OTP sent to ${email}: ${otp}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = { sendOTPEmail };
