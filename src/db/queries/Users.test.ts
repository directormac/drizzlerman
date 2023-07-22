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
  CreateUserTypeWithZod,
  createUser,
  createUserSchema,
  getUserById,
} from "./Users";
import { InferModel, eq } from "drizzle-orm";
import { db } from "..";

describe("User Tests", async () => {
  const JRizalAddress = {
    street: "Rizal Avenue",
    city: "Calamba",
    province: "Laguna",
  };
  const JRizal = {
    email: "j.rizal@lasolidaridad.org",
    firstName: "Jose",
    lastName: "Rizal",
  };
  beforeEach(async () => {
    const jRizalAddress = db
      .insert(address)
      .values(JRizalAddress)
      .returning()
      .get();

    db.insert(users)
      .values({ ...JRizal, address: jRizalAddress.id })
      .returning()
      .get();
  });

  afterEach(async () => {
    db.delete(users).run();
    db.delete(address).run();
  });

  test("should get users", async () => {
    const currentUsers: InferModel<typeof users, "select">[] = db
      .select()
      .from(users)
      .all();
    expect(currentUsers.length).toBe(1);
    expectTypeOf(currentUsers).toBeArray();
  });

  test("should get user with name Jose from db", async () => {
    const jrizal: InferModel<typeof users, "select"> = db
      .select()
      .from(users)
      .where(eq(users.firstName, "Jose"))
      .limit(1)
      .get();
    expectTypeOf(jrizal).toBeObject();
    expect(jrizal.lastName).toEqual("Rizal");
  });

  test("should update user with firstName Jose to Jose Protasio from db", async () => {
    const jrizal: InferModel<typeof users, "select"> = db
      .update(users)
      .set({ firstName: "Jose Protasio" })
      .where(eq(users.firstName, "Jose"))
      .returning()
      .get();
    expectTypeOf(jrizal).toBeObject();
    expect(jrizal.firstName).toEqual("Jose Protasio");
  });

  test("should upsert user with new first name", async () => {
    const upsertThisUser = {
      ...JRizal,
      address: 1,
      firstName: "J Protasio",
    };
    const upsertedUser = db
      .insert(users)
      .values(upsertThisUser)
      .onConflictDoUpdate({
        target: users.email,
        set: { firstName: upsertThisUser.firstName },
      })
      .returning()
      .get();
    expect(upsertedUser.id).toBe(1);
    expect(upsertedUser.firstName).toBe("J Protasio");
  });

  test("should delete user with email", async () => {
    const deletedUser = db
      .delete(users)
      .where(eq(users.email, "j.rizal@lasolidaridad.org"))
      .returning()
      .get();
    expect(deletedUser?.lastName).toBe("Rizal");
  });
});

describe("User Relational Queries Tests", async () => {
  const JRizalAddress = {
    street: "Rizal Avenue",
    city: "Calamba",
    province: "Laguna",
  };
  const JRizal = {
    email: "j.rizal@lasolidaridad.org",
    firstName: "Jose",
    lastName: "Rizal",
  };
  beforeEach(async () => {
    const rizal: CreateUser = {
      ...JRizal,
      address: { ...JRizalAddress },
    };
    createUser(rizal);
  });

  afterEach(async () => {
    db.delete(users).run();
    db.delete(address).run();
  });

  test("Should get user with id", () => {
    const user = getUserById.execute({ id: 1 });
    expect(user).toBeDefined();
  });

  test("Should throw user with non existent", () => {
    const user = getUserById.execute({ id: 2 });
    expect(user).toBeUndefined();
  });
  test("Should throw if creating user with same email", () => {
    const rizal: CreateUser = {
      ...JRizal,
      address: { ...JRizalAddress },
    };
    expect(createUser(rizal)).toHaveProperty("message");
  });
});

describe("Users Tests with zod", async () => {
  const JRizalAddress = {
    street: "Rizal Avenue",
    city: "Calamba",
    province: "Laguna",
  };
  const JRizal: CreateUserTypeWithZod = {
    email: "j.rizal@lasolidaridad.org",
    firstName: "Jose",
    lastName: "Rizal",
    address: JRizalAddress,
  };
  beforeEach(async () => {
    const user = createUserSchema.parse(JRizal);
    createUser(user);
  });

  afterEach(async () => {
    db.delete(users).run();
    db.delete(address).run();
  });

  test("should parse input", () => {
    expect(createUserSchema.parse(JRizal)).toBeTruthy();
  });
  test("should throw if invalid email", async () => {
    const parsed = await createUserSchema.safeParseAsync({
      ...JRizal,
      email: "not an email",
    });
    if (!parsed.success) {
      console.log(parsed.error);
      expect(parsed.error.message).toBe("Invalid Email");
    }
    expect(parsed.success).toBe(false);
  });
});
