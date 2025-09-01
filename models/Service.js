


// // ✅ Updated Service Model (models/Service.js)
// const mongoose = require("mongoose");

// const serviceSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, trim: true, unique: true },
//     description: { type: String, default: "", trim: true },
//     icon: { type: String, default: "" },
//     isActive: { type: Boolean, default: true },
//     fees: {
//       SC: { type: Number, default: 0 },
//       ST: { type: Number, default: 0 },
//       OBC: { type: Number, default: 0 },
//       General: { type: Number, default: 0 },
//       Other: { type: Number, default: 0 },
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Service", serviceSchema);






const mongoose = require("mongoose");

// 👉 SubService Schema
const SubServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  fees: {
    SC: { type: Number, default: 0 },
    ST: { type: Number, default: 0 },
    OBC: { type: Number, default: 0 },
    General: { type: Number, default: 0 },
    Other: { type: Number, default: 0 },
  },
  platformFee: { type: Number, default: 0 }, // 👈 subservice specific platform fee
});

// 👉 Service Schema
const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" }, // 👈 category link
    description: { type: String },
    fees: {
      SC: { type: Number, default: 0 },
      ST: { type: Number, default: 0 },
      OBC: { type: Number, default: 0 },
      General: { type: Number, default: 0 },
      Other: { type: Number, default: 0 },
    },
    platformFee: { type: Number, default: 0 }, // 👈 service specific platform fee
    subservices: [SubServiceSchema], // 👈 subservices list
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", ServiceSchema);
