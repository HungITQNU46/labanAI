const HAS_LOWERCASE = /\p{Ll}/u;
const HAS_UPPERCASE = /\p{Lu}/u;
const HAS_NUMBER = /\p{N}/u;
const HAS_SPECIAL_CHARACTER = /[^\p{L}\p{N}\s]/u;

// Kiểm tra mật khẩu theo chính sách dùng chung cho tài khoản người dùng và quản trị viên.
function hasStrongPassword(password) {
    return typeof password === 'string'
        && password.length >= 8
        && Buffer.byteLength(password, 'utf8') <= 72
        && HAS_LOWERCASE.test(password)
        && HAS_UPPERCASE.test(password)
        && HAS_NUMBER.test(password)
        && HAS_SPECIAL_CHARACTER.test(password);
}

module.exports = { hasStrongPassword };
