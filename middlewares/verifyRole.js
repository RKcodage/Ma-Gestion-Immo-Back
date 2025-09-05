// Verify if user has the right role
function ensureRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Action not allowed" });
    }
    next();
  };
}

module.exports = { ensureRole };
