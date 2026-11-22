'use strict';
const { createExplanationService } = require('./explanationService');
const { ExplanationError, UNAVAILABLE } = require('./constants');
module.exports = { ...createExplanationService(), createExplanationService, ExplanationError, UNAVAILABLE };
