/* =========================================================
   ZSC Editor App
   ========================================================= */

const { createApp } = Vue;


/* =========================================================
   HTML Escape
   ========================================================= */

function escapeHTML(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


/* =========================================================
   Main Commands
   ========================================================= */

const MAIN_ZSC_COMMANDS =
    new Set([

        "#ALIAS",
        "#FUNC",
        "#ALARM",
        "#TRIGGER",
        "#BUTTON",
        "#KEY",
        "#CLASS",
        "#VARIABLE",
        "#TIMER"

    ]);


/* =========================================================
   Token Index
   =========================================================

   使用 A-Z / AA-ZZ...

   不使用數字。

   這很重要：

   舊 token：

   ___ZSC_TOKEN_0___

   會被：

   /\b\d+(?:\.\d+)?\b/g

   再次抓到。

   新 token 不包含數字，
   因此不會被後面的 regex 誤傷。
   ========================================================= */

function encodeTokenIndex(index) {

    let n = index;

    let result = "";


    do {

        result =
            String.fromCharCode(
                65 + (n % 26)
            ) +
            result;


        n =
            Math.floor(n / 26) - 1;

    }
    while (n >= 0);


    return result;
}


function decodeTokenIndex(text) {

    let value = 0;


    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        value =
            value * 26 +
            (
                text.charCodeAt(i) -
                64
            );
    }


    return value - 1;
}


/* =========================================================
   Syntax Highlight
   ========================================================= */

function highlightZSC(text) {

    if (!text) {
        return "";
    }


    let source =
        escapeHTML(text);


    const tokens = [];


    function token(
        className,
        value
    ) {

        const tokenId =
            "\uE000" +
            "ZSC_" +
            encodeTokenIndex(
                tokens.length
            ) +
            "\uE001";


        tokens.push({

            className,

            value:

                '<span class="' +
                className +
                '">' +
                value +
                "</span>"

        });


        return tokenId;
    }


    /* ---------------------------------------------------------
       ALARM TIME
       --------------------------------------------------------- */

    source = source.replace(
        /\{\*\d+(?:\.\d+)?\}/g,

        match =>
            token(
                "zsc-alarm-time",
                match
            )
    );


    /* ---------------------------------------------------------
       #COMMAND
       --------------------------------------------------------- */

    source = source.replace(
        /#[A-Za-z][A-Za-z0-9_+-]*/g,

        match => {

            const upper =
                match.toUpperCase();


            if (
                MAIN_ZSC_COMMANDS.has(
                    upper
                )
            ) {

                return token(
                    "zsc-command",
                    match
                );
            }


            return token(
                "zsc-zmud-command",
                match
            );
        }
    );


    /* ---------------------------------------------------------
       @variable

       只做 HTML span。

       不會插入任何文字。
       --------------------------------------------------------- */

    source = source.replace(
        /@[A-Za-z_][A-Za-z0-9_+\-]*/g,

        match =>
            token(
                "zsc-variable",
                match
            )
    );


    /* ---------------------------------------------------------
       ;
       --------------------------------------------------------- */

    source = source.replace(
        /;/g,

        match =>
            token(
                "zsc-semicolon",
                match
            )
    );


    /* ---------------------------------------------------------
       Number
       --------------------------------------------------------- */

    source = source.replace(
        /\b\d+(?:\.\d+)?\b/g,

        match =>
            token(
                "zsc-number",
                match
            )
    );


    /* ---------------------------------------------------------
       {}
       --------------------------------------------------------- */

    source = source.replace(
        /[{}]/g,

        match =>
            token(
                "zsc-brace",
                match
            )
    );


    /* ---------------------------------------------------------
       一次還原全部 token
       --------------------------------------------------------- */

    source = source.replace(

        /\uE000ZSC_([A-Z]+)\uE001/g,

        (match, code) => {

            const index =
                decodeTokenIndex(
                    code
                );


            return tokens[index]
                ? tokens[index].value
                : match;
        }
    );


    return source;
}


/* =========================================================
   Vue
   ========================================================= */

createApp({

    /* =====================================================
       Data
       ===================================================== */

    data() {

        return {

            sourceText: "",

            fileName: "",

            items: [],

            selectedUid: null,

            checkedDeleteUids: [],


            /* ---------------------------------------------
               History
               --------------------------------------------- */

            undoStack: [],

            redoStack: [],

            historyRestoring: false,

            typingHistoryStarted: false,

            historySnapshot: null,


            /* ---------------------------------------------
               Search
               --------------------------------------------- */

            searchText: "",


            /* ---------------------------------------------
               Encoding
               --------------------------------------------- */

            readEncoding: "auto",

            detectedEncoding: "utf-8",

            saveEncoding: "big5",


            /* ---------------------------------------------
               Status
               --------------------------------------------- */

            dirty: false,

            dragging: false,

            statusMessage:
                "請開啟 .zsc 檔案",


            /* ---------------------------------------------
               Categories

               六個分類全部開啟。
               --------------------------------------------- */

            types: [

                "ALIAS",

                "FUNC",

                "ALARM",

                "TRIGGER",

                "BUTTON",

                "KEY"

            ],


            categories: {

                ALIAS: true,

                FUNC: true,

                ALARM: true,

                TRIGGER: true,

                BUTTON: true,

                KEY: true

            },


            expandedCategories: {

                ALIAS: true,

                FUNC: true,

                ALARM: true,

                TRIGGER: true,

                BUTTON: true,

                KEY: true

            },


            /* ---------------------------------------------
               Editor

               這兩個暫時保留，
               讓舊程式相容。

               實際格式化編輯器現在由
               CodeMirror 接管。
               --------------------------------------------- */

            rawEditorValue: "",

            formattedEditorValue: "",

            formattedHighlightValue: "",


            /* ---------------------------------------------
               Quick Insert

               快速插入
               --------------------------------------------- */

            quickInsertOpen: false,

            quickInsertSearch: "",

            quickInsertGroupId: "",

            quickInsertSelectedItem: null

        };
    },


    /* =====================================================
       Computed
       ===================================================== */

    computed: {

        selectedItem() {

            return (

                this.items.find(
                    item =>
                        item.uid ===
                        this.selectedUid
                )

                || null

            );
        },


        /* -------------------------------------------------
           保留原本 formattedText
           ------------------------------------------------- */

        formattedText() {

            if (!this.selectedItem) {
                return "";
            }


            return ZSCContent.format(
                this.selectedItem.content ||
                ""
            );
        },


        /* -------------------------------------------------
           舊版 highlight

           CodeMirror 啟用後主要不再使用這個，
           但保留它避免其他 HTML / 程式碼出錯。
           ------------------------------------------------- */

        formattedHighlighted() {

            return highlightZSC(
                this.formattedHighlightValue
            );
        },


        /* -------------------------------------------------
           RAW 行數
           ------------------------------------------------- */

        lineCount() {

            if (!this.selectedItem) {
                return 0;
            }


            const text =
                this.selectedItem.content ||
                "";


            if (!text) {
                return 0;
            }


            return text.split(
                /\r?\n/
            ).length;
        },


        /* -------------------------------------------------
           編碼顯示
           ------------------------------------------------- */

        encodingText() {

            if (
                this.detectedEncoding ===
                "big5"
            ) {

                return "Big5";
            }


            if (
                this.detectedEncoding ===
                "utf-8"
            ) {

                return "UTF-8";
            }


            return this.detectedEncoding;
        },


        /* -------------------------------------------------
           Undo
           ------------------------------------------------- */

        canUndo() {

            return (
                this.undoStack.length >
                0
            );
        },


        /* -------------------------------------------------
           Redo
           ------------------------------------------------- */

        canRedo() {

            return (
                this.redoStack.length >
                0
            );
        },


        /* -------------------------------------------------
           Undo Count
           ------------------------------------------------- */

        undoCount() {

            return this.undoStack.length;
        },


        /* -------------------------------------------------
           Redo Count
           ------------------------------------------------- */

        redoCount() {

            return this.redoStack.length;
        },


        /* =================================================
           Quick Insert
           ================================================= */

        quickInsertGroups() {

            if (
                typeof ZSCCommandDatabase ===
                "undefined"
            ) {
                return [];
            }


            if (
                Array.isArray(
                    ZSCCommandDatabase.groups
                )
            ) {
                return ZSCCommandDatabase.groups;
            }


            return [];
        },


        quickInsertCurrentGroup() {

            if (
                !this.quickInsertGroupId
            ) {
                return null;
            }


            return (
                this.quickInsertGroups.find(
                    group =>
                        group.id ===
                        this.quickInsertGroupId
                )

                || null
            );
        },


        quickInsertItems() {

            const group =
                this.quickInsertCurrentGroup;


            if (!group) {
                return [];
            }


            const keyword =
                (
                    this.quickInsertSearch ||
                    ""
                )
                .trim()
                .toLowerCase();


            if (!keyword) {
                return group.items || [];
            }


            return (
                group.items || []
            ).filter(item => {

                const name =
                    String(
                        item.name || ""
                    ).toLowerCase();


                const syntax =
                    String(
                        item.syntax || ""
                    ).toLowerCase();


                const description =
                    String(
                        item.description || ""
                    ).toLowerCase();


                return (

                    name.includes(keyword) ||

                    syntax.includes(keyword) ||

                    description.includes(keyword)

                );

            });
        }

    },


    /* =====================================================
       Methods
       ===================================================== */

    methods: {

        /*
         * editor.js 裡的所有編輯器功能
         * 都繼續掛進 Vue。
         */

        ...editorMethods,


        /* -------------------------------------------------
           Item Name
           ------------------------------------------------- */

        getItemName(item) {

            if (!item) {
                return "";
            }


            return (

                item.name ||

                item.label ||

                item.title ||

                item.id ||

                "(未命名)"

            );
        },


        /* =================================================
           Quick Insert
           ================================================= */


        /* -------------------------------------------------
           開啟快速插入
           ------------------------------------------------- */

        openQuickInsert() {

            this.quickInsertOpen =
                true;


            this.quickInsertSearch =
                "";


            this.quickInsertGroupId =
                "";


            this.quickInsertSelectedItem =
                null;

        },


        /* -------------------------------------------------
           關閉快速插入
           ------------------------------------------------- */

        closeQuickInsert() {

            this.quickInsertOpen =
                false;


            this.quickInsertSearch =
                "";


            this.quickInsertGroupId =
                "";


            this.quickInsertSelectedItem =
                null;

        },


        /* -------------------------------------------------
           切換快速插入
           ------------------------------------------------- */

        toggleQuickInsert() {

            if (
                this.quickInsertOpen
            ) {

                this.closeQuickInsert();

            }
            else {

                this.openQuickInsert();

            }

        },


        /* -------------------------------------------------
           選擇分類
           ------------------------------------------------- */

        selectQuickInsertGroup(
            group
        ) {

            if (!group) {
                return;
            }


            this.quickInsertGroupId =
                group.id;


            this.quickInsertSearch =
                "";


            this.quickInsertSelectedItem =
                null;

        },


        /* -------------------------------------------------
           返回分類
           ------------------------------------------------- */

        backQuickInsertGroups() {

            this.quickInsertGroupId =
                "";


            this.quickInsertSearch =
                "";


            this.quickInsertSelectedItem =
                null;

        },


        /* -------------------------------------------------
           選擇語法
           ------------------------------------------------- */

        selectQuickInsertItem(
            item
        ) {

            if (!item) {
                return;
            }


            this.quickInsertSelectedItem =
                item;

        },


        /* -------------------------------------------------
           取得目前 CodeMirror
           ------------------------------------------------- */

        getQuickInsertCodeMirror() {

            if (
                !window.ZSCCodemirror
            ) {
                return null;
            }


            if (
                typeof
                    window.ZSCCodemirror
                        .getInstance !==
                    "function"
            ) {
                return null;
            }


            return (
                window.ZSCCodemirror
                    .getInstance()
                || null
            );

        },


        /* -------------------------------------------------
           插入語法
           ------------------------------------------------- */

        insertQuickCommand(
            item
        ) {

            if (!item) {
                return;
            }


            const cm =
                this.getQuickInsertCodeMirror();


            if (!cm) {

                this.statusMessage =
                    "CodeMirror 尚未初始化";

                return;
            }


            /*
             * 優先使用 insert 欄位。
             *
             * 未來如果模板有：
             *
             * insert: "%random(${1},${2})"
             *
             * 可以直接使用。
             *
             * 目前資料庫沒有 insert，
             * 所以使用 syntax。
             */

            let text =
                item.insert ||
                item.syntax ||
                item.name ||
                "";


            if (!text) {
                return;
            }


            /*
             * 目前第一版：
             *
             * 不處理 ${1} 之類的參數跳轉。
             *
             * 後面可以再加入。
             */

            text =
                text.replace(
                    /\$\{\d+\}/g,
                    ""
                );


            /*
             * 取得目前游標位置
             */

            const cursor =
                cm.getCursor();


            /*
             * 插入文字
             */

            cm.replaceRange(
                text,
                cursor
            );


            /*
             * 將游標移到插入文字之後
             */

            const end =
                cm.getCursor();


            cm.focus();


            /*
             * CodeMirror 的 change
             * 事件會負責同步：
             *
             * formattedEditorValue
             * formattedHighlightValue
             * dirty
             */

            this.quickInsertSelectedItem =
                null;


            this.quickInsertSearch =
                "";


            this.quickInsertOpen =
                false;


            this.quickInsertGroupId =
                "";


            this.statusMessage =
                "已插入：" +
                (
                    item.syntax ||
                    item.name ||
                    text
                );

        },


        /* -------------------------------------------------
           直接插入目前選取的語法
           ------------------------------------------------- */

        insertSelectedQuickCommand() {

            if (
                !this.quickInsertSelectedItem
            ) {
                return;
            }


            this.insertQuickCommand(
                this.quickInsertSelectedItem
            );

        },


        /* -------------------------------------------------
           快速插入搜尋
           ------------------------------------------------- */

        clearQuickInsertSearch() {

            this.quickInsertSearch =
                "";

        }

    },


    /* =====================================================
       Mounted
       ===================================================== */

    mounted() {

        /* =================================================
           CodeMirror Change

           注意：

           這裡「只註冊事件」，
           不在 mounted() 裡初始化 CodeMirror。

           因為 mounted 時，
           #formatted-editor 可能還不存在。

           CodeMirror 會由
           editor.js 的 refreshFormattedEditor()
           在正確時機初始化。
           ================================================= */

        window.ZSCCodemirror.onChange(
            (value) => {

                if (
                    !this.selectedItem
                ) {

                    return;
                }


                this.formattedEditorValue =
                    value;


                /*
                 * 暫時保留。
                 *
                 * 舊版 highlight 使用這個值，
                 * 未來完全移除舊 overlay 時
                 * 可以再清理。
                 */

                this.formattedHighlightValue =
                    value;


                this.markModified();

            }
        );


        /* =================================================
           CodeMirror Blur
           ================================================= */

        window.ZSCCodemirror.onBlur(
            (value) => {

                if (
                    !this.selectedItem
                ) {

                    return;
                }


                this.formattedEditorValue =
                    value;


                this.formattedHighlightValue =
                    value;


                /*
                 * CodeMirror 顯示的格式化文字
                 *
                 * ↓
                 *
                 * 還原成 ZSC RAW
                 */

                this.selectedItem.content =
                    ZSCContent.unformat(
                        value
                    );


                /*
                 * RAW 編輯器同步
                 */

                this.rawEditorValue =
                    this.selectedItem.content;

            }
        );


        /* =================================================
           Drag Over
           ================================================= */

        window.addEventListener(
            "dragover",

            event => {

                event.preventDefault();

                this.dragging = true;

            }
        );


        /* =================================================
           Drop
           ================================================= */

        window.addEventListener(
            "drop",

            event => {

                event.preventDefault();

                this.dragging = false;

                this.handleDrop(
                    event
                );

            }
        );


        /* =================================================
           Before Unload
           ================================================= */

        window.addEventListener(
            "beforeunload",

            event => {

                if (
                    this.dirty
                ) {

                    event.preventDefault();

                    event.returnValue = "";

                }

            }
        );


        /* =================================================
           Undo / Redo
           ================================================= */

        window.addEventListener(
            "keydown",

            event => {

                /* -----------------------------------------
                   快速插入開啟時：
                   Escape 關閉快速插入
                   ----------------------------------------- */

                if (
                    this.quickInsertOpen &&
                    event.key === "Escape"
                ) {

                    event.preventDefault();

                    this.closeQuickInsert();

                    return;
                }


                /* -----------------------------------------
                   Ctrl + Shift + Z
                   ----------------------------------------- */

                if (
                    event.ctrlKey &&
                    event.shiftKey &&
                    event.key.toLowerCase() ===
                        "z"
                ) {

                    if (
                        this.canRedo
                    ) {

                        event.preventDefault();

                        this.redo();

                    }

                    return;
                }


                /* -----------------------------------------
                   Ctrl + Y
                   ----------------------------------------- */

                if (
                    event.ctrlKey &&
                    event.key.toLowerCase() ===
                        "y"
                ) {

                    if (
                        this.canRedo
                    ) {

                        event.preventDefault();

                        this.redo();

                    }

                    return;
                }


                /* -----------------------------------------
                   Ctrl + Z
                   ----------------------------------------- */

                if (
                    event.ctrlKey &&
                    !event.shiftKey &&
                    event.key.toLowerCase() ===
                        "z"
                ) {

                    if (
                        this.canUndo
                    ) {

                        event.preventDefault();

                        this.undo();

                    }

                    return;
                }

            }
        );

    }

}).mount("#app");