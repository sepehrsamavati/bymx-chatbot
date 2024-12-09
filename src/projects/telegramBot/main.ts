import CoreServices from "../core/Container.js";
import { UpdateProvider } from "./UpdateProvider.js";
import PaymentServices from "../staticPayment/Container.js";

const coreServices = new CoreServices();
const paymentServices = new PaymentServices();

new UpdateProvider(coreServices, paymentServices);
