declare module '*.scss?inline' {
    const content: string;
    export default content;
}

declare module '*.html?raw' {
    const content: string;
    export default content;
}