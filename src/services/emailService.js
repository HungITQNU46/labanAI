const nodemailer = require('nodemailer');

// Gửi mã xác nhận đặt lại mật khẩu qua SMTP được cấu hình trong môi trường.
async function sendPasswordResetCode(email, code) {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER?.trim();
    const password = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM?.trim();

    if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password || !from) {
        throw new Error('Cấu hình SMTP chưa đầy đủ. Hãy kiểm tra SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS và SMTP_FROM.');
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        auth: { user, pass: password }
    });

    const result = await transporter.sendMail({
        from,
        to: email,
        subject: 'Mã xác nhận đặt lại mật khẩu - La Bàn AI',
        text: `Mã xác nhận đặt lại mật khẩu của bạn là: ${code}. Mã có hiệu lực trong 3 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a"><h2>Đặt lại mật khẩu</h2><p>Mã xác nhận của bạn:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0077b6">${code}</p><p>Mã có hiệu lực trong 3 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p></div>`
    });

    if (!result.accepted.some((recipient) => String(recipient).toLowerCase() === email.toLowerCase())) {
        throw new Error('SMTP không chấp nhận địa chỉ email nhận mã xác nhận.');
    }

    return result;
}

module.exports = { sendPasswordResetCode };
