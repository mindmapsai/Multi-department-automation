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
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

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

// Test endpoint for HR data loading
app.get('/api/test-hr', auth, async (req, res) => {
  try {
    console.log('TEST HR endpoint - User:', req.user.name, 'Department:', req.user.department);
    
    if (req.user.department !== 'HR') {
      return res.status(403).json({ error: 'Only HR users can access this test endpoint' });
    }
    
    // Test database connection
    const issueCount = await Issue.countDocuments();
    const userCount = await User.countDocuments();
    const pendingCount = await Issue.countDocuments({ status: 'pending' });
    
    res.json({
      message: 'HR test endpoint working',
      user: req.user.name,
      department: req.user.department,
      issueCount,
      userCount,
      pendingCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test HR endpoint error:', error);
    res.status(500).json({ error: 'Test endpoint failed', details: error.message });
  }
});

// Create sample issue for testing (temporary)
app.post('/api/create-sample-issue', auth, async (req, res) => {
  try {
    console.log('Creating sample issue - User:', req.user.name);
    
    const sampleIssue = new Issue({
      title: 'Sample Issue - Laptop not working',
      description: 'My laptop screen is flickering and needs IT support',
      category: 'hardware',
      priority: 'high',
      reportedBy: req.user.name,
      reportedByDepartment: req.user.department,
      reportedByUserId: req.user._id,
      status: 'pending'
    });

    await sampleIssue.save();
    console.log('Sample issue created:', sampleIssue._id);
    
    res.json({
      message: 'Sample issue created successfully',
      issue: sampleIssue
    });
  } catch (error) {
    console.error('Create sample issue error:', error);
    res.status(500).json({ error: 'Failed to create sample issue', details: error.message });
  }
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

// Get users by department for HR team management
app.get('/api/users/department/:department', auth, async (req, res) => {
  try {
    if (req.user.department !== 'HR') {
      return res.status(403).json({ error: 'Only HR users can access this endpoint' });
    }

    const { department } = req.params;
    const users = await User.find({ department }).select('name email');
    res.json(users);
  } catch (error) {
    console.error('Get department users error:', error);
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
    console.log('GET /api/issues - User:', req.user.name, 'Department:', req.user.department);
    
    let issues;
    
    if (req.user.department === 'HR') {
      // HR users see ALL issues for routing and management
      issues = await Issue.find({}).sort({ createdAt: -1 });
      console.log('HR user - Found', issues.length, 'total issues');
    } else {
      // Other departments see all issues (for admin purposes)
      issues = await Issue.find().sort({ createdAt: -1 });
      console.log('Non-HR user - Found', issues.length, 'total issues');
    }
    
    res.json(issues);
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/issues', auth, async (req, res) => {
  try {
    const { title, description, category, priority, reportedByDepartment } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Find the HR assigned to this user (if applicable)
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
      category: category || 'other',
      priority: priority || 'medium',
      reportedBy: req.user.name,
      reportedByDepartment: reportedByDepartment || req.user.department,
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
    const { status, routedToDepartment, assignedToDepartmentUser, assignedToDepartmentUserName, hrNotes, resolutionNotes, autoRouted } = req.body;
    
    const updateData = { 
      updatedAt: new Date()
    };
    
    if (status) updateData.status = status;
    if (routedToDepartment) updateData.routedToDepartment = routedToDepartment;
    if (assignedToDepartmentUser) updateData.assignedToDepartmentUser = assignedToDepartmentUser;
    if (assignedToDepartmentUserName) updateData.assignedToDepartmentUserName = assignedToDepartmentUserName;
    if (hrNotes !== undefined) updateData.hrNotes = hrNotes;
    if (resolutionNotes !== undefined) updateData.resolutionNotes = resolutionNotes;
    if (autoRouted !== undefined) updateData.autoRouted = autoRouted;
    
    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      updateData,
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

// Get issues assigned to a specific department
app.get('/api/issues/department/:department', auth, async (req, res) => {
  try {
    const { department } = req.params;
    
    // Check if user belongs to the requested department or is HR
    if (req.user.department !== department && req.user.department !== 'HR') {
      return res.status(403).json({ error: 'Access denied to this department\'s issues' });
    }
    
    const issues = await Issue.find({ 
      routedToDepartment: department,
      status: { $in: ['routed', 'working', 'resolved'] }
    }).sort({ createdAt: -1 });
    
    res.json(issues);
  } catch (error) {
    console.error('Get department issues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auto-route issues based on categories (HR only)
app.post('/api/issues/auto-route', auth, async (req, res) => {
  try {
    if (req.user.department !== 'HR') {
      return res.status(403).json({ error: 'Only HR users can auto-route issues' });
    }

    // Get all pending issues
    const pendingIssues = await Issue.find({ status: 'pending' });
    
    const routingRules = {
      'hardware': 'IT',
      'software': 'IT', 
      'network': 'IT',
      'salary': 'Finance',
      'benefits': 'Finance',
      'policy': 'HR',
      'training': 'HR',
      'other': 'Tech' // Default fallback
    };

    let routedCount = 0;
    const routingResults = [];

    for (const issue of pendingIssues) {
      const targetDepartment = routingRules[issue.category] || 'Tech';
      
      // Find available users in target department
      const departmentUsers = await User.find({ department: targetDepartment }).select('name email');
      
      if (departmentUsers.length > 0) {
        // For now, assign to first available user (can be enhanced with load balancing)
        const assignedUser = departmentUsers[0];
        
        await Issue.findByIdAndUpdate(issue._id, {
          status: 'routed',
          routedToDepartment: targetDepartment,
          assignedToDepartmentUser: assignedUser._id,
          assignedToDepartmentUserName: assignedUser.name,
          autoRouted: true,
          hrNotes: `Auto-routed based on category: ${issue.category}`,
          updatedAt: new Date()
        });

        routedCount++;
        routingResults.push({
          issueId: issue._id,
          title: issue.title,
          category: issue.category,
          routedTo: targetDepartment,
          assignedTo: assignedUser.name
        });
      }
    }

    res.json({
      message: `Successfully auto-routed ${routedCount} issues`,
      routedCount,
      routingResults
    });
  } catch (error) {
    console.error('Auto-route issues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route issue to a specific department (HR only)
app.post('/api/issues/:id/route-to-department', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { department, assignedUserId } = req.body;

    console.log(`Routing issue ${id} to ${department} - User: ${req.user.name}, Department: ${req.user.department}`);

    // Only HR users can manually route issues
    if (req.user.department !== 'HR') {
      console.log('Access denied - not HR user');
      return res.status(403).json({ error: 'Only HR users can manually route issues' });
    }

    // Validate issue ID format
    if (!id || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid issue ID format' });
    }

    const issue = await Issue.findById(id);
    if (!issue) {
      console.log(`Issue ${id} not found`);
      return res.status(404).json({ error: 'Issue not found' });
    }

    console.log(`Found issue: ${issue.title}, Status: ${issue.status}`);

    // Find the assigned user in the target department
    let assignedUser = null;
    let assignedUserName = null;

    if (assignedUserId) {
      assignedUser = await User.findById(assignedUserId);
      if (!assignedUser || assignedUser.department !== department) {
        return res.status(400).json({ error: 'Invalid user for the target department' });
      }
      assignedUserName = assignedUser.name;
    } else {
      // Find first available user in the department
      const departmentUsers = await User.find({ department }).select('name email');
      if (departmentUsers.length > 0) {
        assignedUser = departmentUsers[0];
        assignedUserName = assignedUser.name;
      }
    }

    if (!assignedUser) {
      return res.status(400).json({ error: `No users found in ${department} department` });
    }

    // Update issue with routing information
    issue.status = 'routed';
    issue.routedToDepartment = department;
    issue.assignedToDepartmentUser = assignedUser._id;
    issue.assignedToDepartmentUserName = assignedUserName;
    issue.hrNotes = `${issue.hrNotes || ''}\n[${new Date().toISOString()}] Routed to ${department} by ${req.user.name}. Assigned to: ${assignedUserName}`;
    issue.updatedAt = new Date();

    await issue.save();
    console.log(`Issue ${id} successfully routed to ${department}`);

    res.json({
      message: `Issue successfully routed to ${department}`,
      issue: issue
    });
  } catch (error) {
    console.error('Route issue to department error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get routing suggestions for pending issues (HR only)
app.get('/api/issues/routing-suggestions', auth, async (req, res) => {
  try {
    console.log('GET /api/issues/routing-suggestions - User:', req.user.name, 'Department:', req.user.department);
    
    if (req.user.department !== 'HR') {
      console.log('Access denied - not HR user');
      return res.status(403).json({ error: 'Only HR users can access routing suggestions' });
    }

    const pendingIssues = await Issue.find({ status: 'pending' });
    console.log('Found', pendingIssues.length, 'pending issues for routing suggestions');
    
    const routingRules = {
      'hardware': 'IT',
      'software': 'IT',
      'network': 'IT', 
      'salary': 'Finance',
      'benefits': 'Finance',
      'policy': 'HR',
      'training': 'HR',
      'other': 'Tech'
    };

    const suggestions = [];

    for (const issue of pendingIssues) {
      const suggestedDepartment = routingRules[issue.category] || 'Tech';
      const departmentUsers = await User.find({ department: suggestedDepartment }).select('name email');
      
      suggestions.push({
        issueId: issue._id,
        title: issue.title,
        category: issue.category || 'other',
        priority: issue.priority || 'medium',
        reportedBy: issue.reportedBy,
        reportedByDepartment: issue.reportedByDepartment || 'Unknown',
        suggestedDepartment,
        availableUsers: departmentUsers,
        confidence: (issue.category && issue.category !== 'other') ? 'high' : 'medium'
      });
    }

    res.json(suggestions);
  } catch (error) {
    console.error('Get routing suggestions error:', error);
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
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found', path: req.originalUrl, method: req.method });
});

app.listen(PORT, () => {
  console.log(`🚀 Multi-Department API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
