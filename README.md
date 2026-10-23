# AlphaNothing 🤖

全球首个 Training-free 围棋模型：0 参数、0 训练、可同时一挑二任意顶尖棋手，胜率 ≥ 50%。

## 怎么玩

- **随机匹配**：点“随机匹配网友队友”，系统会从同样在匹配的网友中为你找一位队友，配对后自动开局。
- **和朋友组队**：点“创建队伍邀请朋友”，把邀请链接发给朋友，双方各点一次“准备”。

无论哪种方式，AlphaNothing 都会同时和你们各下一盘。

## 原理（剧透）

纯静态网页，不需要自己的服务器。两位挑战者的浏览器通过公共 MQTT 服务器（EMQX、HiveMQ、Mosquitto）互相收发消息，一方的落子会被当作“模型”的落子转发给另一方。两人其实在互相下棋，所以“模型”永远一胜一负。

## 部署

把 `index.html`、`go.js`、`net.js`、`mqtt.js` 放进仓库根目录，在 Settings → Pages 里选择从 `main` 分支部署即可。

本地预览：`python3 -m http.server`，然后打开 http://localhost:8000（ES module 不能直接双击打开）。

## 声明

本项目为恶搞作品，与 Google DeepMind 及 AlphaGo / AlphaZero 无任何关联。
