import { Response } from "express";
import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

export const DefaultError = (res: Response, err: any) => {
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(StatusCodes.BAD_REQUEST).json({
      error: "Validation Error",
      message: "The data provided is invalid. ",
    });
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    res.status(StatusCodes.BAD_REQUEST).json({
      error: "Database Error",
      message: err.message,
    });
  } else {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Internal Server Error",
      message: err.message, //"Something went wrong. Please try again later.",
    });
  }
};
