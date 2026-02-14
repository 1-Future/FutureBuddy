declare module "sql.js" {
  interface Database {
    run(sql: string, params?: any[]): Database;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  interface Statement {
    bind(params?: any[]): boolean;
    step(): boolean;
    getAsObject(params?: any): Record<string, any>;
    free(): boolean;
    run(params?: any[]): void;
  }

  interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  interface SqlJsStatic {
    Database: {
      new (): Database;
      new (data: ArrayLike<number> | Buffer | null): Database;
    };
  }

  export type { Database, Statement, QueryExecResult, SqlJsStatic };

  export default function initSqlJs(config?: any): Promise<SqlJsStatic>;
}
