// Test-only preload: prevent server.js from reading .env; no production behavior changes.
'use strict';
require('dotenv').config = () => ({ parsed: {} });
process.env.PYTHONIOENCODING = 'utf-8';
process.env.PYTHONDONTWRITEBYTECODE = '1';
