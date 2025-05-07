const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();

// Middleware
app.use(express.json());

// Static folder for profile pictures
app.use('/images', express.static(path.join(__dirname, 'prisma/Profil')));
app.use('/portcov', express.static(path.join(__dirname, 'prisma/Portcov')));
app.use('/furni', express.static(path.join(__dirname, 'prisma/Furni')));
// Routes
const userRoutes = require('./routes/userRoutes');
const loginRoutes = require('./routes/loginRoutes');
const editProfileRoutes = require('./routes/editProfileRoutes');
const searchRoutes = require('./routes/searchRoutes');
const designerRoutes = require('./routes/designerRoutes');

app.use('/api/user', userRoutes);
app.use('/api', loginRoutes);
app.use('/api/user', editProfileRoutes);
app.use('/api', searchRoutes);
app.use('/api', designerRoutes);


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
