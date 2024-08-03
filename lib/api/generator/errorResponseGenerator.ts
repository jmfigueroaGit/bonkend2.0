// lib/generators/errorHandlerGenerator.ts

export function generateErrorHandlerFile(format: 'javascript' | 'typescript'): string {
	const typeAnnotations =
		format === 'typescript'
			? `: {
      message: string;
      status: string;
      statusCode: number;
      isOperational?: boolean;
      stack?: string;
    }`
			: '';

	return `
  ${format === 'typescript' ? "import { Request, Response, NextFunction } from 'express';" : ''}
  
  class AppError extends Error {
    ${
			format === 'typescript'
				? `
    statusCode: number;
    status: string;
    isOperational: boolean;
    `
				: ''
		}
  
    constructor(message${format === 'typescript' ? ': string' : ''}, statusCode${
		format === 'typescript' ? ': number' : ''
	}) {
      super(message);
      this.statusCode = statusCode;
      this.status = \`\${statusCode}\`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  function errorResponse(err${typeAnnotations}) {
    return {
      success: false,
      error: {
        message: err.message,
        status: err.status,
        statusCode: err.statusCode,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      }
    };
  }
  
  const errorHandler = (err${format === 'typescript' ? ': AppError' : ''}, req${
		format === 'typescript' ? ': Request' : ''
	}, res${format === 'typescript' ? ': Response' : ''}, next${format === 'typescript' ? ': NextFunction' : ''}) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
  
    if (process.env.NODE_ENV === 'development') {
      sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
      sendErrorProd(err, res);
    }
  };
  
  const sendErrorDev = (err${format === 'typescript' ? ': AppError' : ''}, res${
		format === 'typescript' ? ': Response' : ''
	}) => {
    res.status(err.statusCode).json(errorResponse(err));
  };
  
  const sendErrorProd = (err${format === 'typescript' ? ': AppError' : ''}, res${
		format === 'typescript' ? ': Response' : ''
	}) => {
    if (err.isOperational) {
      res.status(err.statusCode).json(errorResponse(err));
    } else {
      console.error('ERROR 💥', err);
      res.status(500).json(errorResponse({
        message: 'Something went very wrong!',
        status: 'error',
        statusCode: 500,
        isOperational: false
      }));
    }
  };
  
  ${
		format === 'typescript'
			? 'export { AppError, errorHandler, errorResponse };'
			: 'module.exports = { AppError, errorHandler, errorResponse };'
	}
  `.trim();
}
