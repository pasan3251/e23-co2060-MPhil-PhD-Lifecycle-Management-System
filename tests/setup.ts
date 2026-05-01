const testEnv = process.env as Record<string, string | undefined>;

testEnv.NODE_ENV = testEnv.NODE_ENV ?? "test";
