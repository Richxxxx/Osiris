const nodemailer = require('nodemailer');
const AppError = require('./appError');

// Configuración del transporte de correo
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true', // true para 465, false para otros puertos
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false // Para desarrollo con Zoho
    }
  });
};

// Plantilla para el correo de restablecimiento de contraseña
const passwordResetTemplate = (user, resetUrl) => ({
  from: `"${process.env.APP_NAME || 'Sistema de Evaluación de Desempeño'}" <${process.env.EMAIL_USER || 'desarrollo@solucionescorp.com.co'}>`,
  to: user.email,
  subject: 'Restablecimiento de contraseña',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">Restablecer contraseña</h2>
      <p>Hola ${user.nombre} ${user.apellido},</p>
      <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p>Por favor, haz clic en el siguiente enlace para restablecer tu contraseña:</p>
      <p style="margin: 25px 0;">
        <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Restablecer contraseña
        </a>
      </p>
      <p>Si no solicitaste este restablecimiento, puedes ignorar este correo.</p>
      <p>El enlace expirará en 1 hora por motivos de seguridad.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #7f8c8d; font-size: 0.9em;">
        Si el botón no funciona, copia y pega esta URL en tu navegador:<br />
        ${resetUrl}
      </p>
    </div>
  `
});

// Función para enviar correo de restablecimiento de contraseña
exports.sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    const transporter = createTransporter();
    const mailOptions = passwordResetTemplate(user, resetUrl);
    
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error al enviar el correo de restablecimiento:', error);
    throw new AppError('Error al enviar el correo de restablecimiento', 500);
  }
};
