export const ok = (res, data, status = 200, meta) => res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
export const fail = (res, status, message, details) => res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
export function asyncRoute(handler) { return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next); }
export function validate(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error('Please check the submitted information.');
    error.status = 400;
    error.details = result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
    throw error;
  }
  return result.data;
}
