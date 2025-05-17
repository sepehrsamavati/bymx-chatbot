import Button from "~/components/button";
import colors from "~/core/config/colors";
import { useSession } from "~/core/Session";
import AutoFixHigh from "@mui/icons-material/AutoFixHigh";
import fluxSampleImage from "../assets/images/flux-sample.png";
import generativeAiService from "~/core/services/generativeAiService";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Card, CardActions, CardMedia, Chip, ImageList, ImageListItem, Stack, TextField, Typography } from "@mui/material";
import { stringHelper } from "bymx-core/shared";

export default function ImageGenerate() {
    const session = useSession();
    const initialized = useRef(false);
    const [prompt, setPrompt] = useState("");
    const [imageUrlToLoad, setImageUrlToLoad] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const isValid = useMemo(() => prompt.length >= 10 && prompt.length <= 500, [prompt]);
    const [imageGenerateCost, setImageGenerateCost] = useState<number>();

    const generateImage = useCallback(() => {
        setIsLoading(true);
        generativeAiService
            .fluxImageGenerate(prompt)
            .then(res => {
                if (res.result?.data) {
                    setImageUrlToLoad(`/api/v1/file/task?id=${res.result.data.id}`);
                } else {
                    session.snackbarProvider(res.result?.message, { variant: "error" });
                }
            })
            .finally(() => setIsLoading(false));
    }, [prompt, session]);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        generativeAiService
            .getImageGeneratePointUsage()
            .then(res => {
                if (typeof res.result?.data === "number")
                    setImageGenerateCost(res.result.data);
            });
    }, []);

    return (
        <Stack alignItems="center">
            <Stack direction="column" width="100%" maxWidth="700px" gap={1}>
                <Box margin={4}>
                    <Box textAlign="center" marginBottom={4}>
                        <Typography fontWeight="900">{session.uiText.createPicture}</Typography>
                        {typeof imageGenerateCost === "number" ? <Chip size="small" label={<>{session.uiText.pointUsage} {stringHelper.digitLocalization(imageGenerateCost, session.uiText._langCode)} ⚡</>} /> : null}
                    </Box>
                    <Box marginTop={3}>
                        <TextField
                            fullWidth
                            label={session.uiText.describeDesiredPicture}
                            variant="outlined"
                            value={prompt}
                            disabled={isLoading}
                            onChange={e => e.target.value.length <= 500 && setPrompt(e.target.value.trimStart())}
                        />
                    </Box>
                    <Typography fontSize="0.8em" fontStyle="italic" padding={1}>* {session.uiText.modelSupportsEnglishInputBetterHint}</Typography>

                    <Stack justifyContent="center" marginBlock={2}>
                        <Box margin="auto">
                            <Button onClick={generateImage} disabled={!isValid} loading={isLoading} size="large" color="success" variant="outlined" startIcon={<AutoFixHigh />}>
                                {session.uiText.generate}
                            </Button>
                        </Box>
                    </Stack>
                </Box>

                <Box padding={4} margin="auto">
                    <ImageList sx={{ width: "100%", maxWidth: "500px" }} cols={1}>
                        {imageUrlToLoad ? (
                            <ImageListItem>
                                <Card>
                                    <CardMedia component="img" src={imageUrlToLoad} />
                                </Card>
                            </ImageListItem>
                        ) : null}
                        <ImageListItem>
                            <Card>
                                <CardMedia component="img" src={fluxSampleImage} />
                                <CardActions sx={{ width: "100%", justifyContent: "center", position: "absolute", bottom: 0, direction: session.fixDirection("ltr") }}>
                                    <Chip size="small" sx={{ backdropFilter: "blur(10px)", boxShadow: "0 0 1em black", color: colors.antiFlashWhite }} label="panda eating stake in restaurant" />
                                </CardActions>
                            </Card>
                        </ImageListItem>
                    </ImageList>
                </Box>
            </Stack>
        </Stack>
    );
}