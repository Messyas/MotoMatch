import { DefaultError } from "../errors";
import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

describe("DefaultError", () => {
  let res: any;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("should return 400 for PrismaClientValidationError", () => {
    const error = new Prisma.PrismaClientValidationError("Invalid data", {
      clientVersion: "4.14.0",
    });

    DefaultError(res, error);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      error: "Validation Error",
      message: "The data provided is invalid. ",
    });
  });

  it("should return 400 for PrismaClientKnownRequestError", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Known DB error", {
      code: "P2002",
      clientVersion: "3.0.0",
    });

    DefaultError(res, error);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      error: "Database Error",
      message: "Known DB error",
    });
  });

  it("should return 500 for generic error", () => {
    const error = new Error("Something went wrong");

    DefaultError(res, error);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      error: "Internal Server Error",
      message: "Something went wrong",
    });
  });
});
