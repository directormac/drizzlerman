import { db } from "./db";
import {
  CreateUser,
  User,
  createUser,
  createUserPromise,
} from "./db/queries/Users";
import { users, address } from "./db/schemas/user";

async function main() {
  console.log(`Hello world! ${new Date()}`);
  console.log("Just running test");

  db.delete(users).run();
  db.delete(address).run();

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
  const rizal: CreateUser = {
    ...JRizal,
    address: { ...JRizalAddress },
  };
  const jrizal = await createUserPromise(rizal);
  console.log(`First Create: ${JSON.stringify(jrizal)}`);

  const jrizal2 = await createUserPromise(rizal);
  console.log(`Second Create: ${JSON.stringify(jrizal2)}`);

  db.delete(users).run();
  db.delete(address).run();
}

main();
