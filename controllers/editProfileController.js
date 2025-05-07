const editProfileService = require('../services/editProfileService');

class EditProfileController {
  async update(req, res) {
    try {
      const message = await editProfileService.updateProfile(req.body);
      return res.status(200).json({ success: true, message });
    } catch (err) {
      console.error('Edit profile error:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new EditProfileController();
