# NPC 小村 NPC VILLAGE

用 Three.js 繪製的 Q 版 NPC 角色展示。畫風依照設計參考圖：軟膠公仔質感、大頭大眼、塊狀頭髮、單色背景＋圓形底座；介面沿用 [單字英雄 WordHero](https://www.wordhero.tw/) 的遊戲風格。

**線上展示：** https://fishtoyo.github.io/npc-village/

所有角色都是用程式即時組出來的（球、膠囊、圓錐、圓柱、旋轉體），沒有載入任何 3D 模型檔或圖片。

## 角色

| 角色 | 特殊動作 | 展示的技術 |
|---|---|---|
| 男戰士 Leo | 揮劍 | 金屬材質＋環境反射、彎曲圓錐做牛角、揮劍關節動畫 |
| 女戰士 Ruby | 揮斧 | 雙馬尾的拉長球體、半圓柱斧刃、羽毛裝飾 |
| 男巫師 Max | 施法 | 旋轉體（Lathe）做長袍與帽簷、擠出（Extrude）做星星、曲線管做木杖 |
| 女巫 Luna | 魔法 | 條紋襪、蓬裙蕾絲、肩上黑貓的尾巴擺動 |
| 男弓箭手 Robin | 射箭 | 羅賓漢帽與羽毛、斜背箭筒、拉弓動作 |
| 女弓箭手 Ivy | 射箭 | 高馬尾隨走路擺動、葉片短裙、彩虹箭羽 |
| 王子 Arthur | 舉劍 | 金屬皇冠、開口圓柱做披風、金色光點粒子 |
| 公主 Aria | 轉圈 | 多層旋轉體禮服、蕾絲裙襬、長捲髮、雙手合十姿勢 |
| 噴火龍 Draco | 噴火 | 自發光火焰、有方向的火焰粒子、翅膀與尾巴的次要動作 |

每個角色一張卡片，在自己的小舞台裡原地動作：發呆、東張西望、眨眼、原地踏步（順便轉一圈展示側面與背面），偶爾做特殊動作。

**表情**：說話時嘴巴開合、眉毛上揚；跳舞時笑瞇眼（^ ^）；做特殊動作時皺眉張嘴。

**質感**：`MeshPhysicalMaterial` 加亮面塗層（clearcoat），搭配 `RoomEnvironment` 環境反射，做出軟膠公仔的光澤；金屬部位（頭盔、皇冠、劍）有真實反光。

## 操作

- 點角色或「說話」：打招呼並說一句英文台詞
- 特殊動作按鈕：揮劍、揮斧、施法、魔法、射箭、舉劍、轉圈、噴火
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
assets/js/stage.js         每張卡片的小舞台：圓形底座、攝影棚打光、自動取景
assets/js/materials.js     公仔材質（物理材質＋亮面塗層）
assets/js/particles.js     粒子系統
assets/vendor/three/       Three.js r170（MIT License）
```

## 新增角色

1. 在 `assets/js/characters.js` 寫一個建立函式：用 `figure({ shirt, pants, boots, faceOpts })` 做出 Q 版身體，`hair()` 加頭髮，再加上帽子、衣服、道具；`animate()` 裡呼叫 `pose()` 和 `applyPose()` 就有踏步、眨眼、表情、跳舞。
2. 在同一檔案的 `CHARACTERS` 陣列加一筆資料（名字、顏色、背景 `bg: "beige"` 或 `"blue"`、台詞、特殊動作名稱）。
3. 特殊動作可以直接套用 `swing()`（揮砍）、`cast()`（施法）、`shoot()`（射箭）。
4. 非人形角色（例如噴火龍）可以自己組骨架，記得呼叫 `express()` 讓表情與眨眼生效。
