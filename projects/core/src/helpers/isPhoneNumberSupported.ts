/** Does this phone number can have daily free points or not?! */
const isPhoneNumberSupported = (phoneNumber?: string) => phoneNumber ? (phoneNumber.startsWith("98") || phoneNumber.startsWith("+98")) : false;

export default isPhoneNumberSupported;
