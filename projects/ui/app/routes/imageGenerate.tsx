import Button from "~/components/button";
import colors from "~/core/config/colors";
import { useNavigate } from "react-router";
import { useSession } from "~/core/Session";
import { stringHelper } from "bymx-core/shared";
import { LayoutInner } from "~/layout/layoutInner";
import AutoFixHigh from "@mui/icons-material/AutoFixHigh";
import fluxSampleImage from "../assets/images/flux-sample.webp";
import generativeAiService from "~/core/services/generativeAiService";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Card, CardActions, CardMedia, Chip, ImageList, ImageListItem, Stack, TextField, Typography, type SxProps, type Theme } from "@mui/material";

type GeneratedImage = { prompt: string; source: string; };

function ImageCard(props: GeneratedImage & { sx?: SxProps<Theme> }) {
    const session = useSession();
    return (
        <Card sx={props.sx}>
            <CardMedia component="img" src={props.source} />
            <CardActions sx={{ width: "100%", justifyContent: "center", position: "absolute", bottom: 0, direction: session.fixDirection("ltr") }}>
                <Chip size="small" sx={{ backdropFilter: "blur(10px)", boxShadow: "0 0 1em black", color: colors.antiFlashWhite }} label={props.prompt} />
            </CardActions>
        </Card>
    );
}

export default function ImageGenerate() {
    const session = useSession();
    const navigate = useNavigate();
    const initialized = useRef(false);
    const [prompt, setPrompt] = useState("");
    const [imageUrlToLoad, setImageUrlToLoad] = useState<GeneratedImage>();
    const [isLoading, setIsLoading] = useState(false);
    const [imageGenerateCost, setImageGenerateCost] = useState<number>();
    const isValid = useMemo(() => typeof imageGenerateCost === "number" && prompt.length >= 10 && prompt.length <= 500, [prompt, imageGenerateCost]);

    const generateImage = useCallback(() => {
        setIsLoading(true);
        generativeAiService
            .fluxImageGenerate(prompt)
            .then(res => {
                if (res.result?.data) {
                    setPrompt("");
                    setImageUrlToLoad({
                        prompt: prompt,
                        source: `/api/v1/file/task?id=${res.result.data.id}`,
                    });
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
                if (res.result?.ok && typeof res.result.data === "number")
                    setImageGenerateCost(res.result.data);
                else
                    navigate("/ui");
            });
    }, [navigate]);

    return (
        <LayoutInner topBar>
            <Box margin={4}>
                <Box textAlign="center">
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
                            <ImageCard prompt={imageUrlToLoad.prompt} source={imageUrlToLoad.source} />
                        </ImageListItem>
                    ) : null}
                    <ImageListItem>
                        <ImageCard prompt="panda eating stake in restaurant" source={fluxSampleImage} sx={{ marginTop: 8 }} />
                    </ImageListItem>
                </ImageList>
            </Box>
        </LayoutInner>
    );
}