declare namespace NodeJS {
  interface ProcessEnv {
    ZEROENTROPY_API_KEY: string;
    OPENAI_API_KEY: string;
    ZEROENTROPY_COLLECTION_NAME?: string;
    NODE_ENV: "development" | "production" | "test";
  }
}
