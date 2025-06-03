const { validationResult } = require("express-validator");

// Checks for errors in the request, otherwise moves on to the next middleware.
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => ({
      field: err.path, // use path to get the field
      message: err.msg,
    }));

    return res.status(400).json({ errors: extractedErrors });
  }

  next();
};

module.exports = handleValidation;
