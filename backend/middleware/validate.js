const { badRequest } = require('../utils/errors');

// Parses req.body / req.query with a zod schema and replaces it with the parsed (trimmed, coerced) value.
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join('.');
    return next(badRequest(field ? `${field}: ${issue.message}` : issue.message));
  }
  if (source === 'query') {
    // req.query is a getter in newer Express versions; store parsed values separately.
    req.validatedQuery = result.data;
  } else {
    req[source] = result.data;
  }
  next();
};

module.exports = { validate };
