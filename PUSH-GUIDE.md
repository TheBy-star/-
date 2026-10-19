# 把项目保存到 GitHub（三条路，任选一条）

我这边为什么不能直接帮你推：**这台机器没有安装 Git，而且 PowerShell 的所有出站 HTTPS 请求都被网络策略拦截**（已实测：`api.github.com` 返回"基础连接已关闭"）。只有我自己的工具通道能通外网，所以推送必须由你这边执行。

仓库已经整理好放在 **`forest-cabin-repo/`** 目录里，文件干净、带 README、LICENSE、.gitignore 和验证脚本。

---

## 路线 A：网页上传（最快，1 分钟，不用装任何东西）

1. 打开 <https://github.com/new>
2. **Repository name** 填 `forest-cabin`
3. 可见性选 Public 或 Private 都行
4. **不要勾选** "Add a README file" / "Add .gitignore" / "Choose a license"（我们已经有这些文件了）
5. 点 **Create repository**
6. 在新仓库页面点 **uploading an existing file**（或直接访问 `https://github.com/你的用户名/forest-cabin/upload/main`）
7. 把 `forest-cabin-repo` 文件夹里的内容**全选拖进去**（包括 `scripts` 子目录）
8. 下方 Commit changes 填一句说明，点 **Commit changes**

完成后刷新仓库页面就能看到文件。

> ⚠️ 网页拖拽上传**不支持子目录**（部分浏览器支持，Safari 不支持）。如果 `scripts/` 没传上去：
> 在仓库里点 **Add file → Create new file**，文件名写 `scripts/glsl-audit.js`，把本地文件内容粘贴进去，再同样建 `scripts/mock-run.js`。

---

## 路线 B：装 Git 后一键推送（推荐，以后能持续更新）

**第一步：装 Git**

下载 <https://git-scm.com/download/win>，一路下一步安装（默认选项即可）。装完**重新打开 PowerShell**，验证：

```powershell
git --version
```

**第二步：在 GitHub 建空仓库**

打开 <https://github.com/new>，名字填 `forest-cabin`，**不要**初始化 README，点 Create。

**第三步：配置身份（只需一次）**

```powershell
git config --global user.name  "你的名字"
git config --global user.email "你的邮箱"
```

**第四步：进到仓库目录并运行我写好的脚本**

```powershell
cd "C:\Users\22794\Desktop\新建文件夹 (3)\forest-cabin-repo"
.\push-to-github.ps1 -RepoUrl "https://github.com/你的用户名/forest-cabin.git"
```

脚本会自动完成：初始化 → 提交 → 关联远程 → 推送。第一次推送会弹窗让你登录 GitHub（浏览器授权即可）。

> 如果提示"无法加载脚本，因为在此系统上禁止运行脚本"，用这一行绕过：
> ```powershell
> powershell -ExecutionPolicy Bypass -File .\push-to-github.ps1 -RepoUrl "https://github.com/你的用户名/forest-cabin.git"
> ```

---

## 路线 C：GitHub Desktop（不想碰命令行）

1. 下载 <https://desktop.github.com/>
2. 登录 GitHub 账号
3. 菜单 **File → Add local repository** → 选择 `forest-cabin-repo` 文件夹
4. 左下角填提交信息 → 点 **Commit to main**
5. 点顶部 **Publish repository**，勾掉 "Keep this code private"（或保留，看你需要）

---

## 上传完成后：在线预览（可选，但有价值）

GitHub Pages 可以把这个场景变成一个**能直接发链接给别人看的网址**：

1. 进入仓库 → **Settings** → 左侧 **Pages**
2. **Source** 选 `Deploy from a branch`
3. **Branch** 选 `main`，目录选 `/ (root)`，点 **Save**
4. 等 1–2 分钟，访问 `https://你的用户名.github.io/forest-cabin/`

这个链接扔进简历或发给别人，对方**点开就能看到你的场景**——比截图有说服力得多。

---

## 需要我补充的内容

如果你想让这个仓库更完整，我可以继续帮你准备（都在本地生成，不需要网络）：

- **截图**：把成品图放进 `docs/` 并在 README 顶部引用（需要你先给我一张满意的截图）
- **技术文档**：把渲染管线的实现细节拆成 `docs/rendering.md`
- **`.github/workflows/`**：加一个 CI，每次推送自动跑那两个验证脚本
- **多语言 README**：补一份英文版

告诉我哪个，我直接生成文件，你再一起上传。
