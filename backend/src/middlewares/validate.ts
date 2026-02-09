import { Request, Response, NextFunction } from "express";
import { Schema } from "joi";
import { StatusCodes } from "http-status-codes";

const validate = (
  schema: Schema,
  source: "body" | "query" | "params" = "body"
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      convert: true,
      stripUnknown: true,
    });

    if (error) {
      const fieldErrors: Record<string, string> = {};
      error.details.forEach((detail) => {
        const field = detail.path.join(".") as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = detail.message;
        }
      });

      return res.status(StatusCodes.BAD_REQUEST).json({ fieldErrors });
    }

    if (source === "body") {
      req.body = value;
    } else {
      Object.assign(req[source], value);
    }

    next();
  };
};

export default validate;
