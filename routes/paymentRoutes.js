


const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { verifyToken } = require("../middleware/authMiddleware");
const Application = require("../models/Application");

const router = express.Router();

// ✅ Razorpay instance तयार करा
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ------------------
// 📌 1. Create Order
// ------------------
router.post("/create-order", verifyToken, async (req, res) => {
  try {
    const { amount, applicationId } = req.body;

    if (!amount || !applicationId) {
      return res.status(400).json({ message: "Amount and Application ID required" });
    }

    // Razorpay साठी order तयार करा
    const options = {
      amount: amount * 100, // amount in paisa
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Application मध्ये order + payment pending ठेवू
    await Application.findByIdAndUpdate(applicationId, {
      "paymentInfo.orderId": order.id,
      "paymentInfo.amount": amount,
      "paymentInfo.paymentStatus": "Pending",  // ✅ correct field
    });

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error("❌ Create order error:", err);
    res.status(500).json({ message: "Failed to create order" });
  }
});

// ------------------
// 📌 2. Verify Payment
// ------------------
router.post("/verify", verifyToken, async (req, res) => {
  try {
    const { applicationId, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    if (!applicationId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification details" });
    }

    // Signature verify करा
    const sign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (sign !== razorpay_signature) {
      // ❌ Invalid signature → payment failed
      await Application.findByIdAndUpdate(applicationId, {
        "paymentInfo.paymentStatus": "Failed",   // ✅ correct field
      });

      return res.status(400).json({ message: "Payment verification failed" });
    }

    // ✅ Payment verified → Application Submitted
    const updatedApp = await Application.findByIdAndUpdate(
      applicationId,
      {
        status: "Submitted",
        paymentInfo: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
          amount,
          paymentStatus: "Paid",   // ✅ correct field
        },
      },
      { new: true }
    )
      .populate("user", "name mobile")
      .populate("service", "name");

    req.io?.emit("applicationCreated", updatedApp);

    res.json({ message: "Payment successful", application: updatedApp });
  } catch (err) {
    console.error("❌ Verify payment error:", err);
    res.status(500).json({ message: "Payment verification failed" });
  }
});

module.exports = router;
