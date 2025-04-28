import { TextField } from "@mui/material";
import { useState } from "react";
import Button from "~/components/button";
import userService from "~/core/services/userService";
import { useSession } from "~/core/Session";

export default function Login() {
    const session = useSession();
    const [phoneNumber, setPhoneNumber] = useState<string>();
    const [otp, setOtp] = useState<string>();

    return <>
        <TextField
            label={"Phone number"}
            onChange={e => setPhoneNumber(e.target.value)}
        />
        <Button type="button" onClick={() => phoneNumber && userService.requestTelegramOtp(phoneNumber)}>{"Send"}</Button>
        <TextField
            label={session.uiText.otp}
            onChange={e => setOtp(e.target.value)}
        />
        <Button onClick={() => phoneNumber && otp && userService.telegramOtpAuth(phoneNumber, otp)}>{"Login"}</Button>
    </>;
}