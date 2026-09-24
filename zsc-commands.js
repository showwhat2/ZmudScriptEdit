/* =========================================================
   zMUD ZSC Commands Database
   =========================================================

   用途：
   - 快速插入 zMUD 語法
   - 語法提示
   - 說明文字
   - 未來可擴充自動完成

   注意：
   這個檔案目前只是「資料庫」。
   暫時不會修改現有 parser.js / editor.js。

   ========================================================= */


/* =========================================================
   系統變數
   ========================================================= */

const ZSC_SYSTEM_VARIABLES = [

    {
        name: "%action",
        syntax: "%action",
        description: "最後一次觸發所執行的命令"
    },

    {
        name: "%char",
        syntax: "%char",
        description: "目前 MUD 中的角色 ID"
    },

    {
        name: "%cr",
        syntax: "%cr",
        description: "換行"
    },

    {
        name: "%ctime",
        syntax: "%ctime",
        description: "以秒為單位表示的連線時間"
    },

    {
        name: "%def",
        syntax: "%def",
        description: "目前使用的特殊字符"
    },

    {
        name: "%host",
        syntax: "%host",
        description: "目前連線 MUD 的網域名稱或 IP"
    },

    {
        name: "%i",
        syntax: "%i",
        description: "與 %repeatnum 相同"
    },

    {
        name: "%lastcom",
        syntax: "%lastcom",
        description: "最後執行的命令"
    },

    {
        name: "%lastcom2",
        syntax: "%lastcom2",
        description: "倒數第二個執行的命令"
    },

    {
        name: "%lastcom3",
        syntax: "%lastcom3",
        description: "倒數第三個執行的命令"
    },

    {
        name: "%lastinput",
        syntax: "%lastinput",
        description: "最後輸入的內容"
    },

    {
        name: "%line",
        syntax: "%line",
        description: "從 MUD 收到的最後一行文字"
    },

    {
        name: "%line2",
        syntax: "%line2",
        description: "從 MUD 收到的倒數第二行文字"
    },

    {
        name: "%line3",
        syntax: "%line3",
        description: "從 MUD 收到的倒數第三行文字"
    },

    {
        name: "%param1",
        syntax: "%param1",
        description: "最後一次觸發取得的第一個參數，也可寫成 %1"
    },

    {
        name: "%param2",
        syntax: "%param2",
        description: "最後一次觸發取得的第二個參數，也可寫成 %2"
    },

    {
        name: "%param3",
        syntax: "%param3",
        description: "最後一次觸發取得的第三個參數，也可寫成 %3"
    },

    {
        name: "%param4",
        syntax: "%param4",
        description: "最後一次觸發取得的第四個參數，也可寫成 %4"
    },

    {
        name: "%param5",
        syntax: "%param5",
        description: "最後一次觸發取得的第五個參數，也可寫成 %5"
    },

    {
        name: "%paramN",
        syntax: "%paramN",
        description: "最後一次觸發取得的第 N 個參數，範圍可至 %99"
    },

    {
        name: "%port",
        syntax: "%port",
        description: "目前連線的連接埠"
    },

    {
        name: "%random",
        syntax: "%random",
        description: "產生 0～99 的隨機數"
    },

    {
        name: "%repeatnum",
        syntax: "%repeatnum",
        description: "目前循環命令的索引，也可寫成 %i"
    },

    {
        name: "%selected",
        syntax: "%selected",
        description: "目前選取的文字或命令"
    },

    {
        name: "%selline",
        syntax: "%selline",
        description: "目前選取的行"
    },

    {
        name: "%selword",
        syntax: "%selword",
        description: "目前選取的單字"
    },

    {
        name: "%title",
        syntax: "%title",
        description: "目前 MUD 的標題"
    },

    {
        name: "%trigger",
        syntax: "%trigger",
        description: "引起最近一次觸發的文字"
    },

    {
        name: "%window",
        syntax: "%window",
        description: "目前視窗標題"
    }

];


/* =========================================================
   一般函數
   ========================================================= */

const ZSC_FUNCTIONS = [

    {
        name: "%abs",
        syntax: "%abs(i)",
        description: "返回 i 的絕對值"
    },

    {
        name: "%additem",
        syntax: "%additem(s,list)",
        description: "增加字串 s 到字串列表 list"
    },

    {
        name: "%alias",
        syntax: "%alias(s)",
        description: "顯示別名 s 的內容"
    },

    {
        name: "%ansi",
        syntax: "%ansi(fore,back)",
        description: "返回指定前景色與背景色的 ANSI 代碼"
    },

    {
        name: "%begins",
        syntax: "%begins(s1,s2)",
        description: "判斷 s1 是否位於 s2 的開頭"
    },

    {
        name: "%btncol",
        syntax: "%btncol(button,back,fore)",
        description: "改變按鈕的顏色"
    },

    {
        name: "%btnimage",
        syntax: "%btnimage(button,filename)",
        description: "改變按鈕的圖案"
    },

    {
        name: "%case",
        syntax: "%case(i,s1,s2,s3...)",
        description: "根據 i 選擇對應字串，最多 8 個"
    },

    {
        name: "%char",
        syntax: "%char(i)",
        description: "返回 ASCII 碼所代表的字符"
    },

    {
        name: "%color",
        syntax: "%color(fore,back)",
        description: "返回顏色屬性"
    },

    {
        name: "%concat",
        syntax: "%concat(s1,s2,s3...)",
        description: "將多個字串相加，最多 9 個"
    },

    {
        name: "%copy",
        syntax: "%copy(s,i,n)",
        description: "從字串 s 的第 i 個字符開始截取 n 個字符"
    },

    {
        name: "%ddeopen",
        syntax: "%ddeopen(serv,topic)",
        description: "開啟 DDE 連線"
    },

    {
        name: "%ddeclose",
        syntax: "%ddeclose",
        description: "關閉 DDE 連線"
    },

    {
        name: "%dde",
        syntax: "%dde(serv,topic,item)",
        description: "使用 DDE 讀取資料"
    },

    {
        name: "%ddemacro",
        syntax: "%ddemacro(serv,topic,s)",
        description: "使用 DDE 執行命令"
    },

    {
        name: "%ddepoke",
        syntax: "%ddepoke(serv,topic,item,value)",
        description: "使用 DDE 寫入資料"
    },

    {
        name: "%delete",
        syntax: "%delete(s,i,n)",
        description: "刪除字串 s 中從第 i 個字符開始的 n 個字符"
    },

    {
        name: "%delitem",
        syntax: "%delitem(s,list)",
        description: "從字串列表中刪除指定字串"
    },

    {
        name: "%ends",
        syntax: "%ends(s1,s2)",
        description: "判斷 s1 是否位於 s2 的結尾"
    },

    {
        name: "%exec",
        syntax: "%exec(s1,s2,...)",
        description: "執行指定字串或命令"
    },

    {
        name: "%expand",
        syntax: "%expand(s)",
        description: "擴展字串中的變數與函數"
    },

    {
        name: "%eval",
        syntax: "%eval(p)",
        description: "返回表達式 p 的結果"
    },

    {
        name: "%format",
        syntax: "%format(f,a,b,c,d...)",
        description: "依指定格式格式化數值或字串"
    },

    {
        name: "%getglobal",
        syntax: "%getglobal(name)",
        description: "取得全域變數的值"
    },

    {
        name: "%grep",
        syntax: "%grep(i,s)",
        description: "搜尋檔案並返回符合字串的行號"
    },

    {
        name: "%if",
        syntax: "%if(expression,true-value,false-value)",
        description: "條件成立返回 true-value，否則返回 false-value"
    },

    {
        name: "%insert",
        syntax: "%insert(p,s,i)",
        description: "在字串 s 的第 i 個字符處插入字串 p"
    },

    {
        name: "%ismember",
        syntax: "%ismember(s,list)",
        description: "判斷字串 s 是否存在於列表"
    },

    {
        name: "%isnumber",
        syntax: "%isnumber(s)",
        description: "判斷字串是否為數字"
    },

    {
        name: "%left",
        syntax: "%left(s,n)",
        description: "取得字串最左邊 n 個字符"
    },

    {
        name: "%leftback",
        syntax: "%leftback(s,n)",
        description: "從倒數第 n 個字符開始取得左側部分"
    },

    {
        name: "%len",
        syntax: "%len(s)",
        description: "返回字串長度"
    },

    {
        name: "%lower",
        syntax: "%lower(s)",
        description: "將字串轉換成小寫"
    },

    {
        name: "%max",
        syntax: "%max(a,b,c,d...)",
        description: "取得最大值"
    },

    {
        name: "%min",
        syntax: "%min(a,b,c,d...)",
        description: "取得最小值"
    },

    {
        name: "%mod",
        syntax: "%mod(a,b)",
        description: "取模運算"
    },

    {
        name: "%null",
        syntax: "%null(s)",
        description: "判斷字串是否為空"
    },

    {
        name: "%numwords",
        syntax: "%numwords(s,d)",
        description: "取得字串中的單字數量"
    },

    {
        name: "%number",
        syntax: "%number(s)",
        description: "將字串轉換成數字"
    },

    {
        name: "%pick",
        syntax: "%pick(s1,s2,s3,...)",
        description: "顯示選擇清單並讓使用者選擇"
    },

    {
        name: "%pos",
        syntax: "%pos(p,s)",
        description: "返回字串 p 在字串 s 中的位置"
    },

    {
        name: "%proper",
        syntax: "%proper(s)",
        description: "將單字第一個字母以外的部分轉成小寫"
    },

    {
        name: "%prompt",
        syntax: "%prompt(v,p)",
        description: "提示使用者為變數 v 輸入值"
    },

    {
        name: "%random",
        syntax: "%random(i,j)",
        description: "返回 >= i 且 <= j 的隨機數；省略 j 時從 0 到 i"
    },

    {
        name: "%read",
        syntax: "%read(i,rec)",
        description: "從檔案 i 讀取記錄 rec"
    },

    {
        name: "%remove",
        syntax: "%remove(p,s)",
        description: "從字串 s 中刪除子字串 p"
    },

    {
        name: "%repeat",
        syntax: "%repeat(s,n)",
        description: "重複字串 s 共 n 次"
    },

    {
        name: "%replace",
        syntax: "%replace(s,p,r)",
        description: "搜尋並將字串 p 替換成 r"
    },

    {
        name: "%right",
        syntax: "%right(s,n)",
        description: "取得字串最右邊 n 個字符"
    },

    {
        name: "%rightback",
        syntax: "%rightback(s,n)",
        description: "從倒數第 n 個字符開始取得右側部分"
    },

    {
        name: "%setglobal",
        syntax: "%setglobal(name,value)",
        description: "設定全域變數"
    },

    {
        name: "%time",
        syntax: "%time(format)",
        description: "取得目前日期與時間"
    },

    {
        name: "%trigger",
        syntax: "%trigger(class)",
        description: "判斷指定 trigger class 是否啟用"
    },

    {
        name: "%trim",
        syntax: "%trim(s)",
        description: "消除字串兩端空白"
    },

    {
        name: "%trimleft",
        syntax: "%trimleft(s)",
        description: "消除字串左側空白"
    },

    {
        name: "%trimright",
        syntax: "%trimright(s)",
        description: "消除字串右側空白"
    },

    {
        name: "%upper",
        syntax: "%upper(s)",
        description: "將字串轉換成大寫"
    },

    {
        name: "%word",
        syntax: "%word(s,i,d)",
        description: "取得字串中的第 i 個單字"
    },

    {
        name: "%write",
        syntax: "%write(i,s,rec)",
        description: "將字串寫入檔案"
    },

    {
        name: "%yesno",
        syntax: "%yesno(s)",
        description: "顯示 Yes / No 問題並返回結果"
    }

];


/* =========================================================
   地圖函數
   ========================================================= */

const ZSC_MAP_FUNCTIONS = [

    {
        name: "%roomname",
        syntax: "%roomname(room,[s])",
        description: "返回或設定房間名稱"
    },

    {
        name: "%roomdesc",
        syntax: "%roomdesc(room,[s])",
        description: "返回或設定房間描述"
    },

    {
        name: "%roomnum",
        syntax: "%roomnum(room)",
        description: "返回房間編號"
    },

    {
        name: "%roomid",
        syntax: "%roomid(room,[s])",
        description: "返回或設定房間代號"
    },

    {
        name: "%roomcom",
        syntax: "%roomcom(room,[s])",
        description: "返回或設定進入房間後執行的命令"
    },

    {
        name: "%roomnote",
        syntax: "%roomnote(room,[s])",
        description: "返回或設定房間備註"
    },

    {
        name: "%roomexit",
        syntax: "%roomexit(room,[s])",
        description: "返回或設定房間出口字串"
    },

    {
        name: "%roomobj",
        syntax: "%roomobj(room,[i])",
        description: "返回或設定房間中的物件數量"
    },

    {
        name: "%roommob",
        syntax: "%roommob(room,[i])",
        description: "返回或設定房間中的 NPC 數量"
    },

    {
        name: "%roomcost",
        syntax: "%roomcost(room,[i])",
        description: "返回或設定進入房間所需代價"
    },

    {
        name: "%roomkind",
        syntax: "%roomkind(room,[i])",
        description: "返回或設定房間類型"
    },

    {
        name: "%roomflag",
        syntax: "%roomflag(room,[i])",
        description: "返回或設定房間禁止進入標誌"
    },

    {
        name: "%roomlink",
        syntax: "%roomlink(room,dir,[i])",
        description: "返回或設定指定方向的房間連接"
    },

    {
        name: "%roomportal",
        syntax: "%roomportal(room,s,[i],[z])",
        description: "返回或設定非標準出口 Portal"
    },

    {
        name: "%numrooms",
        syntax: "%numrooms()",
        description: "返回目前區域房間數量"
    },

    {
        name: "%numzones",
        syntax: "%numzones()",
        description: "返回目前地圖區域數量"
    },

    {
        name: "%parsemode",
        syntax: "%parsemode(i)",
        description: "返回或設定目前地圖分析模式"
    },

    {
        name: "%walk",
        syntax: "%walk(i)",
        description: "返回前往指定房間的 speedwalk 字串"
    },

    {
        name: "%zonename",
        syntax: "%zonename(zone,[s])",
        description: "返回或設定區域名稱"
    },

    {
        name: "%zonenum",
        syntax: "%zonenum(zone)",
        description: "返回區域編號"
    }

];


/* =========================================================
   迴圈
   ========================================================= */

const ZSC_LOOPS = [

    {
        name: "#NUMBER",
        syntax: "#NUMBER number",
        description: "重複指定次數"
    },

    {
        name: "#REPEAT",
        syntax: "#REPEAT number command",
        description: "重複執行指定次數"
    },

    {
        name: "#LOOP",
        syntax: "#LOOP number command",
        description: "執行指令指定次數"
    },

    {
        name: "#FORALL",
        syntax: "#FORALL(list,command)",
        description: "依照列表中的項目逐一執行"
    },

    {
        name: "#UNTIL",
        syntax: "#UNTIL(condition,command)",
        description: "持續執行直到條件成立"
    },

    {
        name: "#WHILE",
        syntax: "#WHILE(condition,command)",
        description: "條件成立時持續執行"
    },

    {
        name: "#PRIORITY",
        syntax: "#PRIORITY command",
        description: "暫停一般輸入後優先執行指定指令"
    },

    {
        name: "#ABORT",
        syntax: "#ABORT",
        description: "停止後續命令"
    }

];


/* =========================================================
   條件判斷
   ========================================================= */

const ZSC_CONDITIONS = [

    {
        name: "#IF",
        syntax: "#IF(condition,true-command,false-command)",
        description: "條件判斷"
    },

    {
        name: "#CASE",
        syntax: "#CASE(value,case1,case2,...)",
        description: "依照指定值選擇對應指令"
    }

];


/* =========================================================
   觸發
   ========================================================= */

const ZSC_TRIGGERS = [

    {
        name: "#ACTION",
        syntax: "#ACTION",
        description: "建立或顯示觸發"
    },

    {
        name: "#TRIGGER",
        syntax: "#TRIGGER",
        description: "建立或顯示觸發"
    },

    {
        name: "#CONDITION",
        syntax: "#CONDITION",
        description: "增加多重狀態觸發條件"
    },

    {
        name: "#ALARM",
        syntax: "#ALARM",
        description: "建立時間觸發"
    },

    {
        name: "#TEMP",
        syntax: "#TEMP",
        description: "建立暫時觸發"
    },

    {
        name: "#ONINPUT",
        syntax: "#ONINPUT",
        description: "建立命令列輸入觸發"
    },

    {
        name: "#MXPTRIG",
        syntax: "#MXPTRIG",
        description: "建立 MXP 觸發"
    },

    {
        name: "#REGEX",
        syntax: "#REGEX",
        description: "建立正規表示式觸發"
    },

    {
        name: "#SET",
        syntax: "#SET",
        description: "設定觸發狀態"
    },

    {
        name: "#STATE",
        syntax: "#STATE",
        description: "改變觸發狀態"
    }

];


/* =========================================================
   觸發相關
   ========================================================= */

const ZSC_TRIGGER_EFFECTS = [

    {
        name: "#COLOR",
        syntax: "#COLOR",
        description: "將最後一行上色"
    },

    {
        name: "#CW",
        syntax: "#CW",
        description: "將符合的部分上色"
    },

    {
        name: "#PCOL",
        syntax: "#PCOL",
        description: "將部分行上色"
    },

    {
        name: "#HIGHLIGHT",
        syntax: "#HIGHLIGHT",
        description: "強調最後一行"
    },

    {
        name: "#GAG",
        syntax: "#GAG",
        description: "刪除一行文字"
    },

    {
        name: "#UNGAG",
        syntax: "#UNGAG",
        description: "停止刪除指定文字"
    },

    {
        name: "#GAGON",
        syntax: "#GAGON",
        description: "開啟 GAG"
    },

    {
        name: "#GAGOFF",
        syntax: "#GAGOFF",
        description: "關閉 GAG"
    },

    {
        name: "#GAGBLOCK",
        syntax: "#GAGBLOCK",
        description: "刪除一整塊文字"
    },

    {
        name: "#SUBSTITUTE",
        syntax: "#SUBSTITUTE",
        description: "取代符合的文字"
    },

    {
        name: "#PSUB",
        syntax: "#PSUB",
        description: "取代部分行"
    },

    {
        name: "#T+",
        syntax: "#T+",
        description: "開啟觸發類別"
    },

    {
        name: "#T-",
        syntax: "#T-",
        description: "關閉觸發類別"
    },

    {
        name: "#CLASS",
        syntax: "#CLASS",
        description: "啟動或停止類別"
    },

    {
        name: "#SETPROMPT",
        syntax: "#SETPROMPT",
        description: "由 MUD 的提示列取得資料"
    }

];


/* =========================================================
   建立 / 修改設定
   ========================================================= */

const ZSC_SETTINGS = [

    {
        name: "#ALIAS",
        syntax: "#ALIAS name command",
        description: "建立或顯示別名"
    },

    {
        name: "#GALIAS",
        syntax: "#GALIAS name command",
        description: "建立全域別名"
    },

    {
        name: "#RECORD",
        syntax: "#RECORD",
        description: "錄製別名"
    },

    {
        name: "#PATH",
        syntax: "#PATH",
        description: "儲存或顯示路徑"
    },

    {
        name: "#VARIABLE",
        syntax: "#VARIABLE name value",
        description: "建立變數並設定其值"
    },

    {
        name: "#GVARIABLE",
        syntax: "#GVARIABLE name value",
        description: "建立全域變數"
    },

    {
        name: "#FUNCTION",
        syntax: "#FUNCTION name(parameters) command",
        description: "建立函式"
    },

    {
        name: "#MATH",
        syntax: "#MATH expression",
        description: "執行數學運算"
    },

    {
        name: "#ADD",
        syntax: "#ADD variable value",
        description: "將指定值加入變數"
    },

    {
        name: "#BUTTON",
        syntax: "#BUTTON name command",
        description: "建立按鈕"
    },

    {
        name: "#GAUGE",
        syntax: "#GAUGE",
        description: "建立圖形化測量按鈕"
    },

    {
        name: "#KEY",
        syntax: "#KEY key command",
        description: "建立按鍵"
    },

    {
        name: "#STATUS",
        syntax: "#STATUS",
        description: "設定狀態列"
    },

    {
        name: "#STW",
        syntax: "#STW",
        description: "設定狀態視窗"
    },

    {
        name: "#TAB",
        syntax: "#TAB",
        description: "加入自動完成項目"
    },

    {
        name: "#RENAME",
        syntax: "#RENAME oldname newname",
        description: "重新命名別名、變數或路徑"
    },

    {
        name: "#MENU",
        syntax: "#MENU",
        description: "建立選單"
    },

    {
        name: "#DIR",
        syntax: "#DIR",
        description: "建立方向"
    },

    {
        name: "#SUSPEND",
        syntax: "#SUSPEND",
        description: "暫停執行"
    },

    {
        name: "#RESUME",
        syntax: "#RESUME",
        description: "繼續執行"
    },

    {
        name: "#EDITOR",
        syntax: "#EDITOR",
        description: "編輯指定的設定"
    }

];


/* =========================================================
   移除設定
   ========================================================= */

const ZSC_REMOVE = [

    {
        name: "#UNALIAS",
        syntax: "#UNALIAS name",
        description: "移除別名"
    },

    {
        name: "#UNBUTTON",
        syntax: "#UNBUTTON name",
        description: "移除按鈕"
    },

    {
        name: "#UNCLASS",
        syntax: "#UNCLASS name",
        description: "移除類別"
    },

    {
        name: "#DELCLASS",
        syntax: "#DELCLASS name",
        description: "移除類別並刪除其下設定"
    },

    {
        name: "#UNKEY",
        syntax: "#UNKEY key",
        description: "移除按鍵"
    },

    {
        name: "#UNTRIGGER",
        syntax: "#UNTRIGGER name",
        description: "移除觸發"
    },

    {
        name: "#UNVAR",
        syntax: "#UNVAR name",
        description: "移除變數"
    },

    {
        name: "#UNMENU",
        syntax: "#UNMENU name",
        description: "移除選單"
    },

    {
        name: "#UNDIR",
        syntax: "#UNDIR direction",
        description: "移除方向"
    },

    {
        name: "#UNTAB",
        syntax: "#UNTAB name",
        description: "移除自動完成項目"
    },

    {
        name: "#KILLALL",
        syntax: "#KILLALL",
        description: "移除所有別名、按鍵、觸發與自動完成項目"
    }

];


/* =========================================================
   計時器
   ========================================================= */

const ZSC_TIMERS = [

    {
        name: "#TIMER",
        syntax: "#TIMER",
        description: "開啟或關閉計時器"
    },

    {
        name: "#TS",
        syntax: "#TS time",
        description: "設定計時器時間"
    },

    {
        name: "#T?",
        syntax: "#T?",
        description: "顯示計時器剩餘時間"
    },

    {
        name: "#TZ",
        syntax: "#TZ",
        description: "將計時器歸零"
    }

];


/* =========================================================
   檔案
   ========================================================= */

const ZSC_FILES = [

    {
        name: "#FILE",
        syntax: "#FILE",
        description: "開啟檔案"
    },

    {
        name: "#READ",
        syntax: "#READ",
        description: "讀取檔案"
    },

    {
        name: "#WRITE",
        syntax: "#WRITE",
        description: "寫入檔案"
    },

    {
        name: "#ERASE",
        syntax: "#ERASE",
        description: "刪除檔案"
    },

    {
        name: "#RESET",
        syntax: "#RESET",
        description: "將檔案讀寫指標重設到開頭"
    },

    {
        name: "#CLOSE",
        syntax: "#CLOSE",
        description: "關閉檔案"
    },

    {
        name: "#SEND",
        syntax: "#SEND",
        description: "將檔案內容加上前綴後送到 MUD"
    },

    {
        name: "#TYPE",
        syntax: "#TYPE",
        description: "顯示檔案內容"
    },

    {
        name: "#LOG",
        syntax: "#LOG",
        description: "開啟或關閉紀錄檔"
    },

    {
        name: "#FTP",
        syntax: "#FTP",
        description: "執行 FTP"
    },

    {
        name: "#IMAGE",
        syntax: "#IMAGE",
        description: "顯示圖片"
    }

];


/* =========================================================
   統一分類
   ========================================================= */

const ZSC_COMMAND_GROUPS = [

    {
        id: "systemVariables",
        name: "系統變數",
        items: ZSC_SYSTEM_VARIABLES
    },

    {
        id: "functions",
        name: "函數",
        items: ZSC_FUNCTIONS
    },

    {
        id: "mapFunctions",
        name: "地圖函數",
        items: ZSC_MAP_FUNCTIONS
    },

    {
        id: "loops",
        name: "迴圈",
        items: ZSC_LOOPS
    },

    {
        id: "conditions",
        name: "條件判斷",
        items: ZSC_CONDITIONS
    },

    {
        id: "triggers",
        name: "觸發",
        items: ZSC_TRIGGERS
    },

    {
        id: "triggerEffects",
        name: "觸發效果",
        items: ZSC_TRIGGER_EFFECTS
    },

    {
        id: "settings",
        name: "建立／修改設定",
        items: ZSC_SETTINGS
    },

    {
        id: "remove",
        name: "移除設定",
        items: ZSC_REMOVE
    },

    {
        id: "timers",
        name: "計時器",
        items: ZSC_TIMERS
    },

    {
        id: "files",
        name: "檔案",
        items: ZSC_FILES
    }

];


/* =========================================================
   全域資料庫
   ========================================================= */

const ZSCCommandDatabase = {

    systemVariables:
        ZSC_SYSTEM_VARIABLES,

    functions:
        ZSC_FUNCTIONS,

    mapFunctions:
        ZSC_MAP_FUNCTIONS,

    loops:
        ZSC_LOOPS,

    conditions:
        ZSC_CONDITIONS,

    triggers:
        ZSC_TRIGGERS,

    triggerEffects:
        ZSC_TRIGGER_EFFECTS,

    settings:
        ZSC_SETTINGS,

    remove:
        ZSC_REMOVE,

    timers:
        ZSC_TIMERS,

    files:
        ZSC_FILES,

    groups:
        ZSC_COMMAND_GROUPS

};


/* =========================================================
   除錯用
   ========================================================= */

console.log(
    "ZSC 語法資料庫已載入：",
    ZSCCommandDatabase
);