
const mongoose = require("mongoose");
const ApplicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    operator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    subService: { _id: String, name: String },
    data: { type: Object, default: {} },
    documents: [{ filename: String, fileId: mongoose.Schema.Types.ObjectId }],
    userProfile: {
      name: String,
      caste: String,
      gender: String,
      dob: Date,
      profileDocs: [
        { filename: String, fileId: mongoose.Schema.Types.ObjectId, filepath: String },
      ],
    },

    // ✅ Application status
    status: {
      type: String,
      enum: [
        "Draft",
        "Submitted",
        "In Review",
        "Pending Confirmation",
        "Confirmed",
        "Rejected",
        "Completed",
      ],
      default: "Draft",
    },

    formPdf: {
      filename: String,
      fileId: mongoose.Schema.Types.ObjectId,
    },
    certificate: {
      filename: String,
      fileId: mongoose.Schema.Types.ObjectId,
    },

    operatorCredentials: {
      operatorId: { type: String, default: "" },
      operatorPassword: { type: String, default: "" },
    },

    rejectReason: { type: String, default: "" },
    correctionComment: { type: String, default: "" },

    // ✅ Razorpay Payment Info
    paymentInfo: {
      orderId: { type: String, default: "" },
      paymentId: { type: String, default: "" },
      signature: { type: String, default: "" },
      amount: { type: Number, default: 0 },
      paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", ApplicationSchema);
