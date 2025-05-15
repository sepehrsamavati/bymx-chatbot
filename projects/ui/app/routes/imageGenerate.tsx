import { useSession } from "~/core/Session";
import { useCallback, useMemo, useState } from "react";
import fluxSampleImage from "../assets/images/flux-sample.png";
import generativeAiService from "~/core/services/generativeAiService";
import { Box, Card, CardActions, CardMedia, Chip, ImageList, ImageListItem, Stack, TextField, Typography } from "@mui/material";

export default function ImageGenerate() {
    const session = useSession();
    const [prompt, setPrompt] = useState("");
    const [imageUrlToLoad, setImageUrlToLoad] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const isValid = useMemo(() => prompt.length >= 10 && prompt.length <= 500, [prompt]);

    const generateImage = useCallback(() => {
        setIsLoading(true);
        generativeAiService
            .fluxImageGenerate(prompt)
            .then(res => {
                if(res.result?.data) {
                    setImageUrlToLoad(`/api/v1/file/task?id=${res.result.data.id}`);
                } else {
                    session.snackbarProvider(res.result?.message, { variant: "error" });
                }
            });
    }, [prompt, session]);

    return (
        <Stack alignItems="center">
            <Stack direction="column" width="100%" maxWidth="700px" gap={1}>
                <Box margin={4}>
                    <Typography textAlign="center" fontWeight="900" marginBottom={5}>{session.uiText.createPicture}</Typography>
                    <Box marginTop={3}>
                        <TextField
                            fullWidth
                            label={session.uiText.describeDesiredPicture}
                            variant="outlined"
                            value={prompt}
                            disabled={isLoading}
                            onChange={e => e.target.value.length <= 500 && setPrompt(e.target.value.trim())}
                        />
                    </Box>
                    <Typography fontSize="0.8em" fontStyle="italic">* {session.uiText.modelSupportsEnglishInputBetterHint}</Typography>
                </Box>

                <Box padding={4} margin="auto">
                    <ImageList sx={{ width: "100%", maxWidth: "500px" }} cols={1}>
                        <ImageListItem>
                            <Card>
                                <CardMedia component="img" src={fluxSampleImage} />
                                <CardActions sx={{ width: "100%", justifyContent: "center", position: "absolute", bottom: 0, direction: session.fixDirection("ltr") }}>
                                    <Chip size="small" color="success" label="panda eating stake in restaurant" />
                                </CardActions>
                            </Card>
                        </ImageListItem>
                    </ImageList>
                </Box>
            </Stack>
        </Stack>
    );
}