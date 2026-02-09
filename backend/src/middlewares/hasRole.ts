import { NextFunction, Request, Response } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

export const hasRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userTypeId = req.session.userTypeId;

    if (userTypeId && roles.includes(userTypeId)) {
      return next();
    }

    return res.status(StatusCodes.FORBIDDEN).send(ReasonPhrases.FORBIDDEN);
  };
};
