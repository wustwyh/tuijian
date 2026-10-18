export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const invalid = (message) => new ApiError(400, 'VALIDATION_ERROR', message);
export const unauthorized = () => new ApiError(401, 'UNAUTHORIZED', '请先登录');
export const notFound = () => new ApiError(404, 'NOT_FOUND', '资源不存在');
