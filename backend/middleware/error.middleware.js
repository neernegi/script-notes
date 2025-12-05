export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  const status = err?.status || 500;
  const message = err?.message || "Something went wrong";

  return res.status(status).json({
    success: false,
    message,
  });
};
