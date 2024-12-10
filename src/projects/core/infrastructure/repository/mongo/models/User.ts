import mongoose from "mongoose";
import { langCodes } from "../../../../i18n/UIText.js";
import { openAIChatModelDefinition } from "./OpenAIChat.js";
import { UserType } from "../../../../../../types/enums/userTypes.js";
import { UserStatus } from "../../../../../../types/enums/userStatus.js";
import type { UserDBModel } from "../../../../../../types/entities/user.js";
import type { MongooseModelDefinition, MongoStored } from "../lib/model.type.js";
import { UserMode, userModeValues } from "../../../../../../types/enums/userMode.js";

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
	inviteCount: {
		type: Number,
		required: true,
		default: 0
	},
	memoryAmount: {
		type: Number,
		required: true,
		default: 0,
		max: 100
	},
	saveMessages: {
		type: Boolean,
		required: true,
		default: false
	},
	mode: {
		type: Number,
		required: true,
		default: UserMode.General.Normal,
		enum: userModeValues
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
	lang: {
		type: String,
		enum: langCodes,
		required: true
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
	selectedChat: {
		type: mongoose.Types.ObjectId,
		ref: openAIChatModelDefinition.model,
		required: false
	},
	phoneNumber: {
		type: String,
		required: false
	},
	invite: {
		type: {
			by: {
				type: String,
				required: true,
			},
			used: {
				type: Number,
				required: true,
				default: false,
			},
		},
		required: false,
	},
}, { versionKey: false, collection: userModelDefinition.collection });
