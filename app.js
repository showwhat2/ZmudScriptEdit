const { createApp } = Vue;


/* =====================================================
   ZSC Syntax Highlight
   ===================================================== */


/*
 * HTML 安全轉義
 */
function escapeHTML(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}


/*
 * ZSC 最外層指令。
 *
 * 放到函式外面，
 * 避免每次 highlight 都重新建立陣列。
 */
const ZSC_MAIN_COMMANDS =
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


/*
 * ZSC 語法高亮
 */
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

        const id =
            "___ZSC_TOKEN_" +
            tokens.length +
            "___";


        tokens.push({

            id,

            html:
                '<span class="' +
                className +
                '">' +
                value +
                '</span>'

        });


        return id;

    }


    // -----------------------------------------------------
    // 1. ALARM 週期
    // -----------------------------------------------------

    source =
        source.replace(
            /\{\*\d+(?:\.\d+)?\}/g,
            match =>
                token(
                    "zsc-alarm-time",
                    match
                )
        );


    // -----------------------------------------------------
    // 2. ZMUD / ZSC 指令
    // -----------------------------------------------------

    source =
        source.replace(
            /#[A-Za-z][A-Za-z0-9_+-]*/g,
            match => {

                const upper =
                    match.toUpperCase();


                if (
                    ZSC_MAIN_COMMANDS.has(
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


    // -----------------------------------------------------
    // 3. @變數
    // -----------------------------------------------------

    source =
        source.replace(
            /@[A-Za-z_][A-Za-z0-9_+\-]*/g,
            match =>
                token(
                    "zsc-variable",
                    match
                )
        );


    // -----------------------------------------------------
    // 4. 分號
    // -----------------------------------------------------

    source =
        source.replace(
            /;/g,
            match =>
                token(
                    "zsc-semicolon",
                    match
                )
        );


    // -----------------------------------------------------
    // 5. 數字
    // -----------------------------------------------------

    source =
        source.replace(
            /\b\d+(?:\.\d+)?\b/g,
            match =>
                token(
                    "zsc-number",
                    match
                )
        );


    // -----------------------------------------------------
    // 6. 大括號
    // -----------------------------------------------------

    source =
        source.replace(
            /[{}]/g,
            match =>
                token(
                    "zsc-brace",
                    match
                )
        );


    // -----------------------------------------------------
    // 7. 還原 token
    // -----------------------------------------------------

    for (
        let i = tokens.length - 1;
        i >= 0;
        i--
    ) {

        source =
            source.replace(
                tokens[i].id,
                tokens[i].html
            );

    }


    return source;

}


/* =====================================================
   Vue Application
   ===================================================== */

createApp({

    data() {

        return {

            // =============================================
            // 檔案
            // =============================================

            sourceText: "",

            fileName: "",

            items: [],

            selectedUid: null,


            // =============================================
            // 批量刪除
            // =============================================

            checkedDeleteUids: [],


            // =============================================
            // Undo / Redo
            // =============================================

            undoStack: [],

            redoStack: [],

            historyRestoring: false,

            typingHistoryStarted: false,

            historySnapshot: null,


            // =============================================
            // 搜尋
            // =============================================

            searchText: "",


            // =============================================
            // 編碼
            // =============================================

            readEncoding: "auto",

            detectedEncoding: "utf-8",

            saveEncoding: "big5",


            // =============================================
            // 狀態
            // =============================================

            dirty: false,

            dragging: false,

            statusMessage:
                "請開啟 .zsc 檔案",


            // =============================================
            // 分類
            // =============================================

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


            // =============================================
            // 編輯器
            // =============================================

            rawEditorValue: "",

            formattedEditorValue: "",


            /*
             * Syntax Highlight 專用。
             *
             * 注意：
             *
             * formattedEditorValue
             * = textarea 目前真正輸入的文字
             *
             * formattedHighlightValue
             * = 高亮層目前要顯示的文字
             *
             * 兩者分開後，
             * textarea 不需要因為 highlight 更新
             * 而被重新設定。
             */
            formattedHighlightValue: "",


            /*
             * requestAnimationFrame ID
             */
            highlightFrameId: null,


            /*
             * Raw → Formatted 延遲更新
             */
            rawFormatTimer: null,


            /*
             * requestAnimationFrame 尚未處理的文字
             */
            pendingHighlightValue: ""

        };

    },


    // =====================================================
    // Computed
    // =====================================================

    computed: {

        // -------------------------------------------------
        // 目前選取項目
        // -------------------------------------------------

        selectedItem() {

            return (

                this.items.find(
                    item =>
                        item.uid ===
                        this.selectedUid
                )

                ||

                null

            );

        },


        // -------------------------------------------------
        // 格式化文字
        // -------------------------------------------------

        formattedText() {

            if (!this.selectedItem) {

                return "";

            }


            return ZSCContent.format(
                this.selectedItem.content || ""
            );

        },


        // -------------------------------------------------
        // Syntax Highlight
        // -------------------------------------------------

        formattedHighlighted() {

            return highlightZSC(
                this.formattedHighlightValue
            );

        },


        // -------------------------------------------------
        // 行數
        // -------------------------------------------------

        lineCount() {

            if (!this.selectedItem) {

                return 0;

            }


            const text =
                this.selectedItem.content || "";


            if (!text) {

                return 0;

            }


            return text.split(
                /\r?\n/
            ).length;

        },


        // -------------------------------------------------
        // 編碼
        // -------------------------------------------------

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


        // -------------------------------------------------
        // Undo
        // -------------------------------------------------

        canUndo() {

            return (
                this.undoStack.length > 0
            );

        },


        // -------------------------------------------------
        // Redo
        // -------------------------------------------------

        canRedo() {

            return (
                this.redoStack.length > 0
            );

        },


        // -------------------------------------------------
        // Undo 數量
        // -------------------------------------------------

        undoCount() {

            return this.undoStack.length;

        },


        // -------------------------------------------------
        // Redo 數量
        // -------------------------------------------------

        redoCount() {

            return this.redoStack.length;

        }

    },


    // =====================================================
    // Methods
    // =====================================================

    methods: {

        ...editorMethods,


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

        }

    },


    // =====================================================
    // Mounted
    // =====================================================

    mounted() {

        // ===============================================
        // Drag Over
        // ===============================================

        window.addEventListener(
            "dragover",
            event => {

                event.preventDefault();

                this.dragging =
                    true;

            }
        );


        // ===============================================
        // Drop
        // ===============================================

        window.addEventListener(
            "drop",
            event => {

                event.preventDefault();

                this.dragging =
                    false;

                this.handleDrop(
                    event
                );

            }
        );


        // ===============================================
        // 離開頁面
        // ===============================================

        window.addEventListener(
            "beforeunload",
            event => {

                if (this.dirty) {

                    event.preventDefault();

                    event.returnValue =
                        "";

                }

            }
        );


        // ===============================================
        // Undo / Redo
        // ===============================================

        window.addEventListener(
            "keydown",
            event => {

                // -----------------------------------------
                // Ctrl + Shift + Z
                // -----------------------------------------

                if (
                    event.ctrlKey &&
                    event.shiftKey &&
                    event.key.toLowerCase() ===
                    "z"
                ) {

                    if (this.canRedo) {

                        event.preventDefault();

                        this.redo();

                    }

                    return;

                }


                // -----------------------------------------
                // Ctrl + Y
                // -----------------------------------------

                if (
                    event.ctrlKey &&
                    event.key.toLowerCase() ===
                    "y"
                ) {

                    if (this.canRedo) {

                        event.preventDefault();

                        this.redo();

                    }

                    return;

                }


                // -----------------------------------------
                // Ctrl + Z
                // -----------------------------------------

                if (
                    event.ctrlKey &&
                    !event.shiftKey &&
                    event.key.toLowerCase() ===
                    "z"
                ) {

                    if (this.canUndo) {

                        event.preventDefault();

                        this.undo();

                    }

                    return;

                }

            }
        );

    },


    // =====================================================
    // Unmounted
    // =====================================================

    beforeUnmount() {

        this.cancelEditorTimers();

    }

}).mount("#app");