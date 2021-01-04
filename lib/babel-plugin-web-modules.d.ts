export declare const useWebModulesPlugin: (config: any) => {
    resolveImports: (filename: any, parsedAst: any) => Promise<Map<any, any>>;
    rewriteImports: ({ types }: {
        types: any;
    }) => any;
};
