require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Import models
const User = require('./models/User');
const Issue = require('./models/Issue');
const Expense = require('./models/Expense');
const Team = require('./models/Team');

// Import middleware
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Multi-Department API is running!', timestamp: new Date().toISOString() });
});

// User signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, department } = req.body;
    
    if (!name || !email || !password || !department) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      department
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, department: user.department },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        department: user.department
      },
      token,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User signin
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, department: user.department },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        department: user.department
      },
      token,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Team Management - HR can manage tech team members
app.get('/api/teams/my-team', auth, async (req, res) => {
  try {
    if (req.user.department !== 'HR') {
      return res.status(403).json({ error: 'Only HR users can access team management' });
    }

    const team = await Team.findOne({ hrUser: req.user._id }).populate('techMembers', 'name email');
    
    if (!team) {
      // Create empty team for HR user
      const newTeam = new Team({
        hrUser: req.user._id,
        techMembers: []
      });
      await newTeam.save();
      return res.json({ hrUser: req.user, techMembers: [] });
    }

    res.json({ hrUser: req.user, techMembers: team.techMembers });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all available tech users for HR to add to team
app.get('/api/users/tech-users', auth, async (req, res) => {
  try {
    if (req.user.department !== 'HR') {
      return res.status(403).json({ error: 'Only HR users can access this endpoint' });
    }

    const techUsers = await User.find({ department: 'Tech' }).select('name email');
    res.json(techUsers);
  } catch (error) {
    console.error('Get tech users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add tech member to HR team
app.post('/api/teams/add-member', auth, async (req, res) => {
  try {
    if (req.user.department !== 'HR') {
      return res.status(403).json({ error: 'Only HR users can add team members' });
    }

    const { techUserId } = req.body;
    
    if (!techUserId) {
      return res.status(400).json({ error: 'Tech user ID is required' });
    }

    // Check if tech user exists
    const techUser = await User.findById(techUserId);
    if (!techUser || techUser.department !== 'Tech') {
      return res.status(400).json({ error: 'Invalid tech user' });
    }

    // Find or create team for HR user
    let team = await Team.findOne({ hrUser: req.user._id });
    if (!team) {
      team = new Team({
        hrUser: req.user._id,
        techMembers: []
      });
    }

    // Check if tech user is already in team
    if (team.techMembers.includes(techUserId)) {
      return res.status(400).json({ error: 'Tech user is already in your team' });
    }

    // Add tech user to team
    team.techMembers.push(techUserId);
    await team.save();

    // Populate and return updated team
    await team.populate('techMembers', 'name email');
    res.json({ message: 'Tech member added successfully', techMembers: team.techMembers });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove tech member from HR team
app.delete('/api/teams/remove-member/:techUserId', auth, async (req, res) => {
  try {
    if (req.user.department !== 'HR') {
      return res.status(403).json({ error: 'Only HR users can remove team members' });
    }

    const { techUserId } = req.params;

    const team = await Team.findOne({ hrUser: req.user._id });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Remove tech user from team
    team.techMembers = team.techMembers.filter(memberId => memberId.toString() !== techUserId);
    await team.save();

    // Populate and return updated team
    await team.populate('techMembers', 'name email');
    res.json({ message: 'Tech member removed successfully', techMembers: team.techMembers });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get HR details for tech user
app.get('/api/teams/my-hr', auth, async (req, res) => {
  try {
    if (req.user.department !== 'Tech') {
      return res.status(403).json({ error: 'Only Tech users can access this endpoint' });
    }

    const team = await Team.findOne({ techMembers: req.user._id }).populate('hrUser', 'name email');
    
    if (!team) {
      return res.json({ assignedHR: null, message: 'You are not assigned to any HR team yet' });
    }

    res.json({ assignedHR: team.hrUser });
  } catch (error) {
    console.error('Get assigned HR error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all unassigned tech users (for HR to see who needs to be added)
app.get('/api/teams/unassigned-tech', auth, async (req, res) => {
  try {
    if (req.user.department !== 'HR') {
      return res.status(403).json({ error: 'Only HR users can access this endpoint' });
    }

    // Get all tech users
    const allTechUsers = await User.find({ department: 'Tech' }).select('name email');
    
    // Get all assigned tech users
    const teams = await Team.find({}).populate('techMembers', '_id');
    const assignedTechIds = new Set();
    teams.forEach(team => {
      team.techMembers.forEach(member => {
        assignedTechIds.add(member._id.toString());
      });
    });

    // Filter unassigned tech users
    const unassignedTechUsers = allTechUsers.filter(user => 
      !assignedTechIds.has(user._id.toString())
    );

    res.json(unassignedTechUsers);
  } catch (error) {
    console.error('Get unassigned tech users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// HR Department - Issues (Protected routes)
app.get('/api/issues', auth, async (req, res) => {
  try {
    let issues;
    
    if (req.user.department === 'HR') {
      // HR users see issues assigned to them + unassigned issues
      issues = await Issue.find({
        $or: [
          { assignedToHR: req.user._id },
          { assignedToHR: null }
        ]
      }).sort({ createdAt: -1 });
    } else {
      // Other departments see all issues (for admin purposes)
      issues = await Issue.find().sort({ createdAt: -1 });
    }
    
    res.json(issues);
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/issues', auth, async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Find the HR assigned to this tech user
    const team = await Team.findOne({ techMembers: req.user._id }).populate('hrUser', 'name email');
    
    let assignedToHR = null;
    let assignedToHRName = null;
    
    if (team) {
      assignedToHR = team.hrUser._id;
      assignedToHRName = team.hrUser.name;
    }

    const issue = new Issue({
      title,
      description,
      reportedBy: req.user.name,
      reportedByUserId: req.user._id,
      assignedToHR,
      assignedToHRName
    });

    await issue.save();
    res.status(201).json(issue);
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/issues/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(issue);
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get issues by user
app.get('/api/issues/user/:username', auth, async (req, res) => {
  try {
    const issues = await Issue.find({ reportedBy: req.params.username }).sort({ createdAt: -1 });
    res.json(issues);
  } catch (error) {
    console.error('Get user issues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Finance Department - Expenses (Protected routes)
app.get('/api/expenses', auth, async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/expenses', auth, async (req, res) => {
  try {
    const { description, amount, category, date, createdBy } = req.body;
    
    if (!description || !amount || !createdBy) {
      return res.status(400).json({ error: 'Description, amount, and createdBy are required' });
    }

    const expense = new Expense({
      description,
      amount: parseFloat(amount),
      category: category || 'office-supplies',
      date: date || new Date(),
      createdBy
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics endpoints (Protected routes)
app.get('/api/analytics/summary', auth, async (req, res) => {
  try {
    const [totalUsers, totalIssues, totalExpenses, pendingIssues, expenses] = await Promise.all([
      User.countDocuments(),
      Issue.countDocuments(),
      Expense.countDocuments(),
      Issue.countDocuments({ status: 'pending' }),
      Expense.find()
    ]);

    const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    const summary = {
      totalUsers,
      totalIssues,
      totalExpenses,
      pendingIssues,
      totalExpenseAmount
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Multi-Department API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
