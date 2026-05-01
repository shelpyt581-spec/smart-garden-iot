const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

const initAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin', 12);
      await User.collection.insertOne({
        name: 'System Administrator',
        email: 'admin',
        phone: 'N/A',
        password: hashedPassword,
        age: 30,
        role: 'admin',
        hasDisability: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Admin user verified/created');
    } else {
      console.log('Admin user verified/created');
    }
  } catch (error) {
    console.error('Failed to initialize admin account:', error);
  }
};

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-park')
  .then(() => {
    console.log('MongoDB Connected');
    initAdmin();
  })
  .catch(err => console.error('MongoDB connection error:', err));

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Sanitize data to prevent NoSQL Injection
app.use((req, res, next) => {
  if (req.body) {
    mongoSanitize.sanitize(req.body);
  }
  next();
});

app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);

// Basic route to test the server
app.get('/', (req, res) => {
    res.json({ message: 'Smart Park API is running' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Global Error:', err);
    res.status(500).json({ message: err.message });
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
