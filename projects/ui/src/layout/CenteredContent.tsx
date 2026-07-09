import React from "react";
import Container from "@mui/material/Container";

export default function CenteredContent(props?: {
    children?: React.ReactNode;
}) {
    return (
        <Container
            maxWidth={false}
            disableGutters
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-around",
                position: "fixed",
                overflow: "auto",
                paddingBlock: 2,
                left: 0,
                top: 0,
            }}
        >{props?.children}</Container>
    );
}