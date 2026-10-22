# NPC 小村 NPC VILLAGE

用 Three.js 繪製的 Q 版 NPC 角色展示，風格參考 [單字英雄 WordHero](https://www.wordhero.tw/)。

**線上展示：** https://fishtoyo.github.io/npc-village/

所有角色與場景都是用程式即時組出來的（球、膠囊、圓錐、圓柱），沒有載入任何 3D 模型檔或圖片。

## 角色

| 角色 | 特殊動作 | 展示的技術 |
|---|---|---|
| 勇者 Leo | 揮劍 | 關節動畫、披風擺動、組合式道具（頭盔、劍、盾） |
| 魔法師 Mira | 施法 | 自發光材質＋點光源（夜晚寶珠會照亮周圍）、魔法粒子 |
| 弓箭手 Rin | 射箭 | 部分球體幾何（兜帽）、Torus 弧形弓、拉弓動作 |
| 商人 Bob | 叫賣 | 多個幾何組合（背包、草帽、鬍子）、金幣粒子與重力 |
| 史萊姆 Puru | 大跳躍 | 擠壓伸展（squash & stretch） |
| 小精靈 Tink | 空翻 | 飛行路徑、翅膀拍動、半透明材質 |
| 貓頭鷹老師 Hoot | 出題 | 非人形骨架（翅膀關節）、眼鏡與學士帽組合、搖擺走路 |
| 小龍 Draco | 噴火 | 尾巴與翅膀的次要動作、有方向的火焰粒子 |
| 公主 Aria | 轉圈 | 裙子與長髮的層次組合、皇冠寶石、身體旋轉 |

每個角色一張卡片，在自己的小舞台裡原地動作：發呆、東張西望、眨眼、原地踏步（順便轉一圈展示側面與背面），偶爾做特殊動作。

**表情**：說話時嘴巴開合、眉毛上揚；跳舞時笑瞇眼（^ ^）；做特殊動作時皺眉張嘴。

**舞台**：每張卡片有專屬天空色、背景布景（城堡塔、月亮星星、松樹、市集攤位、池塘、大花、黑板、岩石與岩漿、玫瑰拱門）與小道具，加上輪廓光與腳下的柔和陰影。

## 操作

- 點角色或「說話」：打招呼並說一句英文台詞
- 特殊動作按鈕：揮劍、施法、射箭、叫賣、大跳躍、空翻
- 上方按鈕：**全體跳舞**、**切換夜晚**、**技術說明**

## 運作方式

整頁只有**一個** WebGL 畫布，固定蓋在畫面上（不攔截滑鼠）。每一幀依照每張卡片舞台區的位置，用 `setViewport` + `setScissor` 把對應的小場景畫進去；捲到畫面外的卡片不更新也不繪製。這樣 6 個 3D 場景只需要一個 WebGL 環境，效能最好。

> 注意：卡片不能加 `transform`、`opacity`、`z-index` 等會建立堆疊層的樣式，否則對話框會被 3D 畫布蓋住。

## 本機預覽

ES Modules 需要用本機伺服器開啟，不能直接雙擊 `index.html`：

```bash
php -S localhost:8000      # 或 npx serve .
```

## 檔案結構

```
index.html                 頁面與介面
assets/css/style.css       WordHero 風格的面板與按鈕
assets/js/main.js          卡片、單一畫布多舞台繪製、按鈕
assets/js/characters.js    6 個角色的造型與動作（新增角色從這裡開始）
assets/js/actor.js         角色行為（發呆／踏步轉圈／特殊動作／打招呼／跳舞）
assets/js/stage.js         每張卡片的小舞台：草地圓台、燈光、專屬道具
assets/js/toon.js          卡通著色與描邊
assets/js/particles.js     粒子系統
assets/vendor/three/       Three.js r170（MIT License）
```

## 新增角色

1. 在 `assets/js/characters.js` 寫一個建立函式：用 `humanoid({ body, legs, shoes })` 做出 Q 版身體，再加上帽子、道具，`animate()` 裡呼叫 `pose()` 和 `applyPose()` 就有走路、眨眼、跳舞。
2. 在同一檔案的 `CHARACTERS` 陣列加一筆資料（名字、顏色、速度、台詞、特殊動作名稱）。
3. 想要專屬場景，在 `assets/js/stage.js` 的 `BACKDROPS`（背景）與 `PROPS`（小道具）各加一個同 id 的函式；卡片天空色在 `CHARACTERS` 的 `sky` 欄位設定。
4. 非人形角色（例如貓頭鷹、小龍）可以自己組骨架，記得呼叫 `express()` 讓表情與眨眼生效。
