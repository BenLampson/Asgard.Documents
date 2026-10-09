---
title: "安装与验证"
description: "使用仓库提供的 Windows PowerShell 安装脚本，检查目录发现、链接和技能校验结果。"
order: 20
section: "开始使用"
---

仓库里的 `skills/` 是维护与分发目录。仅把 Asgard.Skills 放进应用仓库，不会自动让 Codex 发现技能；需要把技能放入当前环境实际读取的技能目录。

## 获取仓库

准备 Git 和 Windows PowerShell，在你打算长期保留的位置获取仓库：

```powershell
git clone https://github.com/BenLampson/Asgard.Skills.git
Set-Location Asgard.Skills
```

安装器使用目录链接，所以安装后应保留这个仓库路径。移动或删除仓库会使已安装链接无法访问源文件。

## Windows 默认安装

在仓库根目录执行：

```powershell
.\scripts\install-skills.ps1
```

脚本默认把每个含 `SKILL.md` 的技能目录链接到 `$env:USERPROFILE\.agents\skills`。它使用 Windows **Junction**，不会复制技能内容，因此更新这个仓库后，链接指向的内容也随之更新。

仓库当前提供的是 Windows PowerShell 安装脚本，没有配套的 Bash 安装器。不要把下面的 PowerShell 参数当作跨平台安装命令；其他系统应按所用客户端的技能安装方式放置完整技能目录，并验证客户端能够发现它们。

## 指定现有技能目录

脚本声明的参数只有 `-Destination`。如果当前环境已经使用 `.codex/skills`，指定那个目录，避免在多个发现路径放置同名技能：

```powershell
.\scripts\install-skills.ps1 -Destination "$env:USERPROFILE/.codex/skills"
```

团队按项目使用时，可以指定该项目的 `.agents/skills`。请把示例路径替换成实际项目路径：

```powershell
.\scripts\install-skills.ps1 -Destination "C:\Projects\MyApp\.agents\skills"
```

该脚本安装所有包含 `SKILL.md` 的技能，没有按名称筛选、强制覆盖、自动卸载或依赖锁定参数。目标目录不能是仓库 `skills/` 本身，也不能位于它的子目录中。

## 同名目录如何处理

安装器先检查所有同名目标，再创建缺少的链接：

- 已有 Junction 或 SymbolicLink，且目标正是本仓库对应技能目录：保留链接，可以重复执行
- 已有普通目录，或链接指向其他位置：保留现有内容，报错并停止安装
- 目标不存在：创建 Junction

不要为了绕过冲突直接删除同名目录。先检查它是否来自其他仓库、是否包含本地修改，以及客户端实际使用哪个发现路径，再由维护者决定合并或更换。

## 检查安装结果

以默认安装为例，先检查一个明确的入口是否可读，再列出链接：

```powershell
Test-Path "$env:USERPROFILE/.agents/skills/asgard-framework-overview/SKILL.md"
Get-ChildItem "$env:USERPROFILE/.agents/skills" |
    Select-Object Name, LinkType, Target
```

如果使用了 `-Destination`，把检查路径改成那个目录。文件检查成功后，再查看 Codex 的可用技能列表，确认目标技能实际出现。若更新没有出现，按仓库说明重启 Codex 后复查；文件存在不等于客户端已经加载。

可以用一个低风险的路由问题检查是否读到了正确内容：

```text
使用 $asgard-framework-overview，先判断这个项目的插件主体和 starter 分工，
列出要继续读取的专项技能以及选择理由。暂时不要修改代码。
```

## 校验技能文件

维护或更新技能时，环境需要 Python 和 PyYAML。在仓库根目录运行：

```powershell
python -X utf8 scripts/validate_skills.py
```

校验器检查技能名称与 YAML、description、代理配置、Markdown 相对链接、技能引用，以及部分模板与 API 约束。description 的 **180 字符**限制是本仓库的维护约定，不是平台限制。

静态校验不负责安装、不测试 Windows 链接权限、不验证模型自动触发率，也不编译目标应用。安装、技能校验和应用测试应分别确认。

## 常见问题

- **提示同名技能冲突**：检查目标的 `LinkType` 与 `Target`；只有链接到这个仓库对应目录的项会被安全复用
- **源目录可读但技能列表缺失**：确认所选目录确实是当前客户端的发现路径，避免 `.agents/skills` 与 `.codex/skills` 重复安装
- **创建 Junction 失败**：检查目标路径、Windows 文件系统支持与写入权限；脚本不会自动调整安全设置
- **找不到 `yaml` 模块**：为运行校验器的 Python 环境准备 PyYAML 后再运行
- **仓库更新后行为变化**：链接读取的是更新后的文件；先检查差异，再用目标项目编译与测试验证适用性

下一步：[选择技能](/zh/skills/docs/catalog/)或查看[开发与复查流程](/zh/skills/docs/workflow/)。

## 源码依据

- [安装说明](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/README.md)
- [完整 PowerShell 安装器](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/scripts/install-skills.ps1)
- [静态校验器](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/scripts/validate_skills.py)
- [显式任务入口](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-framework-overview/SKILL.md)
