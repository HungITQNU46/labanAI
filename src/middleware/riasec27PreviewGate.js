/**
 * riasec27PreviewGate.js
 * 
 * Security gate middleware for Direction B RIASEC27 research preview.
 * Strictly enforces:
 *  1. LABANAI_RIASEC27_PREVIEW === 'true'
 *  2. NODE_ENV === 'development' (hard blocked in production)
 *  3. Direct loopback/localhost access only (127.0.0.1, ::1, ::ffff:127.0.0.1)
 *  4. Client-supplied headers (e.g. X-Forwarded-For) are completely ignored.
 *  5. Fails closed (404/403) without executing Python/models when unauthorized.
 */

'use strict';

const isLoopbackAddress = (ip) => {
    if (!ip) return false;
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
};

const isValidLocalhostHost = (host) => {
    if (!host) return true;
    const cleanHost = host.split(':')[0].toLowerCase();
    return cleanHost === 'localhost' || cleanHost === '127.0.0.1' || cleanHost === '::1' || cleanHost === '[::1]';
};

const isPreviewEnabled = () => {
    // 1. Must be explicitly enabled
    if (process.env.LABANAI_RIASEC27_PREVIEW !== 'true') {
        return false;
    }
    // 2. Strictly forbidden in production, regardless of flag
    if (process.env.NODE_ENV !== 'development') {
        return false;
    }
    return true;
};

const riasec27PreviewGate = (req, res, next) => {
    res.set('Cache-Control', 'no-store');

    // 1. Check feature flag and development environment
    if (!isPreviewEnabled()) {
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({
                error: 'PREVIEW_NOT_FOUND',
                message: 'Chức năng preview nghiên cứu chưa được kích hoạt.'
            });
        }
        return res.status(404).send('Not Found');
    }

    // 2. Verify direct socket remote address (DO NOT trust X-Forwarded-For or Forwarded)
    const remoteIp = req.socket?.remoteAddress || req.connection?.remoteAddress;
    if (!isLoopbackAddress(remoteIp)) {
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({
                error: 'ACCESS_DENIED',
                message: 'Chức năng preview chỉ cho phép truy cập trực tiếp từ localhost trong môi trường phát triển.'
            });
        }
        return res.status(403).send('Forbidden: Direct localhost access only.');
    }

    // 3. Verify Host header is strictly localhost/loopback
    if (!isValidLocalhostHost(req.headers.host)) {
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({
                error: 'INVALID_HOST',
                message: 'Host header không hợp lệ cho truy cập preview nội bộ.'
            });
        }
        return res.status(403).send('Forbidden: Invalid Host header.');
    }

    next();
};

module.exports = { riasec27PreviewGate, isLoopbackAddress, isValidLocalhostHost, isPreviewEnabled };
