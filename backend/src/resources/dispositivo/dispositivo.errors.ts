import { Prisma } from "@prisma/client";
import { Response } from "express";
import { StatusCodes } from "http-status-codes";

const createDispositivoError = (res: Response, err: any) => {
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(StatusCodes.BAD_REQUEST).json({
      error: "Validation Error",
      message: "Os dados fornecidos são inválidos.",
    });
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    res
      .status(
        err.code === "P2002" ? StatusCodes.CONFLICT : StatusCodes.BAD_REQUEST
      )
      .json({
        error: "Database Error",
        message: "Dispositivo já existe.",
      });
  } else {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Internal Server Error",
      message: "Ocorreu um erro inesperado. Tente novamente mais tarde.",
    });
  }
};

export default createDispositivoError;
