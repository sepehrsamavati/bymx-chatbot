import * as PrismJS from "prismjs";

import 'prismjs/components/prism-markup-templating';

const loadLanguage = (language: string, callback: Function) => {
    if (PrismJS.languages[language]) { // Already loaded
        callback();
    } else { // Load the language if it's not already loaded

        // Load the language script from a CDN
        const script = document.createElement('script');
        script.src = `https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-${language}.min.js`;
        script.onload = () => {
            callback();
            // console.log(`${language} language loaded from CDN.`);
        };
        script.onerror = () => {
            console.error(`Failed to load ${language} language from CDN.`);
        };
        document.head.appendChild(script);
    }
};

export default loadLanguage;
