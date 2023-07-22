import { InferModel, eq, or, placeholder, like, ilike } from "drizzle-orm";
import { db } from "..";
import { address, users } from "../schemas/user";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { CustomResponse } from "./GenericResponse";
import { PostgresError } from "postgres";

// NOTE: Generic Types
// these are the onces that are used to interact with the DB and DB Only
// Also Testing this types at "User Generic query Tests"
// Updates and Deletes are not included here as they have Custom Responses
type UserType = InferModel<typeof users, "select">;
type AddressType = InferModel<typeof address, "select">;
type UserInputType = InferModel<typeof users, "insert">;
type AddressInputType = InferModel<typeof address, "insert">;

// NOTE: Extending Generated Types
// We want to return the data as objects that we can interact with
// Where the address is nested inside the user object
// This is the type that we will return to the client
// Theis practices handling errors through out our system
// We dont want to deal with nulls or undefined in the runtime

// This type is used for User Reponse Object we override the address with all its data not just the foreign key
type UserRefinedType = Omit<UserType, "address" | "password">;
type UserResponse = UserRefinedType & {
  address: AddressType;
};

// This type is used for Inputing user which we can utilize later interacting with outside APIs
// The difference between UserResponse is that id's are not required
type UserRefinedInputType = Omit<UserInputType, "address" | "id">;
type UserInput = UserRefinedInputType & {
  address: AddressInputType;
};
// A more comprehensive approach wher we remove the "id" property from the type
type UserInputV2 = Omit<UserInputType, "id" | "address"> & {
  address: Omit<AddressInputType, "id">;
};

// Unecessary but we can also create a type for the address
type AsdressInput = AddressInputType;

//TODO: Update and Delete Responses
// Should be generic where { success: boolean, message: string, data: user.id? }
export type UserUpdateResponse = {};
export type UserDeleteResponse = {};

//NOTE: Boilerplates after Boilerplates
// Yes too much boilerplate but this is how we avoid runtime nulls, undefined and unknowns!
export type User = UserResponse;
export type Address = AddressType;
export type CreateUser = UserInput;
export type CreateAddress = AsdressInput;

// Zod Generated Schema types usefull for parsing our input before sending it to the database
// Our API Request can directly use this schema to validate the input!
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
  password: (schema) => schema.password.min(3, "Minimum of 1 Character").trim(),
  role: (schema) => schema.role.default("GUEST"),
  address: createAddressSchema,
});

export type CreateUserWithZod = z.infer<typeof createUserSchema>;
export type CreateAddressWithZod = z.infer<typeof createAddressSchema>;

// Now we use our types and export some queries to be used by our api
export const getUsers = async (): Promise<User[]> => {
  return await db.query.users.findMany({ with: { address: true } });
};

//prepared select statements faster than normal queries

export async function getUserById1(id: number) {
  const getUserWithId = db.query.users
    .findFirst({
      where: (users, { eq }) => eq(users.id, placeholder("id")),
      with: {
        address: true,
      },
    })
    .prepare("get_user_by_id");
  const query = await getUserWithId.execute({ id });
  if (query !== undefined) {
    return query;
  } else {
    throw new Error("User not found");
  }
}

export const getUserById = db.query.users
  .findFirst({
    where: (users, { eq }) => eq(users.id, placeholder("id")),
    with: {
      address: true,
    },
  })
  .prepare("get_user_by_id");

export const getUserByEmail = db.query.users
  .findFirst({
    where: (users, { eq }) => eq(users.email, placeholder("email")),
    with: {
      address: true,
    },
  })
  .prepare("get_user_by_email");

export const getUsersWithNameLike = db.query.users
  .findMany({
    where: (users, { or }) =>
      or(
        ilike(users.firstName, placeholder("firstName")),
        ilike(users.lastName, placeholder("lastName"))
      ),
  })
  .prepare("get_user_by_fields");

// Raw Inserts utilizing the generic inferred types
// For test purposes we are exporting the statements
// In this insert we ensure that address is either created or rejected
export const insertAddress = async (
  newAddress: CreateAddress
): Promise<Address> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await db.insert(address).values(newAddress).returning();
      // drizzle always returns an array, so we resolve the first element
      // Safeguard for unknown errors that might occur
      if (!result[0]) reject("Error inserting address");
      resolve(result[0]);
    } catch (err) {
      // Safeguard for errors that might occur  regarding db connection and postgres errors
      const error = err as PostgresError;
      reject(
        `Error inserting address: ${error.message} with Object ${JSON.stringify(
          newAddress
        )}`
      );
    }
  });
};

export const insertUser = async (user: CreateUser): Promise<UserType> => {
  return new Promise(async (resolve, reject) => {
    try {
      const address = await insertAddress(user.address);
      const newUser = await db
        .insert(users)
        .values({ ...user, address: address.id })
        .returning();
      if (!newUser[0]) reject("Error inserting user");
      resolve(newUser[0]);
    } catch (err) {
      const error = err as PostgresError;
      reject(
        `Error inserting address: ${error.message} with Object ${JSON.stringify(
          user
        )}`
      );
    }
  });
};

// Queries the following are what we should be exposing!
export const createUser = async (user: CreateUser): Promise<User> => {
  return new Promise(async (resolve, reject) => {
    //  TODO: We should be using transactions here to make sure that we don't insert a user without an address
    //  NOTE: The scope of the tests does not include
    //  insertUser and getUserById to create a new user and then return the user
    const result = await insertUser(user);
    const newUser = await getUserById.execute({ id: result.id });
    if (newUser) {
      // TODO: refactor getUserById to not return password at all
      // deconstructed user we never return password,
      const { id, firstName, lastName, email, role } = newUser;
      // deconstructed the address object to make the return type a little bit more readable
      const { id: addressId, street, city, province } = newUser.address;

      // NOTE: Resolving with deconstructed properties
      // Ensures we return the correct type which is User
      resolve({
        id,
        firstName,
        lastName,
        email,
        role,
        address: {
          id: addressId,
          street,
          city,
          province,
        },
      }); // This ensures we return the correct type!!!
    }

    //TODO: Needs a more generic response
    // Generic error if something goes wrong, we will handle this better with zod!
    reject("Error creating user");
  });
};

// Might be a little bit overkill, but we should handle errors in ways that make sense for our application
// We dont want undefined , nulls or errors to be returned to the client
