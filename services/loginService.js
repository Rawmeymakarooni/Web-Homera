const bcrypt = require('bcrypt');
const userDAO = require('../dao/userDAO');

class LoginService {
  /**
   * Authenticate user by username and password
   * @param {string} Mail - Username
   * @param {string} Pw - User password
   * @returns {Promise<object>} Result with success/failure and user data
   */
  async authenticateUser(Mail, Pw) {
    try {
      const user = await userDAO.findByEmail(Mail);  // Mail dianggap sebagai email

      if (!user) {
        return { success: false, message: 'Email tidak ditemukan', statusCode: 404 };
      }

      const isPasswordValid = await bcrypt.compare(Pw, user.password);

      if (!isPasswordValid) {
        return { success: false, message: 'Password tidak sesuai', statusCode: 401 };
      }

      // Remove password from returned user object
      const { password: _, ...userWithoutPassword } = user;

      return {
        success: true,
        message: 'Login berhasil',
        statusCode: 200,
        user: userWithoutPassword
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Error saat login',
        error: error.message,
        statusCode: 500
      };
    }
  }
}

module.exports = new LoginService();
