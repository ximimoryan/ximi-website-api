import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { analyticsRouter } from "./endpoints/analytics/router";
import { AutoAnalyticsMiddleware } from "./endpoints/analytics/middleware";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// 创建自动埋点中间件实例
const autoAnalytics = new AutoAnalyticsMiddleware();

// 添加自动埋点中间件
app.use('*', async (c, next) => {
  const startTime = Date.now();
  await next();
  // 在响应发送后记录分析数据
  c.executionCtx.waitUntil(autoAnalytics.trackRequest(c, startTime));
});

app.onError((err, c) => {
  if (err instanceof ApiException) {
    // If it's a Chanfana ApiException, let Chanfana handle the response
    return c.json(
      { success: false, errors: err.buildResponse() },
      err.status as ContentfulStatusCode,
    );
  }

  console.error("Global error handler caught:", err); // Log the error if it's not known

  // For other errors, return a generic 500 response
  return c.json(
    {
      success: false,
      errors: [{ code: 7000, message: "Internal Server Error" }],
    },
    500,
  );
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
  docs_url: "/",
  schema: {
    info: {
      title: "My Awesome API",
      version: "2.0.0",
      description: "This is the documentation for my awesome API.",
    },
  },
});

// Register Analytics Sub router (只保留数据上报接口)
openapi.route("/analytics", analyticsRouter);

// Export the Hono app
export default app;
