import { UpdateProvider } from "./UpdateProvider.js";
import { CoreServices, PaymentServices } from "bymx-core/server";

const coreServices = new CoreServices();
const paymentServices = new PaymentServices();

new UpdateProvider(coreServices, paymentServices);
