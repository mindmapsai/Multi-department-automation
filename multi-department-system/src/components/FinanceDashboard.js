import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const FinanceDashboard = ({ user, onLogout }) => {
  const [expenses, setExpenses] = useState([]);
  const [showNewExpenseForm, setShowNewExpenseForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newExpense, setNewExpense] = useState({ 
    description: '', 
    amount: '', 
    category: 'office-supplies',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const expensesData = await ApiService.getAllExpenses();
      setExpenses(expensesData);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    
    try {
      const createdExpense = await ApiService.createExpense(
        newExpense.description,
        parseFloat(newExpense.amount),
        newExpense.category,
        newExpense.date,
        user.name
      );
      
      // Add the new expense to local state
      setExpenses(prevExpenses => [createdExpense, ...prevExpenses]);
      
      setNewExpense({ 
        description: '', 
        amount: '', 
        category: 'office-supplies',
        date: new Date().toISOString().split('T')[0]
      });
      setShowNewExpenseForm(false);
    } catch (error) {
      console.error('Failed to create expense:', error);
      alert('Failed to create expense. Please try again.');
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'office-supplies': return 'bg-blue-100 text-blue-800';
      case 'travel': return 'bg-green-100 text-green-800';
      case 'equipment': return 'bg-purple-100 text-purple-800';
      case 'software': return 'bg-yellow-100 text-yellow-800';
      case 'marketing': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  };

  const getMonthlyExpenses = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    }).reduce((total, expense) => total + expense.amount, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
              <p className="text-gray-600">Welcome, {user.name}</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Action Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowNewExpenseForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
            >
              Add New Expense
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">$</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ${getTotalExpenses().toFixed(2)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">M</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">This Month</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ${getMonthlyExpenses().toFixed(2)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">#</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Records</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {expenses.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* New Expense Form Modal */}
          {showNewExpenseForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Expense</h3>
                <form onSubmit={handleCreateExpense}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    >
                      <option value="office-supplies">Office Supplies</option>
                      <option value="travel">Travel</option>
                      <option value="equipment">Equipment</option>
                      <option value="software">Software</option>
                      <option value="marketing">Marketing</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowNewExpenseForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      Add Expense
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Expenses List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Expense Records</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Track and manage department expenses and financial records.
              </p>
            </div>
            <ul className="divide-y divide-gray-200">
              {expenses.length === 0 ? (
                <li className="px-4 py-4 text-center text-gray-500">
                  No expenses recorded yet. Click "Add New Expense" to get started.
                </li>
              ) : (
                expenses.map((expense) => (
                  <li key={expense._id} className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {expense.description}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                            <span className="text-lg font-semibold text-green-600">
                              ${expense.amount.toFixed(2)}
                            </span>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryColor(expense.category)}`}>
                              {expense.category.replace('-', ' ')}
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          Date: {new Date(expense.date).toLocaleDateString()} | 
                          Added by: {expense.createdBy} | 
                          Created: {new Date(expense.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FinanceDashboard;
