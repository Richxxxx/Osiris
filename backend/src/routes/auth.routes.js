const express = require('express');
const authController = require('../controllers/auth.controller');
const usuarioController = require('../controllers/usuario.controller');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { blockBruteForce } = require('../middleware/security/blockBruteForce');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Aplicar rate limiting a las rutas de autenticación
router.use(authLimiter);

// Rutas de autenticación
router.post(
  '/registro', 
  blockBruteForce, // Protección contra fuerza bruta
  authController.registro
);

router.post(
  '/login', 
  blockBruteForce, // Protección contra fuerza bruta
  authController.login
);

router.get('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);

// Ruta protegida para obtener el usuario actual
router.get('/me', authController.protect, authController.getMe);

// Rutas protegidas para actualizar el perfil y la contraseña
router.patch(
  '/actualizarMiPerfil', 
  authController.protect, 
  usuarioController.actualizarMiPerfil
);

router.patch(
  '/actualizarMiContraseña', 
  authController.protect, 
  authController.updatePassword
);

// Rutas para recuperación de contraseña
router.post(
  '/forgotPassword',
  passwordResetLimiter, // Rate limiting específico para recuperación
  authController.forgotPassword
);

router.patch(
  '/resetPassword/:token',
  passwordResetLimiter, // Rate limiting también para reset
  authController.resetPassword
);

// Ruta para que el admin cambie la contraseña de un usuario
router.patch(
  '/admin/change-password/:userId',
  authController.protect,
  authController.restrictTo('administrador'),
  authController.adminChangePassword
);

module.exports = router;
