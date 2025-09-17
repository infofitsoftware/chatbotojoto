// Chat Application JavaScript

class ChatApp {
    constructor() {
        this.isLoading = false;
        this.messageCount = 0;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkHealth();
        this.updateCharCount();
    }

    setupEventListeners() {
        // Send message on Enter key
        const messageInput = document.getElementById('message-input');
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Update character count
        messageInput.addEventListener('input', () => {
            this.updateCharCount();
        });

        // Auto-resize textarea (if we switch to textarea later)
        messageInput.addEventListener('input', () => {
            this.autoResize(messageInput);
        });
    }

    updateCharCount() {
        const input = document.getElementById('message-input');
        const charCount = document.getElementById('char-count');
        const count = input.value.length;
        charCount.textContent = count;
        
        // Change color based on character count
        if (count > 900) {
            charCount.style.color = '#dc3545';
        } else if (count > 700) {
            charCount.style.color = '#ffc107';
        } else {
            charCount.style.color = '#6c757d';
        }
    }

    autoResize(element) {
        element.style.height = 'auto';
        element.style.height = element.scrollHeight + 'px';
    }

    async checkHealth() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            
            this.updateStatus('connection-status', 'online', 'Connected');
            this.updateStatus('db-status', data.database_connected ? 'online' : 'offline', 
                            data.database_connected ? 'Connected' : 'Disconnected');
            this.updateStatus('ai-status', data.ai_available ? 'online' : 'offline', 
                            data.ai_available ? 'Available' : 'Unavailable');
            
            if (data.database_connected) {
                this.updateMessageCount();
            }
        } catch (error) {
            console.error('Health check failed:', error);
            this.updateStatus('connection-status', 'offline', 'Disconnected');
            this.updateStatus('db-status', 'offline', 'Unknown');
            this.updateStatus('ai-status', 'offline', 'Unknown');
        }
    }

    updateStatus(elementId, status, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            element.className = `badge bg-${status === 'online' ? 'success' : 'danger'}`;
        }
    }

    async updateMessageCount() {
        try {
            const response = await fetch('/api/history?limit=1');
            const data = await response.json();
            this.messageCount = data.messages ? data.messages.length : 0;
            document.getElementById('message-count').textContent = this.messageCount;
        } catch (error) {
            console.error('Failed to update message count:', error);
        }
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message || this.isLoading) {
            return;
        }

        // Clear input and disable send button
        input.value = '';
        this.updateCharCount();
        this.setLoading(true);

        // Add user message to chat
        this.addMessage(message, 'user');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();

            if (response.ok) {
                // Add AI response to chat
                this.addMessage(data.ai_response, 'ai');
                this.messageCount++;
                document.getElementById('message-count').textContent = this.messageCount;
            } else {
                // Handle error
                this.addMessage(`Error: ${data.error || 'Something went wrong'}`, 'ai', true);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('Sorry, I encountered an error. Please try again.', 'ai', true);
        } finally {
            this.setLoading(false);
        }
    }

    addMessage(content, sender, isError = false) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const timestamp = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const icon = sender === 'ai' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
        const messageClass = isError ? 'text-danger' : '';
        
        messageDiv.innerHTML = `
            <div class="message-content ${messageClass}">
                ${sender === 'ai' ? icon : ''}
                <p>${this.escapeHtml(content)}</p>
            </div>
            <div class="message-time">${timestamp}</div>
        `;

        chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    setLoading(loading) {
        this.isLoading = loading;
        const sendButton = document.getElementById('send-button');
        const messageInput = document.getElementById('message-input');
        const loadingSpinner = document.getElementById('loading-spinner');

        if (loading) {
            sendButton.disabled = true;
            messageInput.disabled = true;
            loadingSpinner.style.display = 'block';
            this.addTypingIndicator();
        } else {
            sendButton.disabled = false;
            messageInput.disabled = false;
            loadingSpinner.style.display = 'none';
            this.removeTypingIndicator();
        }
    }

    addTypingIndicator() {
        const chatMessages = document.getElementById('chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
            <i class="fas fa-robot"></i>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async loadChatHistory() {
        try {
            const response = await fetch('/api/history?limit=20');
            const data = await response.json();
            
            if (data.messages && data.messages.length > 0) {
                // Clear current messages (except welcome message)
                const chatMessages = document.getElementById('chat-messages');
                const welcomeMessage = chatMessages.querySelector('.welcome-message');
                chatMessages.innerHTML = '';
                if (welcomeMessage) {
                    chatMessages.appendChild(welcomeMessage);
                }
                
                // Add historical messages
                data.messages.reverse().forEach(msg => {
                    this.addMessage(msg.user_message, 'user');
                    this.addMessage(msg.ai_response, 'ai');
                });
                
                this.messageCount = data.messages.length;
                document.getElementById('message-count').textContent = this.messageCount;
                
                // Show success message
                this.showNotification('Chat history loaded successfully!', 'success');
            } else {
                this.showNotification('No chat history found.', 'info');
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            this.showNotification('Failed to load chat history.', 'error');
        }
    }

    clearChat() {
        if (confirm('Are you sure you want to clear the chat? This will remove all messages from the current session.')) {
            const chatMessages = document.getElementById('chat-messages');
            const welcomeMessage = chatMessages.querySelector('.welcome-message');
            chatMessages.innerHTML = '';
            if (welcomeMessage) {
                chatMessages.appendChild(welcomeMessage);
            }
            this.messageCount = 0;
            document.getElementById('message-count').textContent = this.messageCount;
            this.showNotification('Chat cleared successfully!', 'success');
        }
    }

    showNotification(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}

// Global functions for HTML onclick handlers
function sendMessage() {
    if (window.chatApp) {
        window.chatApp.sendMessage();
    }
}

function loadChatHistory() {
    if (window.chatApp) {
        window.chatApp.loadChatHistory();
    }
}

function clearChat() {
    if (window.chatApp) {
        window.chatApp.clearChat();
    }
}

// Initialize the chat application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
    
    // Focus on message input
    document.getElementById('message-input').focus();
    
    // Check health every 30 seconds
    setInterval(() => {
        window.chatApp.checkHealth();
    }, 30000);
});

// Handle page visibility change to refresh status when user returns
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.chatApp) {
        window.chatApp.checkHealth();
    }
});
