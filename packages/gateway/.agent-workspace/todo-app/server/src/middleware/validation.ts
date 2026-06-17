import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// 验证错误处理中间件
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: errors.array()
    });
    return;
  }
  next();
};

// 创建 Todo 验证规则
export const createTodoValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  handleValidationErrors
];

// 更新 Todo 验证规则
export const updateTodoValidation = [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Valid ID is required'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('Completed must be a boolean'),
  handleValidationErrors
];

// ID 参数验证
export const idParamValidation = [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Valid ID is required'),
  handleValidationErrors
];

// 查询参数验证
export const queryValidation = [
  query('completed')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Completed must be true or false'),
  handleValidationErrors
];
