import mongoose from "mongoose";
import type { MongooseModelDefinition } from "../lib/model.type.js";
import { UserTier } from "../../../../../../types/enums/userTier.js";
import { UserType } from "../../../../../../types/enums/userTypes.js";
import { UserStatus } from "../../../../../../types/enums/userStatus.js";
import type { UserDBModel } from "../../../../../../types/entities/user.js";

export const userModelDefinition: MongooseModelDefinition<"users", "User", UserDBModel> = Object.freeze({
	model: "User",
	collection: "users",
	createModel: con => con.models[userModelDefinition.model] || con.model(userModelDefinition.model, schema)
});

const schema = new mongoose.Schema<UserDBModel>({
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
