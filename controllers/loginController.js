const loginService = require('../services/loginService');

class LoginController {
  /**
   * Handle login request
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async handleLogin(req, res) {
    try {
        const { Mail, Pw } = req.body;

        if (!Mail || !Pw) {
          return res.status(400).json({
            success: false,
            message: 'Email dan password harus diisi'
          });
        }
      
      // Call authentication service
      const result = await loginService.authenticateUser(Mail, Pw);
      
      // Return response based on authentication result
      if (!result.success) {
        return res.status(result.statusCode).json({
          message: result.message
        });
      }
      
      return res.status(200).json({
        message: 'Login berhasil'
      });
    } catch (error) {
      console.error('Login controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan pada server',
        error: error.message
      });
    }
  }
}

module.exports = new LoginController();