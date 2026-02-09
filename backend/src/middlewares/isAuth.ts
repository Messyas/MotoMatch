import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const isAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.uid) {
    return next();
  }

  return res.status(StatusCodes.UNAUTHORIZED).json({
    message: "Unauthorized",
  });
};
