import React, { useState, useEffect, useRef } from 'react';
import ApiService from '../services/api';

const AIAssistant = ({ user }) => {
  const [isOpen, setIsOpen] = useState(true); // Auto-open after login
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasWelcomed, setHasWelcomed] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pendingIssues, setPendingIssues] = useState([]);
  const [showAutoRoutePrompt, setShowAutoRoutePrompt] = useState(false);
  const messagesEndRef = useRef(null);
  const widgetRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !hasWelcomed) {
      welcomeUser();
      setHasWelcomed(true);
    }
  }, [isOpen, hasWelcomed]);

  // Check for pending issues for HR auto-routing
  useEffect(() => {
    if (user.department === 'HR' && isOpen) {
      checkPendingIssues();
      const interval = setInterval(checkPendingIssues, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [user.department, isOpen]);

  // Mouse event handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - 400, e.clientX - dragOffset.x)),
          y: Math.max(0, Math.min(window.innerHeight - 500, e.clientY - dragOffset.y))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const checkPendingIssues = async () => {
    try {
      console.log('AI Assistant: Checking pending issues...');
      const response = await ApiService.get('/issues');
      console.log('AI Assistant: Issues response:', response);
      const allIssues = response || [];
      const pending = allIssues.filter(issue => issue.status === 'pending');
      setPendingIssues(pending);
      console.log('AI Assistant: Found', pending.length, 'pending issues');
      
      // If there are new pending issues and we haven't shown the prompt recently
      if (pending.length > 0 && !showAutoRoutePrompt) {
        setTimeout(() => {
          const autoRouteMessage = `🚨 **New Issues Detected!**\n\nI found ${pending.length} pending issue(s) that need routing:\n\n${pending.map(issue => `• ${issue.title} (${issue.category}) - from ${issue.reportedByDepartment}`).join('\n')}\n\n💡 Would you like me to auto-route these issues to the appropriate departments?\n\nJust say "auto-route" or "route issues" and I'll handle it for you! 🤖`;
          
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: autoRouteMessage,
            sender: 'assistant',
            timestamp: new Date()
          }]);
          setShowAutoRoutePrompt(true);
        }, 2000);
      }
    } catch (error) {
      console.error('Error checking pending issues:', error);
    }
  };

  const handleAutoRoute = async () => {
    try {
      setIsTyping(true);
      const response = await ApiService.post('/issues/auto-route');
      
      setTimeout(() => {
        const successMessage = `✅ **Auto-Routing Complete!**\n\nSuccessfully routed ${response.routedCount} issues:\n\n${response.routingResults.map(result => `• ${result.title} → ${result.routedTo} (${result.assignedTo})`).join('\n')}\n\nAll issues have been automatically assigned based on their categories! 🎯`;
        
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: successMessage,
          sender: 'assistant',
          timestamp: new Date()
        }]);
        setIsTyping(false);
        setShowAutoRoutePrompt(false);
        setPendingIssues([]);
      }, 1500);
    } catch (error) {
      console.error('Error auto-routing issues:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: '❌ Sorry, I encountered an error while auto-routing the issues. Please try again or route them manually.',
        sender: 'assistant',
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }
  };

  const welcomeUser = async () => {
    setIsTyping(true);
    
    try {
      console.log('AI Assistant: Loading welcome data for', user.name);
      // Fetch user-specific data for personalized welcome
      const issuesResponse = await ApiService.get(`/issues/user/${user.name}`);
      const myIssues = issuesResponse || [];
      
      let departmentIssues = [];
      if (user.department === 'HR') {
        const hrIssuesResponse = await ApiService.get('/issues');
        departmentIssues = hrIssuesResponse || [];
      } else {
        try {
          const deptIssuesResponse = await ApiService.get(`/issues/department/${user.department}`);
          departmentIssues = deptIssuesResponse || [];
        } catch (deptError) {
          console.log('Department issues not available:', deptError.message);
          departmentIssues = [];
        }
      }

      setTimeout(() => {
        const welcomeMessage = generateWelcomeMessage(user, myIssues, departmentIssues);
        setMessages([{
          id: 1,
          text: welcomeMessage,
          sender: 'assistant',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 1500);
    } catch (error) {
      console.error('Error fetching data for welcome:', error);
      setTimeout(() => {
        setMessages([{
          id: 1,
          text: `Welcome to the Multi-Department Automation System, ${user.name}! 👋\n\nI'm your AI assistant, here to help you navigate the system and manage your issues efficiently.`,
          sender: 'assistant',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 1500);
    }
  };

  const generateWelcomeMessage = (user, myIssues, departmentIssues) => {
    const pendingIssues = departmentIssues.filter(issue => issue.status === 'pending').length;
    const routedIssues = departmentIssues.filter(issue => issue.status === 'routed').length;
    const workingIssues = departmentIssues.filter(issue => issue.status === 'working').length;

    let message = `Welcome back, ${user.name}! 🤖\n\nI'm your **Issue Assistant** - specialized in explaining issues and automating workflows!\n\n`;

    // Department-specific welcome focused on issues
    switch (user.department) {
      case 'HR':
        message += `🚨 **HR Issue Management:**\n`;
        message += `• ${pendingIssues} issues awaiting routing\n`;
        message += `• ${routedIssues} issues routed to departments\n`;
        message += `• ${workingIssues} issues being worked on\n\n`;
        message += `⚡ **Auto-Routing Ready!**\n`;
        message += `I can instantly route issues based on categories:\n`;
        message += `• Hardware/Software/Network → IT\n`;
        message += `• Salary/Benefits → Finance\n`;
        message += `• Policy/Training → HR\n`;
        message += `• Technical → Tech\n\n`;
        if (pendingIssues > 0) {
          message += `🎯 **Ready to auto-route ${pendingIssues} pending issues?**\nJust say "auto-route" and I'll handle it!`;
        } else {
          message += `✅ All issues are currently routed! I'll notify you when new issues arrive.`;
        }
        break;

      case 'Tech':
        message += `💻 **Tech Issue Specialist:**\n`;
        message += `• ${myIssues.filter(i => i.status === 'pending').length} of your issues pending\n`;
        message += `• ${myIssues.filter(i => i.status === 'working').length} issues being resolved\n`;
        message += `• ${departmentIssues.length} issues assigned to Tech team\n\n`;
        message += `🔧 **I can explain:**\n`;
        message += `• Issue categories and priorities\n`;
        message += `• Status meanings and workflows\n`;
        message += `• Best practices for reporting\n`;
        message += `• How routing works\n\n`;
        message += `Ask me about any issue-related topic! 🎯`;
        break;

      case 'IT':
        message += `🖥️ **IT Issue Expert:**\n`;
        message += `• ${myIssues.filter(i => i.status === 'pending').length} of your issues pending\n`;
        message += `• ${departmentIssues.length} issues assigned to IT team\n`;
        message += `• Hardware, Software, Network categories\n\n`;
        message += `💡 **I specialize in:**\n`;
        message += `• Explaining IT issue categories\n`;
        message += `• Priority level guidelines\n`;
        message += `• Status tracking and updates\n`;
        message += `• Department workflows\n\n`;
        message += `What IT issue topic can I explain? 💻`;
        break;

      case 'Finance':
        message += `💰 **Finance Issue Guide:**\n`;
        message += `• ${myIssues.filter(i => i.status === 'pending').length} of your issues pending\n`;
        message += `• ${departmentIssues.length} issues assigned to Finance\n`;
        message += `• Salary, Benefits categories handled\n\n`;
        message += `📊 **I can help with:**\n`;
        message += `• Understanding issue categories\n`;
        message += `• Priority and status explanations\n`;
        message += `• Workflow processes\n`;
        message += `• Routing logic\n\n`;
        message += `Ask me about any finance-related issues! 💼`;
        break;

      default:
        message += `I'm here to explain issues and help with routing! 🎯`;
    }

    return message;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');

    // Check for auto-routing commands for HR users
    if (user.department === 'HR' && 
        (currentInput.toLowerCase().includes('auto-route') || 
         currentInput.toLowerCase().includes('route issues') ||
         currentInput.toLowerCase().includes('yes') && showAutoRoutePrompt)) {
      handleAutoRoute();
      return;
    }

    setIsTyping(true);

    // Generate AI response
    setTimeout(() => {
      const response = generateAIResponse(currentInput, user);
      const assistantMessage = {
        id: messages.length + 2,
        text: response,
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const generateAIResponse = (message, user) => {
    const lowerMessage = message.toLowerCase();

    // Team management queries
    if (lowerMessage.includes('team') || lowerMessage.includes('manage')) {
      if (user.department === 'HR') {
        return `👥 **Team Management Guide:**\n\nAs HR, you can manage teams across departments:\n\n🔧 **Tech Team** - Handle technical development issues\n💻 **IT Team** - Manage hardware, software, network problems\n💰 **Finance Team** - Process salary, benefits, financial matters\n\n**How to manage teams:**\n1. Go to "Team Management" tab\n2. Select department (Tech/IT/Finance)\n3. Add/remove team members\n4. Assign issues to specific teams\n\nWant me to explain team workflows? 🎯`;
      } else {
        return `👥 **Your Team Info:**\n\nYou're part of the ${user.department} department! Here's how teams work:\n\n• **HR manages** all department teams\n• **Issues are routed** to appropriate teams automatically\n• **You can see** your team's assigned issues\n• **Collaborate** with team members on solutions\n\nNeed help with team-related processes? 🤝`;
      }
    }

    // Issue explanation focused responses
    if (lowerMessage.includes('explain') || lowerMessage.includes('what is')) {
      return `📋 **Issue Explanation:**\n\nI specialize in explaining issues and their routing! Here's what I can help with:\n\n• **Issue Categories** - Hardware, Software, Network, Salary, Benefits, Policy, Training\n• **Priority Levels** - Urgent, High, Medium, Low\n• **Status Flow** - Pending → Routed → Working → Resolved → Closed\n• **Department Routing** - Automatic assignment based on issue type\n\nWhat specific aspect would you like me to explain? 🤓`;
    }

    // Auto-routing for HR
    if (user.department === 'HR' && (lowerMessage.includes('route') || lowerMessage.includes('assign'))) {
      return `🤖 **HR Auto-Routing Assistant:**\n\nI can automatically route issues for you! Here's how it works:\n\n• **Hardware/Software/Network** → IT Department\n• **Salary/Benefits** → Finance Department\n• **Policy/Training** → HR Department\n• **Technical/Other** → Tech Department\n\nJust say "auto-route" or "route issues" and I'll handle pending issues automatically! ⚡`;
    }

    // Issue categories explanation with routing info
    if (lowerMessage.includes('category') || lowerMessage.includes('categories')) {
      return `📂 **Issue Categories & Routing:**\n\n🔧 **Hardware** → IT Dept - Computers, printers, devices\n💻 **Software** → IT Dept - Applications, programs, licenses\n🌐 **Network** → IT Dept - Internet, WiFi, connectivity\n💰 **Salary** → Finance Dept - Payroll, compensation\n🏥 **Benefits** → Finance Dept - Insurance, leave, perks\n📋 **Policy** → HR Dept - Company rules, procedures\n🎓 **Training** → HR Dept - Learning, development\n❓ **Other** → Tech Dept - Miscellaneous technical issues\n\n**Smart Routing:** Choose the right category and I'll route it to the correct team! 🎯`;
    }

    // Salary routing specific help
    if (lowerMessage.includes('salary') || lowerMessage.includes('payroll')) {
      return `💰 **Salary & Payroll Issues:**\n\n**Category:** Salary\n**Routes to:** Finance Department\n**Handles:** Payroll problems, wage disputes, compensation issues\n\n**Common salary issues:**\n• Missing payments\n• Incorrect amounts\n• Tax deductions\n• Bonus calculations\n• Overtime pay\n\n**Always use 'Salary' category** for payroll-related problems to ensure proper routing to Finance! 💼`;
    }

    // Status explanation
    if (lowerMessage.includes('status') || lowerMessage.includes('progress')) {
      return `📊 **Issue Status Lifecycle:**\n\n🟡 **Pending** - New issue waiting for HR review and routing\n🔵 **Routed** - Assigned to appropriate department for handling\n🟣 **Working** - Department actively resolving the issue\n🟢 **Resolved** - Solution implemented, awaiting confirmation\n⚫ **Closed** - Issue fully completed and archived\n\nEach status shows exactly where your issue stands! 📈`;
    }

    // Priority explanation
    if (lowerMessage.includes('priority') || lowerMessage.includes('urgent')) {
      return `⚡ **Priority Levels Explained:**\n\n🔴 **Urgent** - Critical system failures, security breaches, complete work stoppage\n🟠 **High** - Major functionality affected, significant business impact\n🟡 **Medium** - Standard business issues, moderate impact\n🟢 **Low** - Minor problems, enhancements, non-critical requests\n\nChoose priority wisely - it determines response time! ⏰`;
    }

    // Department-specific issue guidance
    if (lowerMessage.includes('department') || lowerMessage.includes('who handles')) {
      return `🏢 **Department Responsibilities:**\n\n🔧 **IT Department** - Hardware, software, network infrastructure\n💰 **Finance Department** - Salary, benefits, financial policies\n👥 **HR Department** - Policies, training, employee relations\n💻 **Tech Department** - Technical development, system maintenance\n\nIssues are automatically routed to the right team based on category! 🎯`;
    }

    // Department-specific helpful responses
    if (user.department === 'HR') {
      const hrResponses = [
        `🎯 **HR Command Center:**\n\nI'm here to help you manage the entire system!\n\n• **Auto-route issues** - Say "auto-route" for instant routing\n• **Team management** - Ask about managing department teams\n• **Issue oversight** - Get insights on all department issues\n• **Workflow optimization** - Learn about process improvements\n\nWhat HR task can I assist with? 💼`,
        
        `👥 **Team & Issue Management:**\n\nAs HR, you have full system control:\n\n• **Route issues** to appropriate departments\n• **Manage teams** across Tech, IT, and Finance\n• **Monitor progress** of all issues\n• **Optimize workflows** for better efficiency\n\nNeed help with any management task? 🚀`
      ];
      return hrResponses[Math.floor(Math.random() * hrResponses.length)];
    }

    // Default responses for other departments
    const responses = [
      `🤖 **I'm your ${user.department} Assistant!**\n\nI specialize in:\n• Explaining issue categories and priorities\n• Describing department workflows\n• Helping with issue management\n• Clarifying status meanings\n\nWhat can I help you with today? 📚`,
      
      `📋 **${user.department} Department Help:**\n\nI can explain:\n• How issues flow through your department\n• Which categories you handle\n• Priority levels and response times\n• Status updates and workflows\n\nWhat would you like to understand better? 🎓`,
      
      `🎯 **Smart Issue Management:**\n\nI help with:\n• Understanding your department's role\n• Explaining issue categories\n• Status tracking and updates\n• Best practices for resolution\n\nAsk me anything about your work! 💡`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const quickActions = user.department === 'HR' ? [
    { text: "Auto-route issues", action: () => setInputMessage("auto-route") },
    { text: "Team management", action: () => setInputMessage("how to manage teams") },
    { text: "Salary routing", action: () => setInputMessage("salary issues routing") },
    { text: "Issue categories", action: () => setInputMessage("explain categories") }
  ] : user.department === 'Finance' ? [
    { text: "Salary issues", action: () => setInputMessage("salary and payroll help") },
    { text: "Benefits help", action: () => setInputMessage("benefits category") },
    { text: "Issue status", action: () => setInputMessage("what do statuses mean?") },
    { text: "Priority levels", action: () => setInputMessage("explain priority levels") }
  ] : user.department === 'IT' ? [
    { text: "Hardware issues", action: () => setInputMessage("hardware category help") },
    { text: "Software problems", action: () => setInputMessage("software issues") },
    { text: "Network issues", action: () => setInputMessage("network problems") },
    { text: "Issue workflow", action: () => setInputMessage("IT workflow process") }
  ] : [
    { text: "Tech issues", action: () => setInputMessage("technical problems") },
    { text: "Issue categories", action: () => setInputMessage("explain categories") },
    { text: "Priority levels", action: () => setInputMessage("explain priority levels") },
    { text: "Status tracking", action: () => setInputMessage("what do statuses mean?") }
  ];

  return (
    <>
      {/* Draggable Floating AI Assistant Widget */}
      {isOpen && (
        <div 
          ref={widgetRef}
          className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: '400px',
            height: '500px',
            cursor: isDragging ? 'grabbing' : 'default'
          }}
        >
          {/* Draggable Header */}
          <div 
            className="bg-indigo-600 text-white p-4 rounded-t-lg flex items-center justify-between cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold">🤖</span>
              </div>
              <div>
                <h3 className="font-semibold">Issue Assistant</h3>
                <p className="text-xs opacity-90">
                  {user.department === 'HR' ? 'Auto-routing ready' : 'Issue expert'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 mb-2">
                {user.department === 'HR' ? '🚀 HR Quick Actions:' : '💡 Quick Help:'}
              </p>
              <div className="grid grid-cols-2 gap-1">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="text-xs bg-white hover:bg-indigo-50 text-gray-700 px-2 py-1 rounded border transition-colors"
                  >
                    {action.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={user.department === 'HR' ? "Ask about routing or say 'auto-route'..." : "Ask about issues..."}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-3 py-2 rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimized Toggle Button */}
      {!isOpen && (
        <div 
          className="fixed z-50"
          style={{ left: `${position.x + 350}px`, top: `${position.y}px` }}
        >
          <button
            onClick={() => setIsOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3 shadow-lg transition-all duration-300 transform hover:scale-110 animate-pulse"
          >
            <div className="flex items-center">
              <span className="text-lg">🤖</span>
              <div className="ml-2 text-xs font-medium">
                {pendingIssues.length > 0 && user.department === 'HR' ? (
                  <span className="bg-red-500 text-white px-2 py-1 rounded-full">
                    {pendingIssues.length}
                  </span>
                ) : (
                  'AI'
                )}
              </div>
            </div>
          </button>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
