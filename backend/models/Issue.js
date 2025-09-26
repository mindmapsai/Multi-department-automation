const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  reportedBy: {
    type: String,
    required: true
  },
  reportedByDepartment: {
    type: String,
    required: true,
    enum: ['HR', 'Tech', 'Finance', 'IT']
  },
  reportedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['hardware', 'software', 'network', 'salary', 'benefits', 'policy', 'training', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedToHR: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedToHRName: {
    type: String,
    default: null
  },
  routedToDepartment: {
    type: String,
    enum: ['HR', 'Tech', 'Finance', 'IT', null],
    default: null
  },
  assignedToDepartmentUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedToDepartmentUserName: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'routed', 'working', 'resolved', 'closed'],
    default: 'pending'
  },
  hrNotes: {
    type: String,
    default: ''
  },
  resolutionNotes: {
    type: String,
    default: ''
  },
  autoRouted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
issueSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Issue', issueSchema);
