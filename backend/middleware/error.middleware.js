export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  const status = err?.status || 500;
  const message = err?.message || "Something went wrong";

  return res.status(status).json({
    success: false,
    message,
  });
};
// export const errorHandler = (err, req, res, next) => {
//   console.error("Error:", {
//     message: err.message,
//     stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
//     path: req.path,
//     method: req.method
//   });

//   const status = err.status || 500;
//   const message = err.message || "Something went wrong";

//   return res.status(status).json({
//     success: false,
//     message,
//     ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
//   });
// };