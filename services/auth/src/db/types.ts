import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface AuthDatabase {
	users: UserTable;
}

export interface UserTable {
	id: string;
	phoneNumber: string;
	name: Generated<string>;
	role: Generated<'STUDENT' | 'STAFF' | 'SUDO'>;
	blacklisted: Generated<boolean>;
	createdAt: Generated<Date>;
	updatedAt: Generated<Date>;
}

export type User = Selectable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type UserUpdate = Updateable<UserTable>;
