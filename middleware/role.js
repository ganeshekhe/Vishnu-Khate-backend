exports.requireRole = (...roles) => {
  return (req, res, next) => {
    try {
      console.log("🔍 Required roles:", roles);
      console.log("🔍 User role from token:", req.user?.role);

      const role = req.user?.role;
      if (!role || !roles.includes(role)) {
        return res.status(403).json({ message: "Forbidden: insufficient rights", userRole: role });
      }
      next();
    } catch (e) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  };
};
