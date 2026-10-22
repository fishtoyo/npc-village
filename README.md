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

每個角色都會自己發呆、散步、東張西望、眨眼，偶爾做特殊動作，並避開營火、帳篷、樹和彼此。點角色會打招呼並說一句英文台詞。

## 操作

- 拖曳旋轉、滾輪縮放
- 點角色（或左側名冊）：鏡頭飛到角色前方，打開角色資訊
- **全體跳舞**、**切換夜晚**、**名牌**、**技術說明**

## 本機預覽

ES Modules 需要用本機伺服器開啟，不能直接雙擊 `index.html`：

```bash
php -S localhost:8000      # 或 npx serve .
```

## 檔案結構

```
index.html                 頁面與介面
assets/css/style.css       WordHero 風格的面板與按鈕
assets/js/main.js          場景、鏡頭、點選、介面
assets/js/characters.js    6 個角色的造型與動作（新增角色從這裡開始）
assets/js/npc.js           NPC 行為狀態機（發呆／散步／特殊動作／打招呼／跳舞）
assets/js/world.js         營地場景與日夜光線
assets/js/toon.js          卡通著色與描邊
assets/js/particles.js     粒子系統
assets/vendor/three/       Three.js r170（MIT License）
```

## 新增角色

1. 在 `assets/js/characters.js` 寫一個建立函式：用 `humanoid({ body, legs, shoes })` 做出 Q 版身體，再加上帽子、道具，`animate()` 裡呼叫 `pose()` 和 `applyPose()` 就有走路、眨眼、跳舞。
2. 在同一檔案的 `CHARACTERS` 陣列加一筆資料（名字、顏色、速度、台詞、特殊動作名稱）。
3. 在 `assets/js/main.js` 的 `TAG_Y` 設定名牌高度。
