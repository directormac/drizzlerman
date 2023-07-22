import { InferModel, eq, or, placeholder } from "drizzle-orm";
import { db } from "..";
import { address, users } from "../schemas/user";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { ZodError, ZodIssue, z } from "zod";
import { SqliteError } from "better-sqlite3";
import { CustomResponse } from "./GenericResponse";

// Generic types
type UserType = InferModel<typeof users, "select">;
type AddressType = InferModel<typeof address, "select">;
type UserInputType = InferModel<typeof users, "insert">;
type AddressInputType = InferModel<typeof address, "insert">;

// Generated Types
export type User = UserType & {
  address: AddressType;
};

export type CreateUser = Omit<UserInputType, "address" | "id"> & {
  address: Omit<AddressInputType, "id">;
};

// Drizzle-zod Schema Types
export const selectUserSchema = createSelectSchema(users);

export const createAddressSchema = createInsertSchema(address, {
  street: (schema) => schema.street.default(""),
  city: (schema) => schema.city.default(""),
  province: (schema) => schema.province.default(""),
});

export const createUserSchema = createInsertSchema(users, {
  email: (schema) => schema.email.email("Invalid Email"),
  firstName: (schema) =>
    schema.firstName.min(1, "Minimum of 1 Character").max(255).trim(),
  lastName: (schema) =>
    schema.lastName.min(1, "Minimum of 1 Character").max(255).trim(),
  address: createAddressSchema,
});
export type CreateUserTypeWithZod = z.infer<typeof createUserSchema>;

// Select
export const getUsers: User[] = db.query.users.findMany({
  with: {
    address: true,
  },
});

export const getUserById = db.query.users.prepareFindFirst({
  where: (users, { eq }) => eq(users.id, placeholder("id")),
  with: {
    address: true,
  },
});

export const getUserByEmail = db.query.users.prepareFindFirst({
  where: (users, { eq }) => eq(users.email, placeholder("email")),
  with: {
    address: true,
  },
});

// Inserting with resolve messages we cannot afford undefined or error on run time
const insertAddress = async (
  userAddress: AddressInputType
): Promise<AddressType | CustomResponse> => {
  try {
    const newAddress = db.insert(address).values(userAddress).returning().get();
    return newAddress as AddressType;
  } catch (error) {
    const response = error as SqliteError;
    return { message: `${response.toString()}` };
  }
};

const insertUser = async (
  user: UserInputType
): Promise<UserType | CustomResponse> => {
  return new Promise((resolve) => {
    try {
      const newUser = db.insert(users).values(user).returning().get();
      if (newUser) {
        resolve(newUser);
      }
    } catch (error) {
      const response = error as SqliteError;
      resolve({ message: `${response.toString()}` });
    }
  });
};

// Queries
export const createUser = async (user: CreateUser) => {};

// Might be a little bit overkill, but we should handle errors in ways that make sense for our application
// We dont want undefined , nulls or errors to be returned to the client
export const createUserPromise = async (
  user: CreateUser
): Promise<User | CustomResponse> => {
  return new Promise((resolve) => {
    try {
      const userAddress: AddressType = db
        .insert(address)
        .values({
          street: user.address.street ?? "",
          city: user.address.city ?? "",
          province: user.address.province ?? "",
        })
        .returning()
        .get();
      const newUser = db
        .insert(users)
        .values({
          ...user,
          address: userAddress.id,
        })
        .returning()
        .get();
      const data = getUserById.execute({ id: newUser.id });
      if (data === undefined) {
        resolve({ message: "Failed to create user" });
      } else {
        resolve(data);
      }
    } catch (err: any) {
      const error = err as SqliteError;
      resolve({
        message: error.toString(),
      });
    }
  });
};

const createUserWithZod = async (
  user: CreateUserTypeWithZod
): Promise<User | ZodIssue[]> => {
  return new Promise(async (resolve) => {
    const parsedUser = await createUserSchema.safeParseAsync(user);
    if (!parsedUser.success) {
      resolve(parsedUser.error.errors);
    }
  });
};
