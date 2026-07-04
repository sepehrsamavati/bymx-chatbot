import { useEffect } from "react";
import type Session from "~/core/Session";

export function usePrismTheme(session: Session) {
    useEffect(() => {
        if (session.themeManager.name === "light")
            import("prismjs/themes/prism.min.css");
        else
            import("prismjs/themes/prism-okaidia.min.css");
    }, [session.themeManager.name]);
}

export function useChatBootstrap(chatId: string | undefined, getMessages: () => void) {
    useEffect(() => {
        if (chatId)
            getMessages();
    }, [chatId]); // eslint-disable-line react-hooks/exhaustive-deps
}
