import mongoose from "mongoose";
import { UserTier } from "../../../../../../types/enums/userTier.js";
import { UserType } from "../../../../../../types/enums/userTypes.js";
import { UserStatus } from "../../../../../../types/enums/userStatus.js";
import type { UserDBModel } from "../../../../../../types/entities/user.js";
import type { MongooseModelDefinition, MongoStored } from "../lib/model.type.js";

export const userModelDefinition: MongooseModelDefinition<"users", "User", MongoStored<UserDBModel>> = Object.freeze({
	model: "User",
	collection: "users",
	createModel: con => con.models[userModelDefinition.model] || con.model(userModelDefinition.model, schema)
});

const schema = new mongoose.Schema<MongoStored<UserDBModel>>({
	insertDate: {
		type: Date,
		required: true
	},
	isDeleted: {
		type: Boolean,
		required: true,
		default: false
	},
	tgId: {
		type: Number,
		required: true,
		unique: true
	},
	usage: {
		type: Number,
		required: true,
		default: 0
	},
	lastActivity: {
		type: Number,
		required: true,
	},
	firstName: {
		type: String,
		required: false
	},
	lastName: {
		type: String,
		required: false
	},
	username: {
		type: String,
		required: false,
		index: true
	},
	status: {
		type: Number,
		enum: UserStatus,
		required: true
	},
	type: {
		type: Number,
		enum: UserType,
		required: true,
		default: UserType.Normal
	},
	tier: {
		type: Number,
		enum: UserTier,
		required: true,
		default: UserTier.Free
	}
}, { versionKey: false, collection: userModelDefinition.collection });
