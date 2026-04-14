// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const dns = require("dns");
const connectDB = require("./config/db");
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Suppress Mongoose deprecation warnings
const originalConsoleWarn = console.warn;
console.warn = function(...args) {
  if (args[0] && args[0].includes('Mongoose') && args[0].includes('deprecated')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DNS Config
dns.setServers(["1.1.1.1", "8.8.8.8"]);

// Middleware
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// ============ AI CHAT ENDPOINTS - USING ACTIVE GEMINI MODELS ============
console.log('📡 Registering AI Chat endpoints with Gemini...');

// Health check endpoint
app.get('/api/chat/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    provider: 'gemini',
    apiKeyConfigured: !!process.env.GEMINI_API_KEY,
    model: 'gemini-2.0-flash',  // Active free model
    timestamp: new Date().toISOString()
  });
});

// Chat endpoint using active Gemini 2.0 Flash (Free Tier)
app.post('/api/chat', async (req, res) => {
  console.log('📨 Chat request received:', req.body.message);
  const { message, history } = req.body;
  
  // Check for Gemini API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found');
    return res.json({ 
      success: true, 
      reply: getFallbackResponse(message)
    });
  }
  
  try {
    console.log('🔄 Sending request to Google Gemini 2.0 Flash...');
    
    // Build conversation context
    let conversationHistory = '';
    if (history && history.length > 0) {
      const lastMessages = history.slice(-6);
      for (const msg of lastMessages) {
        conversationHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      }
    }
    
    // Create a single prompt with all context
    const prompt = `You are TDC Assistant, a helpful and friendly customer support chatbot for TDC (The Deft Crew).
    
IMPORTANT INFORMATION ABOUT TDC:
- TDC (The Deft Crew) helps students get discounts from partner brands
- Users earn points by shopping at partner brands (10 points per $1 spent)
- Referral program: Refer 10 friends to unlock TDC Premium Card
- TDC Premium gives double discounts (up to 40% off) and priority brand access
- Available brands: Nike, Adidas, Zara, Apple, Samsung, Puma, Reebok, and 50+ more
- Points can be redeemed for exclusive discounts and merchandise

Your personality: Friendly, professional, and enthusiastic about helping students save money.
Keep responses concise, under 100 words, and use emojis occasionally.

${conversationHistory ? `Previous conversation:\n${conversationHistory}\n` : ''}
User: ${message}

Assistant: `;

    // Using gemini-2.0-flash - Currently active and FREE
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.9,
          topK: 40
        }
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    if (response.data.candidates && response.data.candidates[0]) {
      let reply = response.data.candidates[0].content.parts[0].text;
      // Clean up any prefixes
      reply = reply.replace(/^Assistant:\s*/i, '');
      reply = reply.replace(/^TDC Assistant:\s*/i, '');
      reply = reply.replace(/^AI:\s*/i, '');
      
      console.log('✅ Gemini response received, length:', reply.length);
      
      res.json({ 
        success: true, 
        reply: reply 
      });
    } else {
      throw new Error('No response from Gemini');
    }
  } catch (error) {
    console.error('❌ Gemini Error:', error.response?.data?.error || error.message);
    
    // Send fallback response
    res.json({ 
      success: true, 
      reply: getFallbackResponse(message)
    });
  }
});

// Comprehensive fallback responses (works without API)
function getFallbackResponse(message) {
  const lower = message.toLowerCase();
  
  // Question pattern matching
  if (lower.includes('earn') || lower.includes('points') || (lower.includes('how') && lower.includes('point'))) {
    return "💎 **Earning Points Made Easy!**\n\n• Spend $1 = 10 points\n• First purchase: +500 bonus points\n• Refer a friend: +500 points\n• Daily check-in: +50 points\n\nStart shopping to collect points today! 🛍️";
  }
  
  if (lower.includes('referral') || (lower.includes('refer') && lower.includes('friend'))) {
    return "🎁 **Referral Program Benefits**\n\n• Refer 10 friends = Unlock TDC Premium Card 👑\n• Each referral = 500 bonus points\n• Your friend gets 20% off first purchase\n\nShare your unique code: **TDC-STUDENT2024**\n\nStart referring now! 🚀";
  }
  
  if (lower.includes('premium') || (lower.includes('unlock') && lower.includes('card'))) {
    return "👑 **TDC Premium Benefits**\n\n• 2x points on all purchases\n• Up to 40% extra discount\n• Priority customer support\n• Early access to sales\n• Exclusive brand partnerships\n\n**Unlock by referring 10 friends!** 🎉";
  }
  
  if (lower.includes('brand') || lower.includes('discount') || lower.includes('offer')) {
    return "🛍️ **Featured Partner Brands**\n\n• Nike - 25% off\n• Adidas - 20% off\n• Zara - 15% off\n• Apple - 10% off\n• Samsung - 20% off\n• Puma - 30% off\n\n**50+ brands available!** Check the Brands section 🔥";
  }
  
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "👋 **Hello! Welcome to TDC Assistant!**\n\nI'm here to help you with:\n• 💎 Earning points\n• 🎁 Referral program\n• 👑 Premium benefits\n• 🛍️ Brand discounts\n• 📞 Customer support\n\nWhat would you like to know today? 😊";
  }
  
  if (lower.includes('help') || lower.includes('what can you do')) {
    return "🤔 **How can I help you today?**\n\nTry asking me about:\n• \"How to earn points?\" 💎\n• \"Referral program details\" 🎁\n• \"TDC Premium benefits\" 👑\n• \"Available brands\" 🛍️\n• \"Contact support\" 📞\n\nJust type your question! 💬";
  }
  
  if (lower.includes('contact') || lower.includes('support') || lower.includes('email')) {
    return "📞 **Contact Customer Support**\n\n• 📧 Email: hello@thedeftcrew.com\n• 📱 Phone: +1 (555) 123-4567\n• 💬 Live Chat: 9AM - 6PM (Mon-Fri)\n• 🌐 Website: www.thedeftcrew.com\n\nTap the button below to visit Contact screen! ✨";
  }
  
  if (lower.includes('name') || lower.includes('who are you')) {
    return "🤖 **I'm TDC Assistant!**\n\nI'm your AI-powered shopping companion created by The Deft Crew. I'm here to help students like you save money with exclusive discounts and rewards! 🎓✨\n\nHow can I assist you today?";
  }
  
  if (lower.includes('tdc') || lower.includes('what is') || lower.includes('about')) {
    return "🏢 **About TDC (The Deft Crew)**\n\nTDC is a student platform that helps you save money through:\n• Exclusive brand discounts (up to 30% off)\n• Reward points on purchases\n• Referral program with premium benefits\n• Student community events\n\nWe're here to make student life more affordable! 🎓✨";
  }
  
  // Default response
  return "🤔 **I'm here to help!** Here's what I can assist you with:\n\n💎 **Earning points** - How to collect and redeem\n🎁 **Referral program** - Invite friends, earn rewards\n👑 **TDC Premium** - Exclusive benefits\n🛍️ **Brand discounts** - 50+ partner deals\n📞 **Contact support** - Get human assistance\n\nWhat would you like to know? 😊";
}

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// ============ OTHER ROUTES ============
const registerRoutes = () => {
  const routes = [
    { path: "/api/auth", file: "./routes/auth.routes" },
    { path: "/api/universities", file: "./routes/university.routes" },
    { path: "/api/offers", file: "./routes/offer.routes" },
    { path: "/api/brands", file: "./routes/brands.routes" },
    { path: "/api/notification", file: "./routes/notification.routes" },
    { path: "/api/profile", file: "./routes/profile.routes" },
    { path: "/api/admin", file: "./routes/admin.routes" },
    { path: "/api/membership", file: "./routes/membership.route" },
    { path: "/api/bookings", file: "./routes/booking.routes" },
    { path: "/api/social", file: "./routes/social.routes" },
    { path: "/api/events", file: "./routes/event.routes" },
    { path: "/api/resume", file: "./routes/resume.routes" },
    { path: "/api/courses", file: "./routes/courses.routes" }
  ];
  
  routes.forEach(route => {
    try {
      const routeModule = require(route.file);
      app.use(route.path, routeModule);
      // console.log(`✅ Route registered: ${route.path}`);
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') {
        console.log(`⚠️ Error loading ${route.path}:`, error.message);
      }
    }
  });
};

registerRoutes();
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
try {
  connectDB();
  // console.log('✅ Database connected');
} catch (error) {
  console.log('⚠️ Database connection error:', error.message);
}

// Socket.IO connection
try {
  require('./socket/chatSocket')(io);
  // console.log('✅ Socket.IO initialized');
} catch (error) {
  // console.log('⚠️ Socket module not found');
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'TDC Server is running',
    version: '1.0.0',
    endpoints: {
      chat: 'POST /api/chat',
      health: 'GET /api/chat/health',
      test: 'GET /api/test'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: `Cannot ${req.method} ${req.originalUrl}` 
  });
});

// ============ SERVER START ============
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
});