import service from "./llm";
import "dotenv/config";

test("test", async () => {
  await service.test();
}, 30000);
