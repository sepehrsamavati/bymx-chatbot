import type mongoose from "mongoose";
import { planModelDefinition } from "../models/Plan.js";
import { userModelDefinition } from "../models/User.js";
import { openAIChatModelDefinition } from "../models/OpenAIChat.js";
import { openAIModelModelDefinition } from "../models/OpenAIModel.js";
import { userTempFileModelDefinition } from "../models/UserTempFile.js";
import { openAIMessageModelDefinition } from "../models/OpenAIMessage.js";
import { userSubscriptionModelDefinition } from "../models/UserSubscription.js";
import { telegramBroadcastModelDefinition } from "../models/TelegramBroadcast.js";
import { userSubscriptionUsageModelDefinition } from "../models/UserSubscriptionUsage.js";
import { telegramJoinRequiredChatModelDefinition } from "../models/TelegramJoinRequiredChat.js";

export default class MongooseModels {
    readonly models;

    constructor(private connection: mongoose.Connection) {
        this.models = Object.freeze({
            user: userModelDefinition.createModel(this.connection),
            userSubscription: userSubscriptionModelDefinition.createModel(this.connection),
            userSubscriptionUsage: userSubscriptionUsageModelDefinition.createModel(this.connection),
            openAIModel: openAIModelModelDefinition.createModel(this.connection),
            plan: planModelDefinition.createModel(this.connection),
            openAIChat: openAIChatModelDefinition.createModel(this.connection),
            openAIMessage: openAIMessageModelDefinition.createModel(this.connection),
            userTempFile: userTempFileModelDefinition.createModel(this.connection),
            telegramBroadcast: telegramBroadcastModelDefinition.createModel(this.connection),
            telegramJoinRequiredChat: telegramJoinRequiredChatModelDefinition.createModel(this.connection),
        });
    }
}
