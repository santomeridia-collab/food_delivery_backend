module.exports = (schema) => {
    return (req, res, next) => {
      const { error } = schema.validate(req.body, { abortEarly: false });
  
      if (error) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: error.details.map((item) => ({
            field: item.path.join("."),
            message: item.message
          }))
        });
      }
  
      next();
    };
  };