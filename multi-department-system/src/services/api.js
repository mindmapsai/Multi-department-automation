const API_BASE_URL = 'http://localhost:3002/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  // Helper method to get headers with auth token
  getHeaders() {
    // Always get the latest token from localStorage
    const currentToken = localStorage.getItem('authToken');
    if (currentToken) {
      this.token = currentToken;
    }
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Set token after login/signup
  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  // Clear token on logout
  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  // Generic HTTP methods
  async get(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error(`API GET ${endpoint} failed:`, error);
      throw new Error(error.error || `GET ${endpoint} failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  }

  async post(endpoint, data = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `POST ${endpoint} failed`);
    }
    
    return response.json();
  }

  async put(endpoint, data = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `PUT ${endpoint} failed`);
    }
    
    return response.json();
  }

  async delete(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `DELETE ${endpoint} failed`);
    }
    
    return response.json();
  }

  // Authentication
  async signup(name, email, password, department) {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password, department }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }
    
    const data = await response.json();
    this.setToken(data.token);
    return data;
  }

  async signin(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signin failed');
    }
    
    const data = await response.json();
    this.setToken(data.token);
    return data;
  }

  // Issues
  async getAllIssues() {
    const response = await fetch(`${API_BASE_URL}/issues`, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch issues');
    }
    
    return response.json();
  }

  async getUserIssues(username) {
    const response = await fetch(`${API_BASE_URL}/issues/user/${encodeURIComponent(username)}`, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user issues');
    }
    
    return response.json();
  }

  async createIssue(title, description) {
    const response = await fetch(`${API_BASE_URL}/issues`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ title, description }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create issue');
    }
    
    return response.json();
  }

  async updateIssueStatus(issueId, status) {
    const response = await fetch(`${API_BASE_URL}/issues/${issueId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update issue status');
    }
    
    return response.json();
  }

  // Expenses
  async getAllExpenses() {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch expenses');
    }
    
    return response.json();
  }

  async createExpense(description, amount, category, date, createdBy) {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ description, amount, category, date, createdBy }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create expense');
    }
    
    return response.json();
  }

  // Analytics
  async getAnalyticsSummary() {
    const response = await fetch(`${API_BASE_URL}/analytics/summary`, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch analytics');
    }
    
    return response.json();
  }

  // Team Management
  async getMyTeam() {
    const response = await fetch(`${API_BASE_URL}/teams/my-team`, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch team');
    }
    
    return response.json();
  }

  async getTechUsers() {
    const response = await fetch(`${API_BASE_URL}/users/tech-users`, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch tech users');
    }
    
    return response.json();
  }

  async addTeamMember(techUserId) {
    const response = await fetch(`${API_BASE_URL}/teams/add-member`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ techUserId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add team member');
    }
    
    return response.json();
  }

  async removeTeamMember(techUserId) {
    const response = await fetch(`${API_BASE_URL}/teams/remove-member/${techUserId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove team member');
    }
    
    return response.json();
  }

  async getMyHR() {
    const response = await fetch(`${API_BASE_URL}/teams/my-hr`, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch assigned HR');
    }
    
    return response.json();
  }

  async getUnassignedTechUsers() {
    const response = await fetch(`${API_BASE_URL}/teams/unassigned-tech`, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch unassigned tech users');
    }
    
    return response.json();
  }
}

export default new ApiService();
