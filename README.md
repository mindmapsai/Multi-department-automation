# Multi-Department Automation System

A comprehensive web application for managing multiple departments (HR, Tech, and Finance) with role-based dashboards and inter-department communication.

## Features

### 🔐 Authentication System
- **Signup/Login**: Users enter their name and select their department
- **Department-based Routing**: Automatic redirection to appropriate dashboard
- **Persistent Sessions**: User data stored in localStorage

### 👥 HR Department
- **Issue Management Dashboard**: View and manage issues reported by Tech team
- **Status Updates**: Mark issues as "Working On It" or "Issue Resolved"
- **Real-time Statistics**: Track pending, in-progress, and resolved issues
- **Issue Details**: View reporter information and timestamps

### 💻 Tech Department
- **Ticket System**: Create and manage technical support tickets
- **Issue Reporting**: Report issues directly to HR department
- **Priority Management**: Set ticket priorities (High, Medium, Low)
- **Dashboard Analytics**: View ticket statistics and status tracking
- **Modal Forms**: User-friendly forms for creating tickets and reporting issues

### 💰 Finance Department
- **Expense Tracking**: Add and manage department expenses
- **Category Management**: Organize expenses by categories (Office Supplies, Travel, Equipment, Software, Marketing)
- **Financial Analytics**: View total expenses, monthly summaries, and record counts
- **Date-based Records**: Track expenses with specific dates
- **Expense History**: Complete list of all recorded expenses

## Technology Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **React Router DOM**: Client-side routing and navigation
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Local Storage**: Client-side data persistence

### Backend (Optional)
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **CORS**: Cross-origin resource sharing
- **In-memory Storage**: Simple data storage (can be replaced with database)

## Project Structure

```
multi-department-system/
├── src/
│   ├── components/
│   │   ├── Login.js              # Authentication component
│   │   ├── HRDashboard.js        # HR department dashboard
│   │   ├── TechDashboard.js      # Tech department dashboard
│   │   └── FinanceDashboard.js   # Finance department dashboard
│   ├── App.js                    # Main application component
│   ├── index.css                 # Tailwind CSS imports
│   └── index.js                  # Application entry point
├── backend/
│   ├── server.js                 # Express API server
│   └── package.json              # Backend dependencies
├── tailwind.config.js            # Tailwind configuration
├── postcss.config.js             # PostCSS configuration
└── package.json                  # Frontend dependencies
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd multi-department-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Backend Setup (Optional)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the API server:
   ```bash
   npm start
   ```

4. API will be available at [http://localhost:5000](http://localhost:5000)

## Usage Guide

### Getting Started
1. **Access the Application**: Open the web application in your browser
2. **Sign Up**: Enter your full name and select your department (HR, Tech, or Finance)
3. **Dashboard Access**: You'll be automatically redirected to your department's dashboard

### HR Department Usage
- **View Issues**: See all issues reported by the Tech team
- **Update Status**: Click "Mark as Working" or "Mark as Resolved" to update issue status
- **Monitor Progress**: Use the statistics cards to track department performance

### Tech Department Usage
- **Create Tickets**: Click "Create New Ticket" to add technical support requests
- **Report HR Issues**: Click "Report Issue to HR" for non-technical concerns
- **Track Progress**: Monitor your tickets and their current status
- **Set Priorities**: Assign appropriate priority levels to tickets

### Finance Department Usage
- **Add Expenses**: Click "Add New Expense" to record financial transactions
- **Categorize Spending**: Organize expenses by type for better tracking
- **View Analytics**: Monitor total spending, monthly expenses, and record counts
- **Track History**: Review all recorded expenses with dates and details

## API Endpoints (Backend)

### Authentication
- `POST /api/auth/login` - User login/signup

### Tickets (Tech Department)
- `GET /api/tickets` - Get all tickets
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket status

### HR Issues
- `GET /api/hr-issues` - Get all HR issues
- `POST /api/hr-issues` - Create new issue
- `PUT /api/hr-issues/:id` - Update issue status

### Expenses (Finance Department)
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Create new expense

### Analytics
- `GET /api/analytics/summary` - Get system-wide statistics

## Data Storage

Currently, the application uses **localStorage** for client-side data persistence. This means:
- Data persists across browser sessions
- Data is stored locally on each user's device
- No server-side database required for basic functionality

For production use, consider implementing:
- Server-side database (PostgreSQL, MongoDB, etc.)
- User authentication and authorization
- Data synchronization across devices
- Backup and recovery systems

## Customization

### Adding New Departments
1. Create a new dashboard component in `src/components/`
2. Add the department option in `Login.js`
3. Update routing logic in `App.js`
4. Add corresponding API endpoints in `backend/server.js`

### Styling Modifications
- Edit `tailwind.config.js` for custom Tailwind configuration
- Modify component styles using Tailwind utility classes
- Add custom CSS in `src/index.css` if needed

### Feature Extensions
- Add user roles and permissions
- Implement real-time notifications
- Add file upload capabilities
- Create reporting and analytics features
- Integrate with external APIs

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please create an issue in the project repository or contact the development team.
