const searchService = require('../services/searchService');

exports.search = async (req, res) => {
  const query = req.query.q || '';

  try {
    const result = await searchService.search(query);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};