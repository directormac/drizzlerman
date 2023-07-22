import {
  describe,
  expect,
  test,
  afterEach,
  beforeEach,
  expectTypeOf,
} from "vitest";

import { address, users } from "../schemas/user";
import {
  CreateUser,
  createUser,
  createUserSchema,
  getUserByEmail,
  getUserById,
  User,
  getUsersWithNameLike,
  insertUser,
  getUserById1,
} from "./Users";
import { InferModel, eq } from "drizzle-orm";
import { db } from "..";

const JoseRizal = {
  email: "j.rizal@lasolidaridad.org",
  firstName: "Jose",
  lastName: "Rizal",
  password: "password",
  role: "ADMIN",
  address: {
    street: "Rizal Avenue",
    city: "Calamba",
    province: "Laguna",
  },
};

describe("User Generic Query Tests", async () => {
  beforeEach(async () => {
    await insertUser(JoseRizal as CreateUser);
  });

  afterEach(async () => {
    db.delete(users).execute();
    db.delete(address).execute();
  });

  test("should get users", async () => {
    const currentUsers: InferModel<typeof users, "select">[] = await db
      .select()
      .from(users)
      .execute();
    expect(currentUsers.length).toBe(1);
    expectTypeOf(currentUsers).toBeArray();
  });

  test("should get user with name Jose from db", async () => {
    const query: InferModel<typeof users, "select">[] = await db
      .select()
      .from(users)
      .where(eq(users.firstName, "Jose"))
      .limit(1)
      .execute();
    if (query[0]) {
      const result = query[0];
      expectTypeOf(result).toBeObject();
      expect(result.lastName).toEqual("Rizal");
    }
  });

  test("should update user with firstName Jose to Jose Protasio from db", async () => {
    const query: InferModel<typeof users, "select">[] = await db
      .update(users)
      .set({ firstName: "Jose Protasio" })
      .where(eq(users.firstName, "Jose"))
      .returning()
      .execute();
    if (query[0]) {
      const result = query[0];
      expectTypeOf(result).toBeObject();
      expect(result.firstName).toEqual("Jose Protasio");
    }
  });

  test("should delete user with email", async () => {
    const query = await db
      .delete(users)
      .where(eq(users.email, "j.rizal@lasolidaridad.org"))
      .returning()
      .execute();
    const deletedUser = query[0];
    expect(deletedUser?.lastName).toBe("Rizal");
  });
});

describe("User Relational Queries Prepared Tests", async () => {
  let currentUserToTest: User;
  beforeEach(async () => {
    currentUserToTest = await createUser(JoseRizal as CreateUser);
  });

  afterEach(async () => {
    await db.delete(users).execute();
    await db.delete(address).execute();
  });

  test("Should get user with id", async () => {
    // const query = await getUserById.execute({ id: currentUserToTest.id });
    const query = await getUserById1(currentUserToTest.id);
    expect(query).toBeDefined();
  });

  test("Should throw user with non existent", async () => {
    // const query = getUserById.execute({ id: 2 });
    const query = await getUserById1(1);
    console.log(query);
    expect(query).toThrowError();
  });
});

describe("Users Tests with zod", async () => {
  beforeEach(async () => {
    const user = createUserSchema.parse(JoseRizal as CreateUser);
    createUser(user);
  });

  afterEach(async () => {
    db.delete(users).execute();
    db.delete(address).execute();
  });
});
