import Button from "~/components/button";
import { useNavigate } from "react-router";
import { useSession } from "~/core/Session";
import { stringHelper } from "bymx-core/shared";
import { LayoutInner } from "~/layout/layoutInner";
import { useEffect, useRef, useState } from "react";
import AccountCircle from "@mui/icons-material/AccountCircle";
import fluxSampleImage from "../assets/images/flux-sample.png";
import generativeAiService from "~/core/services/generativeAiService";
import { Box, Card, CardActions, CardMedia, Chip, Grid, Stack } from "@mui/material";

export default function Chats() {
    const navigate = useNavigate();
    const session = useSession();
    const initialized = useRef(false);
    const [imageGenerateCost, setImageGenerateCost] = useState<number>();

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        generativeAiService
            .getImageGeneratePointUsage()
            .then(res => {
                if (typeof res.result?.data === "number")
                    setImageGenerateCost(res.result.data);
            });
    }, [session]);

    return (
        <LayoutInner>
            <Box marginTop={10} />

            <Stack marginBlock={4} direction="column" alignItems="center" justifyContent="center">
                <Button size="large" variant="outlined" color="inherit" sx={{ borderRadius: "10em" }} startIcon={<AccountCircle />} onClick={() => session.requestSideMenuOpen?.()}>{session.uiText.profile}</Button>
            </Stack>

            <Grid container paddingInline={8} marginBottom={4} justifyContent="center">
                {typeof imageGenerateCost === "number" ? (
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Card onClick={() => navigate("/ui/imageGenerate")} sx={{ cursor: "pointer" }}>
                            <CardMedia component="img" src={fluxSampleImage} />
                            <CardActions>
                                <Stack sx={{ width: "100%" }} direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between">
                                    <Button onClick={() => navigate("/ui/imageGenerate")} size="small" variant="text" color="warning">{session.uiText.createPicture}</Button>
                                    <Chip size="small" label={<>{stringHelper.digitLocalization(imageGenerateCost, session.uiText._langCode)} ⚡</>} />
                                </Stack>
                            </CardActions>
                        </Card>
                    </Grid>
                ) : null}
            </Grid>
        </LayoutInner>
    );
}