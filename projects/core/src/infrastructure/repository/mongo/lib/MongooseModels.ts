import type mongoose from "mongoose";
import { planModelDefinition } from "../models/Plan.js";
import { userModelDefinition } from "../models/User.js";
import { promptModelDefinition } from "../models/Prompt.js";
import { aiChatModelDefinition } from "../models/AIChat.js";
import { aiModelModelDefinition } from "../models/AIModel.js";
import { userTempFileModelDefinition } from "../models/UserTempFile.js";
import { metadataStoreModelDefinition } from "../models/MetadataStore.js";
import { generationTaskModelDefinition } from "../models/GenerationTask.js";
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
            aiChat: aiChatModelDefinition.createModel(this.connection),
            aiModel: aiModelModelDefinition.createModel(this.connection),
            plan: planModelDefinition.createModel(this.connection),
            prompt: promptModelDefinition.createModel(this.connection),
            userTempFile: userTempFileModelDefinition.createModel(this.connection),
            generationTask: generationTaskModelDefinition.createModel(this.connection),
            metadataStore: metadataStoreModelDefinition.createModel(this.connection),
            telegramBroadcast: telegramBroadcastModelDefinition.createModel(this.connection),
            telegramJoinRequiredChat: telegramJoinRequiredChatModelDefinition.createModel(this.connection),
        });
    }
}
