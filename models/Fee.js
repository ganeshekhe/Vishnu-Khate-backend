// const mongoose = require("mongoose");

// const feeSchema = new mongoose.Schema({
//   caste: { type: String, required: true, unique: true },
//   amount: { type: Number, required: true },
// }, { timestamps: true });

// module.exports = mongoose.model("Fee", feeSchema);


const mongoose = require("mongoose");

// 👉 Caste-wise fee schema
const feeSchema = new mongoose.Schema(
  {
    caste: { type: String, required: true }, // e.g., General, OBC, SC, ST
    amount: { type: Number, required: true }, // Service fee
  },
  { _id: false }
);

// 👉 Subservice schema
const subserviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fees: [feeSchema], // caste-wise fees
    platformFee: { type: Number, default: 0 }, // subservice-specific platform fee
  },
  { timestamps: true }
);

// 👉 Service schema
const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    fees: [feeSchema], // caste-wise fees
    platformFee: { type: Number, default: 0 }, // service-specific platform fee
    subservices: [subserviceSchema], // list of subservices
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
