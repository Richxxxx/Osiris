/**
 * Envuelve una función async y maneja errores automáticamente
 * para no tener que usar try/catch en cada controlador
 */
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};