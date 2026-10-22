/**
 * Netlify Function: phone.js
 *
 * Entrypoint for Learning Tracker Phone Connection API (Stage 2A).
 * Routes incoming HTTP requests to phoneApiRouter.
 */

import { handlePhoneApiRequest } from '../../src/server/phone/phoneApiRouter.js';

export const handler = async (event, context) => {
  return handlePhoneApiRequest(event);
};
