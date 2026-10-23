# AlphaGo Nothing 🤖

全球首个 Training-free 围棋模型：0 参数、0 训练、可同时一挑二任意顶尖棋手，胜率 ≥ 50%。

## 怎么玩

1. 打开网页，点“创建队伍”，把邀请链接发给队友。
2. 队友打开链接后，双方各点一次“准备”。
3. AlphaGo Nothing 会同时和你们各下一盘。

## 原理（剧透）

纯静态网页，不需要服务器。两位挑战者的浏览器通过 WebRTC（[Trystero](https://github.com/dmotz/trystero)，借助公共 Nostr 中继完成配对）直连，一方的落子会被当作“模型”的落子转发给另一方。两人其实在互相下棋，所以“模型”永远一胜一负。

## 部署

把 `index.html` 和 `go.js` 放进仓库根目录，在 Settings → Pages 里选择从 `main` 分支部署即可。

本地预览：`python3 -m http.server`，然后打开 http://localhost:8000（ES module 不能直接双击打开）。
