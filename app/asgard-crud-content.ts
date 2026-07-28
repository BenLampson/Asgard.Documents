import type { DocPage } from "./content";

type Locale = "zh" | "en";

const layoutCode = `MyApp.Plugin/
  Controllers/CitiesController.cs
  Domains/IRepositories/ICityRepository.cs
  Domains/Repositories/CityRepository.cs
  Models/DTO/CityDto.cs
  Models/DTO/CreateCityInput.cs
  Models/DTO/UpdateCityInput.cs
  Models/Entities/City.cs
  Models/VO/CityVo.cs
  Models/VO/CreateCityRequest.cs
  Models/VO/UpdateCityRequest.cs
  Mapper/CityMappings.cs
  Services/IServices/ICityService.cs
  Services/Services/CityService.cs

dependency direction
HTTP -> Controller -> Service -> Repository -> Entity
                       DTO <- Service
HTTP <- Response<VO> <- Controller maps DTO to VO`;

const entityCode = `// Models/Entities/City.cs — one top-level type in this file
[Table(Name = "city")]
public sealed class City : AbsAsgardTenantEntity
{
    [Column(Name = "name", StringLength = 128, IsNullable = false)]
    public string Name { get; private set; } = string.Empty;

    public static City Create(string tenantId, string name, string actor)
    {
        var entity = new City
        {
            Name = NormalizeName(name),
            CreateBy = actor,
            UpdateBy = actor,
        };
        entity.SetTenantInfo(tenantId);
        return entity;
    }

    public void Rename(string name, string actor)
    {
        Name = NormalizeName(name);
        UpdateBy = actor;
        MarkAsUpdated();
    }

    public void SoftDelete(string actor)
    {
        UpdateBy = actor;
        MarkAsDeleted();
    }

    private static string NormalizeName(string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value);
        var result = value.Trim();
        return result.Length <= 128
            ? result
            : throw new ArgumentOutOfRangeException(nameof(value));
    }
}`;

const repositoryContractCode = `// Domains/IRepositories/ICityRepository.cs
public interface ICityRepository
{
    Task<City?> GetActiveAsync(string id, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<City> Items, long TotalCount)> PageActiveAsync(
        int page,
        int size,
        CancellationToken cancellationToken = default);
    Task<City> InsertAsync(City entity, CancellationToken cancellationToken = default);
    Task<int> UpdateAsync(City entity, CancellationToken cancellationToken = default);
}`;

const repositoryCode = `// Domains/Repositories/CityRepository.cs
[Repository]
public sealed class CityRepository(
    IFreeSql fsql,
    IMultiLevelCache cache,
    ILogger<CityRepository> logger,
    IAsgardRepositoryContext repositoryContext)
    : AbsAsgardRepositoryBase<City, string>(
        fsql,
        cache,
        logger,
        repositoryContext),
      ICityRepository
{
    public async Task<City?> GetActiveAsync(
        string id,
        CancellationToken cancellationToken = default)
    {
        return await Select
            .Where(city => city.Id == id && !city.Deleted)
            .FirstAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<City> Items, long TotalCount)> PageActiveAsync(
        int page,
        int size,
        CancellationToken cancellationToken = default)
    {
        var select = Select.Where(city => !city.Deleted);
        var totalCount = await select.CountAsync(cancellationToken);
        var items = await select
            .OrderByDescending(city => city.CreateTime)
            .Page(page, size)
            .ToListAsync(cancellationToken);
        return (items, totalCount);
    }
}`;

const contractsCode = `// Models/DTO/CityDto.cs
public sealed record CityDto(
    string Id,
    string Name,
    int Version,
    DateTime CreateTime,
    DateTime? UpdateTime);

// Models/DTO/CreateCityInput.cs
public sealed record CreateCityInput(string Name);

// Models/DTO/UpdateCityInput.cs
public sealed record UpdateCityInput(string Name, int ExpectedVersion);

// Models/VO/CityVo.cs
public sealed record CityVo(
    string Id,
    string Name,
    int Version,
    DateTime CreateTime,
    DateTime? UpdateTime);

// Models/VO/CreateCityRequest.cs
public sealed record CreateCityRequest(string Name);

// Models/VO/UpdateCityRequest.cs
public sealed record UpdateCityRequest(string Name, int ExpectedVersion);

// Mapper/CityMappings.cs — explicit code, not an automatic mapper
public static class CityMappings
{
    public static CityVo ToVo(CityDto dto) => new(
        dto.Id,
        dto.Name,
        dto.Version,
        dto.CreateTime,
        dto.UpdateTime);
}`;

const serviceContractCode = `// Models/DTO/CityMutationStatus.cs
public enum CityMutationStatus
{
    Success,
    NotFound,
    Conflict,
}

// Models/DTO/CityMutationResult.cs
public sealed record CityMutationResult(
    CityMutationStatus Status,
    CityDto? City = null);

// Services/IServices/ICityService.cs
public interface ICityService
{
    Task<CityDto?> GetAsync(Guid tenantId, string id, CancellationToken cancellationToken);
    Task<(IReadOnlyList<CityDto> Items, long TotalCount)> PageAsync(
        Guid tenantId, int page, int size, CancellationToken cancellationToken);
    Task<CityDto> CreateAsync(
        Guid tenantId, CreateCityInput input, CancellationToken cancellationToken);
    Task<CityMutationResult> UpdateAsync(
        Guid tenantId, string id, UpdateCityInput input, CancellationToken cancellationToken);
    Task<CityMutationStatus> DeleteAsync(
        Guid tenantId, string id, int expectedVersion, CancellationToken cancellationToken);
}`;

const serviceCode = `// Services/Services/CityService.cs
[Service]
public sealed class CityService(
    ICityRepository repository,
    AbsAsgardContext asgardContext) : ICityService
{
    public async Task<CityDto?> GetAsync(
        Guid tenantId, string id, CancellationToken cancellationToken)
    {
        RequireActor(tenantId);
        var entity = await repository.GetActiveAsync(id, cancellationToken);
        return entity is null ? null : ToDto(entity);
    }

    public async Task<(IReadOnlyList<CityDto> Items, long TotalCount)> PageAsync(
        Guid tenantId, int page, int size, CancellationToken cancellationToken)
    {
        RequireActor(tenantId);
        ArgumentOutOfRangeException.ThrowIfLessThan(page, 1);
        ArgumentOutOfRangeException.ThrowIfLessThan(size, 1);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(size, 100);
        var result = await repository.PageActiveAsync(page, size, cancellationToken);
        return (result.Items.Select(ToDto).ToArray(), result.TotalCount);
    }

    public async Task<CityDto> CreateAsync(
        Guid tenantId, CreateCityInput input, CancellationToken cancellationToken)
    {
        var actor = RequireActor(tenantId);
        var entity = City.Create(tenantId.ToString(), input.Name, actor);
        return ToDto(await repository.InsertAsync(entity, cancellationToken));
    }

    public async Task<CityMutationResult> UpdateAsync(
        Guid tenantId,
        string id,
        UpdateCityInput input,
        CancellationToken cancellationToken)
    {
        var actor = RequireActor(tenantId);
        var entity = await repository.GetActiveAsync(id, cancellationToken);
        if (entity is null) return new(CityMutationStatus.NotFound);
        if (entity.Version != input.ExpectedVersion)
            return new(CityMutationStatus.Conflict);

        entity.Rename(input.Name, actor);
        var affected = await repository.UpdateAsync(entity, cancellationToken);
        return affected == 1
            ? new(CityMutationStatus.Success, ToDto(entity))
            : new(CityMutationStatus.Conflict);
    }

    public async Task<CityMutationStatus> DeleteAsync(
        Guid tenantId,
        string id,
        int expectedVersion,
        CancellationToken cancellationToken)
    {
        var actor = RequireActor(tenantId);
        var entity = await repository.GetActiveAsync(id, cancellationToken);
        if (entity is null) return CityMutationStatus.NotFound;
        if (entity.Version != expectedVersion) return CityMutationStatus.Conflict;

        entity.SoftDelete(actor);
        return await repository.UpdateAsync(entity, cancellationToken) == 1
            ? CityMutationStatus.Success
            : CityMutationStatus.Conflict;
    }

    private string RequireActor(Guid routeTenantId)
    {
        var user = asgardContext.IdentityContext?.UserInfo;
        if (!Guid.TryParse(user?.TenantId, out var currentTenantId))
            throw new UnauthorizedAccessException("Tenant identity is required.");
        if (currentTenantId != routeTenantId)
            throw new UnauthorizedAccessException("Cross-tenant access is forbidden.");
        return !string.IsNullOrWhiteSpace(user?.UserId)
            ? user.UserId
            : throw new UnauthorizedAccessException("User identity is required.");
    }

    private static CityDto ToDto(City entity) => new(
        entity.Id,
        entity.Name,
        entity.Version,
        entity.CreateTime,
        entity.UpdateTime);
}`;

const controllerCode = `// Controllers/CitiesController.cs
[Authorize]
[Route("api/tenants/{tenantId:guid}/cities")]
public sealed class CitiesController(
    AbsAsgardContext asgardContext,
    ICityService service) : BaseController(asgardContext)
{
    [HttpGet("{id}")]
    public async Task<ActionResult<Response<CityVo>>> GetAsync(
        Guid tenantId, string id, CancellationToken cancellationToken)
    {
        if (!OwnsTenant(tenantId))
            return Fail<CityVo>(StatusCodes.Status403Forbidden, "Cross-tenant access is forbidden.");

        var dto = await service.GetAsync(tenantId, id, cancellationToken);
        return dto is null
            ? NotFound<CityVo>("City not found.")
            : Success(CityMappings.ToVo(dto));
    }

    [HttpGet]
    public async Task<ActionResult<PageResponse<CityVo>>> PageAsync(
        Guid tenantId,
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        CancellationToken cancellationToken = default)
    {
        if (!OwnsTenant(tenantId))
            return StatusCode(
                StatusCodes.Status403Forbidden,
                Response.Fail(StatusCodes.Status403Forbidden, "Cross-tenant access is forbidden."));

        var result = await service.PageAsync(tenantId, page, size, cancellationToken);
        return SuccessPage(
            result.Items.Select(CityMappings.ToVo).ToArray(),
            result.TotalCount,
            page,
            size);
    }

    [HttpPost]
    public async Task<ActionResult<Response<CityVo>>> CreateAsync(
        Guid tenantId,
        CreateCityRequest request,
        CancellationToken cancellationToken)
    {
        if (!OwnsTenant(tenantId))
            return Fail<CityVo>(StatusCodes.Status403Forbidden, "Cross-tenant access is forbidden.");

        var dto = await service.CreateAsync(
            tenantId,
            new CreateCityInput(request.Name),
            cancellationToken);
        return Success(CityMappings.ToVo(dto));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Response<CityVo>>> UpdateAsync(
        Guid tenantId,
        string id,
        UpdateCityRequest request,
        CancellationToken cancellationToken)
    {
        if (!OwnsTenant(tenantId))
            return Fail<CityVo>(StatusCodes.Status403Forbidden, "Cross-tenant access is forbidden.");

        var result = await service.UpdateAsync(
            tenantId,
            id,
            new UpdateCityInput(request.Name, request.ExpectedVersion),
            cancellationToken);
        return result.Status switch
        {
            CityMutationStatus.Success => Success(CityMappings.ToVo(result.City!)),
            CityMutationStatus.NotFound => NotFound<CityVo>("City not found."),
            _ => Fail<CityVo>(StatusCodes.Status409Conflict, "City changed; reload and retry."),
        };
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<Response<object>>> DeleteAsync(
        Guid tenantId,
        string id,
        [FromQuery] int expectedVersion,
        CancellationToken cancellationToken)
    {
        if (!OwnsTenant(tenantId))
            return Fail(StatusCodes.Status403Forbidden, "Cross-tenant access is forbidden.");

        var status = await service.DeleteAsync(
            tenantId, id, expectedVersion, cancellationToken);
        return status switch
        {
            CityMutationStatus.Success => Success("City deleted."),
            CityMutationStatus.NotFound => Fail(StatusCodes.Status404NotFound, "City not found."),
            _ => Fail(StatusCodes.Status409Conflict, "City changed; reload and retry."),
        };
    }

    private bool OwnsTenant(Guid routeTenantId)
    {
        return Guid.TryParse(
                   AsgardContext.IdentityContext?.UserInfo?.TenantId,
                   out var currentTenantId) &&
               currentTenantId == routeTenantId;
    }
}`;

const registrationCode = `// Existing plugin entry point: call conventions once.
protected override Task OnConfigureServicesAsync(
    IPluginServiceConfigurationContext context,
    CancellationToken cancellationToken)
{
    var config = context.AddPluginConventions<MyPlugin, MyPluginConfig>();
    config.Validate();
    return Task.CompletedTask;
}

# app.yaml — MySQL provider is bundled by Asgard.Core 5.1.3
database:
  enabled: true
  provider: mysql
  connectionString: "\${env:ASGARD_DATABASE}"

# Keep entity caching off until every tenant cache key is proven isolated.
caching:
  enabled: false`;

const schemaCode = `CREATE TABLE city (
  id char(36) NOT NULL,
  tenant_id char(36) NOT NULL,
  name varchar(128) NOT NULL,
  create_time datetime(3) NOT NULL,
  update_time datetime(3) NULL,
  create_by varchar(50) NULL,
  update_by varchar(50) NULL,
  deleted bit(1) NOT NULL DEFAULT b'0',
  version int NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  INDEX ix_city_tenant_deleted_created (tenant_id, deleted, create_time)
);`;

const verifyCode = `dotnet restore
dotnet build -c Release
dotnet test -c Release --no-build
dotnet run --project src/MyApp.Starter

BASE=https://localhost:5001
TENANT=<tenant-guid>
TOKEN=<user-access-token-for-that-tenant>

curl --fail --header "Authorization: Bearer $TOKEN" \\
  "$BASE/api/tenants/$TENANT/cities?page=1&size=20"

curl --fail --request POST \\
  --header "Authorization: Bearer $TOKEN" \\
  --header "Content-Type: application/json" \\
  --data '{"name":"Asgard City"}' \\
  "$BASE/api/tenants/$TENANT/cities"

# Reuse the returned id/version for PUT and DELETE.
# Then replay the stale version and require HTTP 409.
# Repeat GET with a different tenant token and require no cross-tenant data.`;

const sourceCode = `Asgard 5.1.3 clean source
Common/Asgard.Abstractions/Data/Entities/AbsAsgardBaseEntity.cs
Common/Asgard.Abstractions/Data/Entities/AbsAsgardTenantEntity.cs
Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.cs
Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.Crud.cs
Common/Asgard.Core/Data/DatabaseServiceCollectionExtensions.cs
Common/Asgard.Core/Data/AsgardRepositoryContext.cs
Common/Asgard.Abstractions.AspNetCore/Controller/BaseController.cs
Common/Asgard.Abstractions.AspNetCore/Model/Response.cs
Common/Asgard.Abstractions.AspNetCore/Model/PageResponse.cs
Plugins/Asgard.PluginSdk/PluginConventions.cs`;

const sectionIds = [
  "architecture",
  "entity",
  "repository",
  "contracts",
  "service",
  "controller",
  "registration",
  "persistence",
  "boundaries",
  "verify",
  "sources",
] as const;

const makePage = (locale: Locale): DocPage => {
  const zh = locale === "zh";

  return {
    slug: "crud-vertical-slice",
    group: zh ? "开发指南" : "Development Guides",
    eyebrow: "ASGARD 5.1.3",
    title: zh ? "完整 CRUD 纵向切片" : "Complete CRUD vertical slice",
    description: zh
      ? "从租户实体、仓储和服务 DTO 一路到 Controller VO、统一响应、分页、并发与 HTTP 验收。"
      : "Build a tenant entity through repository and service DTOs to controller VOs, unified responses, paging, concurrency, and HTTP verification.",
    sections: [
      {
        id: sectionIds[0],
        title: zh ? "一个资源，四层边界" : "One resource, four layer boundaries",
        paragraphs: [
          zh
            ? "本教程用 City 展示一条完整、可拆文件的纵向路径。每个代码片段中的文件标记都是实际文件边界；Asgard 规则要求一个 C# 文件只承载一个顶层类型，不要为了复制方便把 DTO、VO、Service 与 Controller 合并。"
            : "This guide follows one City resource through a complete, file-oriented vertical path. Every file marker in the snippets is a real file boundary. Asgard requires one top-level type per C# file; do not merge DTOs, VOs, services, and controllers for copying convenience.",
          zh
            ? "框架没有自动 Mapper。Service 产出 DTO，Controller 通过显式 CityMappings 转 VO，再由 BaseController 包装 Response<T> 或 PageResponse<T>。"
            : "There is no automatic mapper. The service produces DTOs, the controller explicitly maps them to VOs through CityMappings, and BaseController wraps Response<T> or PageResponse<T>.",
        ],
        code: { language: "text", value: layoutCode },
      },
      {
        id: sectionIds[1],
        title: zh ? "实体拥有状态变化" : "The entity owns state changes",
        paragraphs: [
          zh
            ? "City 继承 AbsAsgardTenantEntity，得到 string Id、TenantId、CreateTime/UpdateTime、CreateBy/UpdateBy、Deleted 与带 IsVersion=true 的 Version。创建与修改只开放业务字段，TenantId 和审计人来自当前身份，不能由 HTTP request 任意覆盖。"
            : "City inherits AbsAsgardTenantEntity and receives string Id, TenantId, CreateTime/UpdateTime, CreateBy/UpdateBy, Deleted, and Version marked IsVersion=true. Creation and mutation expose only business fields; TenantId and audit actors come from current identity, never arbitrary HTTP input.",
        ],
        code: { language: "csharp", value: entityCode },
      },
      {
        id: sectionIds[2],
        title: zh ? "仓储只做数据访问" : "The repository owns data access only",
        paragraphs: [
          zh
            ? "具体仓储必须直接带 [Repository]，继承 AbsAsgardRepositoryBase<City,string>，并注入 IFreeSql、IMultiLevelCache、ILogger 与 IAsgardRepositoryContext。接口只暴露此用例需要的查询和写入。"
            : "The concrete repository directly carries [Repository], inherits AbsAsgardRepositoryBase<City,string>, and injects IFreeSql, IMultiLevelCache, ILogger, and IAsgardRepositoryContext. Its interface exposes only the queries and writes required by this use case.",
          zh
            ? "租户条件由 FreeSql GlobalFilter 根据当前 IAsgardIdentityContext 动态附加；仓储不重复拼 TenantId。Deleted 没有框架全局过滤，所以 active 查询必须显式写 !Deleted。"
            : "FreeSql GlobalFilter dynamically applies tenant scope from IAsgardIdentityContext, so the repository does not duplicate TenantId predicates. Deleted has no framework global filter, so active queries explicitly require !Deleted.",
        ],
        code: { language: "csharp", value: `${repositoryContractCode}\n\n${repositoryCode}` },
      },
      {
        id: sectionIds[3],
        title: zh ? "DTO、VO 与显式映射" : "DTOs, VOs, and explicit mapping",
        paragraphs: [
          zh
            ? "输入 DTO 不包含 TenantId、审计字段、Deleted 或数据库 Version。ExpectedVersion 是冲突前置条件，不会被写回实体；真正参与数据库更新的 Version 始终来自刚查询到的实体。"
            : "Input DTOs contain no TenantId, audit fields, Deleted, or database Version. ExpectedVersion is a conflict precondition and is never assigned back to the entity; the Version used for the database update always comes from the freshly loaded entity.",
        ],
        code: { language: "csharp", value: contractsCode },
        note: zh
          ? "上方每个 // 路径代表独立文件。CityMappings 只是普通显式代码，不代表框架存在自动映射器。"
          : "Each // path above denotes a separate file. CityMappings is ordinary explicit code, not evidence of an automatic framework mapper.",
      },
      {
        id: sectionIds[4],
        title: zh ? "Service 编排身份、审计与并发" : "The service coordinates identity, audit, and concurrency",
        paragraphs: [
          zh
            ? "Service 再次核对 route tenant 与身份 tenant，避免只靠 Controller 或声明式授权。这个服务没有平台跨租户分支；真正的平台操作必须使用独立 permission、独立 service 方法和审计。"
            : "The service rechecks route tenant against identity tenant instead of relying only on the controller or declarative authorization. This service has no platform cross-tenant branch; genuine platform operations need a separate permission, service method, and audit trail.",
          zh
            ? "更新采用先查后改：比较 ExpectedVersion 后调用实体行为，再用带数据库当前 Version 的实体 UpdateAsync。affected != 1 映射为 Conflict；不同 FreeSql provider 是否返回 0 或抛并发异常必须用真实数据库集成测试，Asgard 没有通用并发异常适配器。"
            : "Updates use read-modify-write: compare ExpectedVersion, call entity behavior, then UpdateAsync the entity carrying the database-current Version. affected != 1 becomes Conflict. Test whether the selected FreeSql provider returns zero or throws on a race; Asgard provides no universal concurrency-exception adapter.",
        ],
        code: { language: "csharp", value: `${serviceContractCode}\n\n${serviceCode}` },
      },
      {
        id: sectionIds[5],
        title: zh ? "Controller 只编排 HTTP" : "The controller coordinates HTTP only",
        paragraphs: [
          zh
            ? "所有业务路由以 /api 开头并继承 BaseController。详情、创建、更新返回 Response<CityVo>；页码列表返回 PageResponse<CityVo>；删除返回 Response<object>；冲突明确返回 409。"
            : "Every business route starts with /api and inherits BaseController. Detail, create, and update return Response<CityVo>; page listing returns PageResponse<CityVo>; delete returns Response<object>; conflicts explicitly return 409.",
          zh
            ? "[Authorize] 只证明请求已认证，不证明资源属于当前租户。service 的 RequireActor 是此切片的显式资源边界；实际项目还应加 cities.read/write 等 AsgardAuth permission。"
            : "[Authorize] proves authentication, not resource ownership. The service RequireActor check is this slice's explicit resource boundary; a real application should also add AsgardAuth permissions such as cities.read/write.",
        ],
        code: { language: "csharp", value: controllerCode },
      },
      {
        id: sectionIds[6],
        title: zh ? "注册与配置" : "Registration and configuration",
        paragraphs: [
          zh
            ? "插件只调用一次 AddPluginConventions<MyPlugin,MyPluginConfig>()；它扫描当前插件程序集中的 [Repository] 与 [Service]。不要再对同一程序集重复 AddRepositories/AddServices，否则会得到重复 DI descriptors。"
            : "The plugin calls AddPluginConventions<MyPlugin,MyPluginConfig>() once; it scans [Repository] and [Service] in the plugin assembly. Do not repeat AddRepositories/AddServices for the same assembly or duplicate DI descriptors result.",
          zh
            ? "database.enabled=true 才注册 IFreeSql。5.1.3 的 Asgard.Core 只捆绑 MySQL provider；换 PostgreSQL、SQL Server 等必须另外安装对应 FreeSql provider 并做真实集成测试。"
            : "IFreeSql is registered only when database.enabled=true. Asgard.Core 5.1.3 bundles only the MySQL provider; PostgreSQL, SQL Server, and others need their matching FreeSql provider plus a real integration test.",
        ],
        code: { language: "text", value: registrationCode },
      },
      {
        id: sectionIds[7],
        title: zh ? "Schema 与删除合同" : "Schema and deletion contract",
        paragraphs: [
          zh
            ? "Asgard 业务数据库注册不会自动 migration 或 AutoSync。用已审查的迁移工具创建 snake_case 表、审计列、tenant_id、deleted、version 与必要索引；不创建外键或级联规则。"
            : "Asgard application-database registration performs no automatic migration or AutoSync. Use a reviewed migration tool to create the snake_case table, audit columns, tenant_id, deleted, version, and required indexes; add no foreign keys or cascades.",
          zh
            ? "本教程选择软删除：调用 MarkAsDeleted 后 UpdateAsync。仓储基类的 DeleteAsync 是物理删除，绝不能把它描述为软删除；如果业务选择物理删除，应另写合同、权限和保留策略。"
            : "This guide chooses soft deletion through MarkAsDeleted followed by UpdateAsync. Repository DeleteAsync is physical deletion and must never be described as soft delete. A physical-delete policy needs its own contract, permission, and retention rules.",
        ],
        code: { language: "sql", value: schemaCode },
      },
      {
        id: sectionIds[8],
        title: zh ? "缓存与事务真实边界" : "Real cache and transaction boundaries",
        bullets: zh
          ? [
              "默认实体缓存键只含实体类型与 id，不含 TenantId；读取还会先查缓存再查带租户过滤的数据库。本切片保持 caching.enabled=false，直到仓储覆盖并验证 tenant-aware key",
              "Insert/Update/Delete 在数据库成功后再清缓存；数据库提交与缓存失效不是原子事务，必须接受有界 TTL、重试或显式补偿",
              "PageActiveAsync 当前直接查询数据库，没有隐式页缓存；不要因为仓储注入 IMultiLevelCache 就声称所有查询自动缓存",
              "每个 CRUD 方法是一条数据库操作。本切片没有跨仓储写入，因此没有捏造自动事务；多写业务必须在 Service 明确建立并测试 FreeSql UnitOfWork/事务边界",
              "Guid.Empty 身份不会启用租户 GlobalFilter。匿名、后台和平台流程必须先建立明确身份/租户作用域，不能把“无租户”理解为 deny-by-default",
            ]
          : [
              "Default entity cache keys contain entity type and id but no TenantId, and reads consult cache before the tenant-filtered database. This slice keeps caching.enabled=false until the repository overrides and verifies tenant-aware keys",
              "Insert/Update/Delete invalidates cache after database success; commit and invalidation are not atomic, so use bounded TTL, retries, or explicit compensation",
              "PageActiveAsync queries the database directly and has no implicit page cache. Injecting IMultiLevelCache into a repository is not proof that every query is cached",
              "Each CRUD method is one database operation. This slice has no multi-repository write and therefore invents no automatic transaction. Multi-write services must explicitly establish and test a FreeSql UnitOfWork/transaction boundary",
              "Guid.Empty identity does not activate the tenant GlobalFilter. Anonymous, background, and platform flows must establish an explicit identity/tenant scope; no tenant is not deny-by-default",
            ],
      },
      {
        id: sectionIds[9],
        title: zh ? "编译与 HTTP 验收" : "Build and HTTP acceptance",
        paragraphs: [
          zh
            ? "先对每个 snippet 按文件拆分、补齐项目 GlobalUsings，再运行 Release build 与测试。应用启动前执行 SQL migration，并使用真实 MySQL、两个 tenant token 与同一个资源 ID 验收隔离。"
            : "Split every snippet into its marked file, complete the project's GlobalUsings, then run the Release build and tests. Apply the SQL migration before startup and verify isolation with real MySQL, two tenant tokens, and the same resource ID.",
        ],
        bullets: zh
          ? [
              "创建返回 Response<CityVo>，Version 可用于下一次条件更新",
              "page=1&size=20 返回 PageResponse<CityVo>，totalCount 只统计当前租户未删除行",
              "旧 ExpectedVersion 更新与删除均返回 409，数据库最终值不被覆盖",
              "软删除后详情返回 404、分页不再出现，但数据库行仍存在且 deleted=1",
              "tenant A 的 token 请求 tenant B 路由失败；冷缓存与启用 tenant-aware cache 后的热缓存都必须复测",
            ]
          : [
              "Create returns Response<CityVo>, whose Version can guard the next mutation",
              "page=1&size=20 returns PageResponse<CityVo>; totalCount includes only active rows in the current tenant",
              "Update and delete with stale ExpectedVersion return 409 without overwriting the database value",
              "After soft delete, detail returns 404 and paging omits the item while the row remains with deleted=1",
              "A tenant A token cannot use a tenant B route; repeat with cold cache and again after a tenant-aware cache is enabled",
            ],
        code: { language: "bash", value: verifyCode },
      },
      {
        id: sectionIds[10],
        title: zh ? "源码核验锚点" : "Source verification anchors",
        paragraphs: [
          zh
            ? "示例以 Asgard 5.1.3 clean source 的公开类型和运行路径为准。Mapper、数据库迁移、业务资源授权、跨仓储事务及通用乐观锁错误映射均是应用责任，不是框架自动能力。"
            : "The examples follow public types and runtime paths in clean Asgard 5.1.3 source. Mapping, database migrations, resource ownership, multi-repository transactions, and universal optimistic-concurrency error mapping remain application responsibilities, not automatic framework capabilities.",
        ],
        code: { language: "text", value: sourceCode },
      },
    ],
  };
};

export const zhAsgardCrudDocs: DocPage[] = [makePage("zh")];
export const enAsgardCrudDocs: DocPage[] = [makePage("en")];
export const zhAsgardCrudPage = zhAsgardCrudDocs[0];
export const enAsgardCrudPage = enAsgardCrudDocs[0];
