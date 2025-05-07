const bcrypt = require('bcrypt');
const editProfileDAO = require('../dao/editProfileDAO');

class EditProfileService {
  async updateProfile(payload) {
    const {
      uid, Profile, Name, Mail, Pw, Stat,
      ULoc, UWA, UInst, UJob, UDesc
    } = payload;

    const user = await editProfileDAO.findUserById(uid);
    if (!user) throw new Error('User tidak ditemukan');

    const updateData = {
      uname: Name || user.uname,
      email: Mail || user.email,
      status: Stat === 'yes' ? 'Post' : 'View',
    };

    if (Pw) {
      updateData.password = await bcrypt.hash(Pw, 10);
    }

    if (Profile) {
      updateData.ppict = Profile;
    }

    if (Stat === 'yes') {
      updateData.location = ULoc || user.location;
      updateData.whatsapp = UWA || user.whatsapp;
      updateData.instagram = UInst || user.instagram;
      updateData.user_job = UJob || user.user_job;
      updateData.user_desc = UDesc || user.user_desc;
    }

    await editProfileDAO.updateUser(uid, updateData);
    return 'Profil berhasil diperbarui.';
  }
}

module.exports = new EditProfileService();
