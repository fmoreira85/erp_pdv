function sendSuccess(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
  });
}

function sendError(res, message = "Erro interno do servidor", statusCode = 500, details = null) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: details ? { message, details } : message,
  });
}

module.exports = {
  sendSuccess,
  sendError,
};
