// import type { Route } from "./+types/home";
import { useNavigate } from "react-router";
import Chat from "@mui/icons-material/Chat";
import { useSession } from "~/core/Session";
import { Box, Card, Grid, Stack, Typography } from "@mui/material";

// export function meta({ }: Route.MetaArgs) {
//   return [
//     { title: "New React Router App" },
//     { name: "description", content: "Welcome to React Router!" },
//   ];
// }

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
  const navigate = useNavigate();
  const session = useSession();

  return (
    <Box padding={3} marginTop="20vh">
      <Grid container justifyContent="center">
        <Grid padding={3} size={{ xs: 6, md: 4 }} component="div">
          <SquareButton onClick={() => navigate("./ui/chats")} icon={<Chat />} caption={session.uiText.chats} />
        </Grid>
      </Grid>
    </Box>
  );
}
