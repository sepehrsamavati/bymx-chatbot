export function convertToTelegramMarkdown(mdText: string) {
    // Convert standard Markdown to Telegram MarkdownV2
    let telegramMd = mdText
        .replace(/(?<!\*)\*(?!\*)/g, '\\*')
        .replace(/\*\*(.*?)\*\*/g, '*$1*') // Bold
        .replace(/__(.*?)__/g, '__$1__') // Underline
        .replace(/~~(.*?)~~/g, '~$1~') // Strikethrough
        .replace(/`(.*?)`/g, '`$1`') // Inline code
        .replace(/\[(.*?)\]\((.*?)\)/g, '[$1]($2)') // Links
        .replace(/```(.*?)```/gs, '```\n$1\n```'); // Preformatted code block

    // Escape necessary characters
    // const escapeChars = /([_*[\]()~`>#+\-=|{}.!])/g;
    // telegramMd = telegramMd.replace(escapeChars, '\\$1');

    return telegramMd;
}
