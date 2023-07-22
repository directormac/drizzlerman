import { relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const address = sqliteTable("address", {
  id: integer("id").primaryKey(),
  street: text("street"),
  city: text("city"),
  province: text("province"),
});

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey(),
    email: text("email").notNull(),
    firstName: text("firstName").notNull(),
    lastName: text("lastName").notNull(),
    address: integer("address_id").notNull(),
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
