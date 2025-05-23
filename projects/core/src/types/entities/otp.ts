export type OTP = {
    scope: string;
    date: number;
    key: string;
    code: string;
}

export type ExpirableOTP = OTP & {
    _expiry: number;
}
