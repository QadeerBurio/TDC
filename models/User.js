const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
  name: { 
    type: String, 
    required: true 
  },

  email: { 
    type: String, 
    required: true, 
    unique: true 
  },

  password: { 
    type: String, 
    required: true 
  },

  role: {
    type: String,
    enum: ["student", "brand", "admin"],
    default: "student"
  },

  isAlumni: { 
    type: Boolean, 
    default: false 
  },

  isVip: { 
    type: Boolean, 
    default: false 
  },

  vipExpiry: { 
    type: Date 
  },

  status: {
    type: String,
    enum: ["Not Verified", "Pending", "Verified"],
    default: "Not Verified"
  },

  profileImage: { 
    type: String, 
    default: "" 
  },

  idCardFront: { 
    type: String, 
    default: "" 
  },

  idCardBack: { 
    type: String, 
    default: "" 
  },

  livePicture: { 
    type: String, 
    default: "" 
  },

  rollNo: String,
  phone: String,

  university: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "University" 
  },

  address: String,
  instagram: String,

  // Referral System
  referralCode: { 
    type: String, 
    unique: true,
    sparse: true
  }, 

  referredBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },

  referralCount: { 
    type: Number, 
    default: 0 
  },

  canApplyForTdcCard: { 
    type: Boolean, 
    default: false 
  }

}, 
{ timestamps: true }
);


userSchema.pre('save', async function() {
  // 1. Only generate if the code doesn't exist and the user is a student
  if (!this.referralCode && this.role === 'student') {
    let isUnique = false;
    let newCode = "";
    
    // 2. Loop until a unique code is found
    while (!isUnique) {
      // Generates a random 6-character alphanumeric string
      newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // 3. Verify uniqueness in the DB
      // Use this.constructor to refer to the User model within middleware
      const existing = await this.constructor.findOne({ referralCode: newCode });
      
      if (!existing) {
        isUnique = true;
      }
    }
    
    this.referralCode = newCode;
  }
  // ✅ In async hooks, you don't need next(). 
  // Just returning (or reaching the end) tells Mongoose to proceed.
});

module.exports = mongoose.model("User", userSchema);