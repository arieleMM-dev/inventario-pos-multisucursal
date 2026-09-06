import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOtpEmail = async (to: string, code: string) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Soporte" <soporte@inventario-os.com>',
    to,
    subject: 'Código de Recuperación de Contraseña - Inventario OS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333; text-align: center;">Recuperación de Contraseña</h2>
        <p style="font-size: 16px; color: #555;">Has solicitado restablecer tu contraseña. Utiliza el siguiente código de 6 dígitos para continuar con el proceso:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000; background-color: #f4f4f4; padding: 15px 30px; border-radius: 8px;">
            ${code}
          </span>
        </div>
        
        <p style="font-size: 14px; color: #777;">Este código expirará en 15 minutos.</p>
        <p style="font-size: 14px; color: #777;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">© ${new Date().getFullYear()} Inventario OS. Todos los derechos reservados.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Mensaje enviado: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error al enviar correo: ', error);
    return false;
  }
};
