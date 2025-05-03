import mongoose from "mongoose";
import { aiChatModelDefinition } from "./AIChat.js";
import { langCodes } from "../../../../i18n/UIText.js";
import { aiVoices } from "../../../../types/enums/aiVoice.js";
import { UserType } from "../../../../types/enums/userTypes.js";
import { UserStatus } from "../../../../types/enums/userStatus.js";
import type { UserDBModel } from "../../../../types/entities/user.js";
import type { MongooseModelDefinition, MongoStored } from "../lib/model.type.js";
import { UserMode, userModeValues } from "../../../../types/enums/userMode.js";

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
	usage: {
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
	lastActivity: {
		type: Number,
		required: true,
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
	telegram: {
		id: {
			type: Number,
			required: true,
			unique: true
		},
		invite: {
			type: {
				by: {
					type: String,
					required: true,
				},
				used: {
					type: Boolean,
					required: true,
					default: false,
				},
			},
			required: false,
		},
		inviteCount: {
			type: Number,
			required: true,
			default: 0
		},
		mode: {
			type: Number,
			required: true,
			default: UserMode.General.Normal,
			enum: userModeValues
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
		selectedChat: {
			type: mongoose.Types.ObjectId,
			ref: aiChatModelDefinition.model,
			required: false
		},
		phoneNumber: {
			type: String,
			required: false
		},
	},
	voiceResponse: {
		on: {
			type: Boolean,
			required: true,
		},
		type: {
			type: String,
			required: true,
			enum: aiVoices,
		},
		languagePrompt: {
			type: String,
			required: false,
		},
		// required: true,
	},
}, { versionKey: false, collection: userModelDefinition.collection });
