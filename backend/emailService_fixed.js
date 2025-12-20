const nodemailer = require('nodemailer');

// Create a transporter using Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send OTP email
const sendOTPEmail = async (email, otp, username) => {
  try {
    console.log('[EMAIL] Starting email send process');
    console.log('[EMAIL] EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
    console.log('[EMAIL] EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
    
    const transporter = createTransporter();
    console.log('[EMAIL] Transporter created');
    
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
    
    console.log('[EMAIL] About to send mail');
    const result = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Mail sent result:', result);
    console.log(`[EMAIL] OTP sent to ${email}: ${otp}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending email:', error);
    console.error('[EMAIL] Error details:', error.message);
    return false;
  }
};

module.exports = { sendOTPEmail };
