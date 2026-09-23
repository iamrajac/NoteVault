class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (msg = 'Bad request') => new HttpError(400, msg);
const unauthorized = (msg = 'Authentication required') => new HttpError(401, msg);
const forbidden = (msg = 'You do not have permission to do that') => new HttpError(403, msg);
const notFound = (msg = 'Not found') => new HttpError(404, msg);
const conflict = (msg = 'Already exists') => new HttpError(409, msg);

// Express 4 does not forward rejected promises to the error handler, so every async handler is wrapped.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Wraps every function exported by a controller module.
const wrapController = (controller) =>
  Object.fromEntries(Object.entries(controller).map(([name, fn]) => [name, asyncHandler(fn)]));

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict, asyncHandler, wrapController };
