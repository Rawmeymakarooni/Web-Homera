const designerService = require('../services/designerService');

exports.getDesigners = async (req, res) => {
  try {
    const designers = await designerService.getAllDesigners();
    res.json({ meet_des: designers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
