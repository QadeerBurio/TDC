const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
  name: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  password: { type: String, required: true },

  role: {
    type: String,
    enum: ["student", "brand", "admin"],
    default: "student"
  },
  
isAlumni: { type: Boolean, default: false },
  isVip: { type: Boolean, default: false },

  vipExpiry: { type: Date },

  status: {
    type: String,
    enum: ["Not Verified", "Pending", "Verified"],
    default: "Not Verified"
  },

  profileImage: { type: String, default: "" },
  idCardFront: { type: String, default: "" },
  idCardBack: { type: String, default: "" },
  livePicture: { type: String, default: "" },

  rollNo: String,
  phone: String,
  university: { type: mongoose.Schema.Types.ObjectId, ref: "University" },

  address: String,
  instagram: String
},
{ timestamps: true }
);

module.exports = mongoose.model("User", userSchema);