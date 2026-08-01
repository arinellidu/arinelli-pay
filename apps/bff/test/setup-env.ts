// Roda antes de qualquer import dos specs: o BFF lê GATEWAY_URL em import-time.
process.env.GATEWAY_URL = 'http://127.0.0.1:18090';
