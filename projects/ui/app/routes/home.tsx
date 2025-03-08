import MainLayout from "~/layout/main";
import type { Route } from "./+types/home";
import Chat from "@mui/icons-material/Chat";
import { Box, Card, Container, Grid, Stack, Typography } from "@mui/material";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

function SquareButton(props?: {
  icon?: React.ReactNode;
  caption?: string;
  onClick?: () => void;
}) {
  return (
    <Box
      onClick={props?.onClick}
      sx={{ cursor: 'pointer' }}
    >
      <Card>
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
      </Card>
    </Box>
  );
}

export default function Home() {
  return (
    <Box padding={3} marginTop="20vh">
      <Grid container>
        <Grid padding={3} size={{ xs: 6, md: 4 }} component="div">
          <SquareButton icon={<Chat />} caption="Chats" />
        </Grid>
      </Grid>
    </Box>
  );
}
