import CoreServices from "../core/Container.js";
import { UpdateProvider } from "./UpdateProvider.js";

const services = new CoreServices();

new UpdateProvider(services);
