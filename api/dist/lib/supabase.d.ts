export declare const db: {
    from(table: string): Promise<{
        select: (columns?: string) => {
            eq: (column: string, value: any) => {
                single: () => Promise<{
                    data: any;
                    error: any;
                } | {
                    data: any;
                    error: {
                        message: any;
                    };
                }>;
                execute(): Promise<{
                    data: any[];
                    error: any;
                } | {
                    data: any;
                    error: {
                        message: any;
                    };
                }>;
            };
            execute(): Promise<{
                data: any[];
                error: any;
            } | {
                data: any;
                error: {
                    message: any;
                };
            }>;
        };
        insert: (data: any | any[]) => {
            select: (columns?: string) => {
                execute(): Promise<{
                    data: any[];
                    error: any;
                } | {
                    data: any;
                    error: {
                        message: any;
                    };
                }>;
            };
            execute(): Promise<{
                data: any[];
                error: any;
            } | {
                data: any;
                error: {
                    message: any;
                };
            }>;
        };
        update: (data: any) => {
            eq: (column: string, value: any) => {
                select: (columns?: string) => {
                    execute(): Promise<{
                        data: any[];
                        error: any;
                    } | {
                        data: any;
                        error: {
                            message: any;
                        };
                    }>;
                };
            };
        };
        delete: () => {
            eq: (column: string, value: any) => {
                execute(): Promise<{
                    data: any[];
                    error: any;
                } | {
                    data: any;
                    error: {
                        message: any;
                    };
                }>;
            };
        };
    }>;
};
export declare const supabase: {
    from(table: string): Promise<{
        select: (columns?: string) => {
            eq: (column: string, value: any) => {
                single: () => Promise<{
                    data: any;
                    error: any;
                } | {
                    data: any;
                    error: {
                        message: any;
                    };
                }>;
                execute(): Promise<{
                    data: any[];
                    error: any;
                } | {
                    data: any;
                    error: {
                        message: any;
                    };
                }>;
            };
            execute(): Promise<{
                data: any[];
                error: any;
            } | {
                data: any;
                error: {
                    message: any;
                };
            }>;
        };
        insert: (data: any | any[]) => {
            select: (columns?: string) => {
                execute(): Promise<{
                    data: any[];
                    error: any;
                } | {
                    data: any;
                    error: {
                        message: any;
                    };
                }>;
            };
            execute(): Promise<{
                data: any[];
                error: any;
            } | {
                data: any;
                error: {
                    message: any;
                };
            }>;
        };
        update: (data: any) => {
            eq: (column: string, value: any) => {
                select: (columns?: string) => {
                    execute(): Promise<{
                        data: any[];
                        error: any;
                    } | {
                        data: any;
                        error: {
                            message: any;
                        };
                    }>;
                };
            };
        };
        delete: () => {
            eq: (column: string, value: any) => {
                execute(): Promise<{
                    data: any[];
                    error: any;
                } | {
                    data: any;
                    error: {
                        message: any;
                    };
                }>;
            };
        };
    }>;
};
export default db;
//# sourceMappingURL=supabase.d.ts.map