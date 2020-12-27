export declare function isBare(url: string): boolean;
export declare function relativePath(module: string): string;
export declare const nodeModuleBareUrl: typeof relativePath;
export declare function parsePathname(pathname: string): [string | null, string | null];
export declare const toPosix: (pathname: any) => any;
export declare function asyncTask<V>(fn: (id: string) => Promise<V>): (id: string) => Promise<V>;
