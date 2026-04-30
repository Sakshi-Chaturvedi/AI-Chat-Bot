const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // saare errors ek saath
      stripUnknown: true, // extra fields hata deta hai
    });

    if (error) {
      const message = error.details.map((err) => err.message).join(", ");

      return res.status(400).json({
        success: false,
        message,
      });
    }

    req.body = value; // cleaned data

    next();
  };
};

export default validate;