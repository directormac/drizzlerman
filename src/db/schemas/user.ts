import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  uniqueIndex,
  integer,
} from "drizzle-orm/pg-core";

export const address = pgTable("address", {
  id: serial("id").primaryKey(),
  street: varchar("street").default(""),
  city: varchar("city").default(""),
  province: varchar("province").default(""),
});

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email").notNull(),
    password: varchar("password").notNull(),
    firstName: varchar("firstName").notNull(),
    lastName: varchar("lastName").notNull(),
    address: integer("address_id")
      .notNull()
      .references(() => address.id),
    role: varchar("role", { enum: ["ADMIN", "USER", "GUEST"] }).default("USER"),
  },
  (users) => {
    return {
      emailIndex: uniqueIndex("email_index").on(users.email),
    };
  }
);

export const userRelations = relations(users, ({ one }) => ({
  address: one(address, {
    fields: [users.address],
    references: [address.id],
  }),
}));
