const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Application = require("../models/Application");
const Service = require("../models/Service");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create order
router.post("/order", verifyToken, async (req, res) => {
  try {
    const { serviceId, subServiceId } = req.body;
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ message: "Service not found" });

    // Calculate amount = caste based fee + platformFee
    let amount = service.platformFee || 0;
    const userCaste = req.user.caste;

    if (service.fees[userCaste]) {
      amount += service.fees[userCaste];
    }

    if (subServiceId) {
      const sub = service.subservices.id(subServiceId);
      if (sub) {
        amount += sub.platformFee || 0;
        if (sub.fees[userCaste]) amount += sub.fees[userCaste];
      }
    }

    const options = {
      amount: amount * 100, // Razorpay paise madhe amount hoto
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);
    res.json({ order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Order creation failed" });
  }
});

// Verify payment
router.post("/verify", verifyToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, serviceId, subServiceId } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // Save application only on success
    const newApp = new Application({
      user: req.user.id,
      service: serviceId,
      subService: subServiceId ? { _id: subServiceId } : null,
      status: "Submitted",
    });

    await newApp.save();
    res.json({ message: "Payment successful, application submitted", application: newApp });
  } catch (err) {
    res.status(500).json({ message: "Payment verification failed" });
  }
});

module.exports = router;
