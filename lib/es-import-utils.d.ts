export declare function isBare(url: string): boolean;
declare function modulePathname(pathname: string): string;
export declare const bareNodeModule: typeof modulePathname;
export declare function parsePathname(pathname: string): [string | null, string | null];
export declare const toPosix: (pathname: any) => any;
export {};
