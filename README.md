# lumen-admin-ui

`lumen-admin-ui` 是 `lumen-gateway` 的独立前端控制台项目。

定位：

- 面向 `lumen-gateway` 的 `Admin API /control/*`
- 提供资源管理、bundle 导入预览、历史版本、回滚
- 不承载数据面逻辑

建议原则：

- UI 单独仓库、单独发布
- 后端能力全部走 `lumen-gateway`
- 页面先做最小 MVP，再逐步补权限、审计、多人协作

文档：

- `UI_EXECUTION_PLAN.md`

