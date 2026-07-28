import type { DocPage } from "./content";

type Locale = "zh" | "en";

const envelopeExamples = `// Response<UserVo>
{
  "code": 200,
  "message": "操作成功",
  "data": { "id": "9223372036854775807", "name": "Ada" }
}

// Response<object> returned by Success("创建成功")
{
  "code": 200,
  "message": "创建成功",
  "data": null
}

// Response<UserVo> returned by NotFound<UserVo>(...)
{
  "code": 404,
  "message": "User was not found",
  "data": null
}`;

const controllerExamples = `[Route("api/users")]
public sealed class UsersController(
    AbsAsgardContext asgardContext,
    IUserService service)
    : BaseController(asgardContext)
{
    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(Response<UserVo>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Response<UserVo>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<Response<UserVo>>> GetAsync(long id)
    {
        var dto = await service.GetAsync(id);
        return dto is null
            ? NotFound<UserVo>("User was not found")
            : Success(new UserVo(dto.Id, dto.Name));
    }

    [HttpPost]
    public ActionResult<Response<object>> Create(CreateUserRequest request)
        => Success("创建成功");

    [HttpGet("literal")]
    public ActionResult<Response<string>> Literal()
        => Success<string>("literal data");
}`;

const pageResponseExample = `{
  "code": 200,
  "message": "操作成功",
  "data": [{ "id": "101", "name": "Ada" }],
  "dataCount": 1,
  "totalCount": 41,
  "page": 2,
  "size": 20,
  "totalPages": 3
}`;

const cursorResponseExample = `{
  "code": 200,
  "message": "操作成功",
  "data": [{ "id": "101", "name": "Ada" }],
  "dataCount": 1,
  "hasMore": true,
  "nextCursor": "opaque-cursor",
  "lastId": "101"
}`;

const exceptionMapping = `ArgumentException          -> HTTP/code 400, exception message
UnauthorizedAccessException -> HTTP/code 401, "未授权访问"
NotImplementedException      -> HTTP/code 501, "功能未实现"
all other exceptions         -> HTTP/code 500, "服务器内部错误"

Development environment:
all messages above are replaced with exception.Message + stack trace.`;

const middlewareWiring = `// PluginSdk fast path: already adds UseAsgardExceptionHandler.
await PluginWebAppDefaults.RunAsync<MyPlugin>("app.yaml");

// Full builder: opt in explicitly.
var builder = YggdrasilHost.CreateBuilder("app.yaml")
    .UseBuiltInPlugin<MyPlugin>()
    .ConfigureMiddleware(app =>
    {
        _ = app.UseAsgardExceptionHandler();
    });

var app = builder.Build();
await app.RunAsync();`;

const validationFactory = `builder.AfterServiceRegistration(services =>
{
    _ = services.Configure<ApiBehaviorOptions>(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var message = string.Join(
                "; ",
                context.ModelState.Values
                    .SelectMany(value => value.Errors)
                    .Select(error => error.ErrorMessage)
                    .Where(error => !string.IsNullOrWhiteSpace(error)));

            return new BadRequestObjectResult(
                Asgard.Abstractions.AspNetCore.Model.Response.Fail(
                    StatusCodes.Status400BadRequest,
                    string.IsNullOrWhiteSpace(message) ? "参数错误" : message));
        };
    });
});`;

const sectionIds = [
  "contract",
  "envelope",
  "success",
  "page",
  "cursor",
  "exceptions",
  "pipeline",
  "validation",
  "non-controller",
  "client-checklist",
] as const;

const makePage = (locale: Locale): DocPage => {
  const zh = locale === "zh";
  return {
    slug: "api-contracts-and-errors",
    group: zh ? "框架" : "Framework",
    eyebrow: "ASGARD 5.1.3 · HTTP CONTRACT",
    title: zh ? "统一响应、分页与异常合同" : "Response, pagination, and error contracts",
    description: zh
      ? "准确消费 Response、PageResponse 与 CursorResponse，并看清异常、模型校验、认证授权错误的真实边界。"
      : "Consume Response, PageResponse, and CursorResponse accurately while respecting the real boundaries around exceptions, validation, and auth failures.",
    relatedDocs: [
      { product: "asgard", docSlug: "api-development", label: zh ? "API 开发约定" : "API development conventions" },
      { product: "asgard", docSlug: "swagger-openapi", label: zh ? "Swagger 与 OpenAPI" : "Swagger and OpenAPI" },
      { product: "asgard", docSlug: "typescript-generation", label: zh ? "TypeScript 客户端生成" : "TypeScript client generation" },
    ],
    sections: [
      {
        id: sectionIds[0],
        title: zh ? "源码合同与适用范围" : "Source contract and scope",
        paragraphs: [
          zh
            ? "本页以 Asgard 5.1.3 clean source 的 BaseController、Response<T>、PageResponse<T>、CursorResponse<T>、AsgardExceptionHandlerMiddleware、PluginWebAppDefaults 与 Yggdrasil 中间件管线为准。"
            : "This page is contracted against BaseController, Response<T>, PageResponse<T>, CursorResponse<T>, AsgardExceptionHandlerMiddleware, PluginWebAppDefaults, and the Yggdrasil pipeline in clean Asgard 5.1.3 source.",
          zh
            ? "统一壳覆盖显式 Controller 返回和已接入的异常中间件，不自动改写路由 404、ApiController 模型校验 400、认证 Challenge、授权 Forbid 或已经开始写入的响应。客户端不能假设所有非 2xx 都具有 data 字段。"
            : "The envelope covers explicit controller results and exceptions observed by the wired middleware. It does not automatically rewrite routing 404s, ApiController validation 400s, authentication challenges, authorization forbids, or a response that has already started. Clients cannot assume every non-2xx body has data.",
        ],
      },
      {
        id: sectionIds[1],
        title: zh ? "基础响应壳" : "Base response envelope",
        paragraphs: [
          zh
            ? "ResponseBase 固定输出 code 与 message；Response<T> 再增加可空 data。BaseController 的 Success/Fail/BadRequest/NotFound/ServerError 同时设置真实 HTTP 状态和壳内 code，调用方应先按 HTTP 状态处理传输，再按 code/message 处理业务摘要。"
            : "ResponseBase always emits code and message; Response<T> adds nullable data. BaseController helpers set both the real HTTP status and the envelope code. Consumers should handle transport by HTTP status first, then use code and message as the business summary.",
          zh
            ? "框架没有 errorId、details、errors、traceId 或扩展字典字段。若产品需要稳定业务错误码，应在兼容演进设计后新增明确合同，不要把本地异常消息当可编程错误标识。"
            : "The shipped envelope has no errorId, details, errors, traceId, or extension dictionary. If a product needs stable business error identifiers, add an explicit compatibility contract rather than programming against localized exception messages.",
        ],
        code: { language: "json", value: envelopeExamples },
      },
      {
        id: sectionIds[2],
        title: zh ? "Success(string) 重载陷阱" : "The Success(string) overload trap",
        paragraphs: [
          zh
            ? "Success(\"创建成功\") 命中无数据重载，字符串成为 message，data 为 null。要把字符串作为业务数据返回，必须显式调用 Success<string>(\"literal data\")。这个差异同时影响 Action 返回类型和生成的 OpenAPI/TypeScript 合同。"
            : "Success(\"created\") selects the no-data overload: the string becomes message and data is null. To return a string as business data, call Success<string>(\"literal data\") explicitly. The distinction also changes the action type and generated OpenAPI/TypeScript contract.",
          zh
            ? "详情接口的 200 与 404 应保持 Response<同一 VO> 泛型；创建/删除等无数据操作返回 Response<object>。Controller 负责 DTO→VO 映射，Service 不返回 HTTP 壳。"
            : "Keep the same Response<VO> generic for 200 and 404 on a detail endpoint. Create/delete operations without data return Response<object>. Controllers own DTO-to-VO mapping; services do not return HTTP envelopes.",
        ],
        code: { language: "csharp", value: controllerExamples },
      },
      {
        id: sectionIds[3],
        title: zh ? "PageResponse 页码分页" : "PageResponse page-number pagination",
        paragraphs: [
          zh
            ? "SuccessPage(data,totalCount,page,size) 固定 code=200，dataCount 是当前批次数量，totalCount 是全量数量，page 从 1 开始，totalPages 按 ceiling(totalCount/size) 计算；totalCount=0 时 totalPages=0。"
            : "SuccessPage(data,totalCount,page,size) fixes code at 200. dataCount is the current batch size, totalCount is the full count, page starts at 1, and totalPages is ceiling(totalCount/size); totalCount=0 yields totalPages=0.",
          zh
            ? "构造器拒绝负 totalCount、page<1、size<1。仍应在进入 Service/Repository 前限制最大 size，并保证 count 与 page query 使用相同租户、过滤和删除条件，否则元数据会与 data 漂移。"
            : "The constructor rejects negative totalCount, page below 1, and size below 1. Enforce a maximum size before the service/repository and use identical tenant, filter, and deletion predicates for count and page queries, or metadata will drift from data.",
        ],
        code: { language: "json", value: pageResponseExample },
      },
      {
        id: sectionIds[4],
        title: zh ? "CursorResponse 游标分页" : "CursorResponse cursor pagination",
        paragraphs: [
          zh
            ? "SuccessCursor(data,hasMore,nextCursor,lastId) 不规定游标编码、排序或防篡改格式；它只包装当前批次与继续拉取提示。调用方必须把 nextCursor 当不透明字符串原样传回，不能从 lastId 自行推导下一页。"
            : "SuccessCursor(data,hasMore,nextCursor,lastId) does not define cursor encoding, ordering, or tamper protection; it only wraps the current batch and continuation hints. Clients must return nextCursor as an opaque string and must not derive the next page from lastId.",
          zh
            ? "服务端必须固定唯一稳定排序，在游标中绑定过滤/租户上下文，并只在 hasMore=true 时返回可继续使用的 nextCursor。CursorResponse 构造器只校验 data 非 null，不会替业务验证这些不变量。"
            : "The server must use a unique stable order, bind filter/tenant context into the cursor, and return a usable nextCursor only when hasMore is true. CursorResponse only rejects null data; it does not validate those business invariants.",
        ],
        code: { language: "json", value: cursorResponseExample },
      },
      {
        id: sectionIds[5],
        title: zh ? "未处理异常映射" : "Unhandled exception mapping",
        paragraphs: [
          zh
            ? "AsgardExceptionHandlerMiddleware 记录完整异常和 TraceIdentifier，然后按四类映射。生产环境的 ArgumentException message 会直接返回给客户端，因此参数异常文本不得包含 SQL、连接串、内部路径、Secret 或敏感业务值。"
            : "AsgardExceptionHandlerMiddleware logs the complete exception with TraceIdentifier, then applies four mappings. Production returns ArgumentException.message directly, so argument errors must never contain SQL, connection strings, internal paths, secrets, or sensitive business values.",
          zh
            ? "OperationCanceledException、超时异常、并发冲突和领域异常没有专属映射，当前会落入 500。不要仅靠抛异常表达 404/409/422；在 Controller 显式返回统一结果，或为产品设计经过测试的专用异常策略。"
            : "OperationCanceledException, timeouts, concurrency conflicts, and domain exceptions have no dedicated mapping and currently fall into 500. Do not communicate 404/409/422 solely by throwing; return an explicit controller result or design and test a product-specific exception policy.",
        ],
        code: { language: "text", value: exceptionMapping },
      },
      {
        id: sectionIds[6],
        title: zh ? "异常中间件的真实接线位置" : "The real exception-middleware position",
        paragraphs: [
          zh
            ? "PluginWebAppDefaults.RunAsync 会通过 UseRecommendedPluginDefaults 自动加入异常处理；直接使用 YggdrasilHost.CreateBuilder 不会自动加入，必须显式接线。"
            : "PluginWebAppDefaults.RunAsync adds exception handling through UseRecommendedPluginDefaults. Direct YggdrasilHost.CreateBuilder usage does not add it automatically and must opt in.",
          zh
            ? "当前 ConfigureMiddleware 回调发生在静态文件、Trace、Routing、CORS、限流、认证与租户中间件之后，因此这里注册的异常处理只能包住后续插件中间件、授权和 Controller，不能捕获前面阶段抛出的所有异常。Skill 中“管线最开始”是期望原则，不是 stock builder 当前能兑现的全局位置。需要真正全管线保护时必须扩展宿主的前置钩子并做集成测试。"
            : "ConfigureMiddleware currently runs after static files, tracing, routing, CORS, rate limiting, authentication, and tenancy. An exception handler registered there wraps later plugin middleware, authorization, and controllers, but not every earlier failure. The Skill's 'start of the pipeline' guidance is a desired principle, not a position the stock builder currently exposes. True whole-pipeline protection requires a host-level earlier hook and integration tests.",
        ],
        code: { language: "csharp", value: middlewareWiring },
      },
      {
        id: sectionIds[7],
        title: zh ? "ApiController 模型校验不是统一壳" : "ApiController validation is not the envelope",
        paragraphs: [
          zh
            ? "BaseController 自带 [ApiController]，因此绑定/DataAnnotations 失败会在 Action 前由 ASP.NET Core 自动返回 400。Asgard 5.1.3 没有配置 InvalidModelStateResponseFactory；默认响应不是 Response<object>，也不会经过 Controller helper 或异常中间件。"
            : "BaseController carries [ApiController], so binding/DataAnnotations failures return an automatic ASP.NET Core 400 before the action. Asgard 5.1.3 does not configure InvalidModelStateResponseFactory; the default body is not Response<object> and does not pass through controller helpers or the exception middleware.",
          zh
            ? "如果前端必须只消费一种 400 结构，应在 AfterServiceRegistration 显式设置全局 factory，并用真实缺字段、类型错误和多错误请求做 HTTP 测试。示例只给最小壳；生产还应设计本地化、字段错误结构与敏感值遮蔽。"
            : "If the frontend must consume one 400 shape, configure a global factory in AfterServiceRegistration and HTTP-test missing fields, type errors, and multiple failures. The snippet only preserves the minimum envelope; production still needs a localization, field-error, and redaction design.",
        ],
        code: { language: "csharp", value: validationFactory },
      },
      {
        id: sectionIds[8],
        title: zh ? "认证、授权、路由与框架端点" : "Authentication, authorization, routing, and framework endpoints",
        bullets: zh
          ? [
              "JWT Challenge 401 与 Authorization Forbid 403 由认证/授权中间件产生，当前 host.auth 事件只记录日志，不保证 Response<T> body",
              "没有匹配终结点的 404、405、静态文件与健康检查不经过 Controller helper；客户端必须允许空 body、ProblemDetails 或端点专用格式",
              "限流拒绝返回 429，并写固定文本 Too many requests. Please try again later.，不是统一 JSON 壳",
              "Swagger、OIDC Discovery/JWKS、文件、SSE 等协议/流式端点有自己的媒体类型，不应强行套 Response<T>",
              "统一前端拦截器先检查 Content-Type 与 HTTP status，再在 application/json 且存在 code/message 时按 Asgard 壳解析",
            ]
          : [
              "JWT challenge 401 and authorization forbid 403 come from authentication/authorization middleware. Current host.auth events log but do not guarantee a Response<T> body",
              "Unmatched 404, 405, static files, and health checks do not use controller helpers; clients must allow an empty body, ProblemDetails, or endpoint-specific shape",
              "Rate-limit rejection returns 429 with fixed text 'Too many requests. Please try again later.', not the JSON envelope",
              "Swagger, OIDC Discovery/JWKS, files, SSE, and other protocol/streaming endpoints have their own media types and must not be forced into Response<T>",
              "A shared frontend interceptor should inspect Content-Type and HTTP status first, then parse the Asgard envelope only when JSON contains code/message",
            ],
      },
      {
        id: sectionIds[9],
        title: zh ? "发布前客户端合同检查" : "Pre-release client contract checklist",
        bullets: zh
          ? [
              "为每个 Action 的 2xx/4xx/5xx 标注真实 ProducesResponseType；详情 200/404 保持同一 Response<VO>",
              "HTTP 状态与 body.code 一致；不要返回 HTTP 200 再把业务失败写成 code=500",
              "字符串数据显式 Success<string>；无数据成功才调用 Success(message)",
              "分页客户端使用 totalCount/totalPages，游标客户端只回传 nextCursor；两者不互相猜测",
              "long/ulong VO 字段显式应用 LongToStringConverter/ULongToStringConverter，避免 JavaScript 精度损失",
              "分别验收显式 400/401/403/404/409/429/500、模型校验 400、路由 404、认证 Challenge、授权 Forbid 与开发/生产异常差异",
              "生成 TsGen/OpenAPI 后 diff 公共类型和路由；前端不得手改生成目录中的 Response 基类",
            ]
          : [
              "Declare truthful ProducesResponseType metadata for every 2xx/4xx/5xx action result; keep the same Response<VO> for detail 200/404",
              "Keep HTTP status equal to body.code; never return HTTP 200 while placing a 500 business failure in the body",
              "Use explicit Success<string> for string data and reserve Success(message) for no-data success",
              "Page clients use totalCount/totalPages; cursor clients return nextCursor unchanged, without inferring one model from the other",
              "Apply LongToStringConverter/ULongToStringConverter explicitly to long/ulong VO fields that cross into JavaScript",
              "Test explicit 400/401/403/404/409/429/500, validation 400, routing 404, auth challenge, authorization forbid, and Development/Production exception differences separately",
              "Diff public types and routes after TsGen/OpenAPI generation; never hand-edit generated frontend Response base types",
            ],
      },
    ],
  };
};

export const zhApiContractDocs: DocPage[] = [makePage("zh")];
export const enApiContractDocs: DocPage[] = [makePage("en")];
