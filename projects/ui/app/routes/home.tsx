import MainLayout from "~/layout/main";
import type { Route } from "./+types/home";
import Chat from "@mui/icons-material/Chat";
import { Box, Container, Grid, Stack, Typography } from "@mui/material";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

function SquareButton(props?: {
  icon?: React.ReactNode;
  caption?: string;
}) {
  return (
    <Box
      padding={3}
      sx={{
        aspectRatio: "1/1",
        width: "100%",
      }}
    >
      <Stack direction="column" alignItems="center" justifyContent="space-evenly" height="100%">
        {props?.icon}
        <br />
        <Typography>{props?.caption}</Typography>
      </Stack>
    </Box>
  );
}

export default function Home() {
  return (
    <Box padding={3} marginTop="20vh">
      <Grid container gap={1}>
        <Grid size={{ xs: 6, md: 4 }} component="div">
          <SquareButton icon={<Chat />} caption="Chats" />
        </Grid>
      </Grid>
    </Box>
  );
}
