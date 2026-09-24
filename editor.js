/* =========================================================
   ZSC Editor Methods
   ========================================================= */

const editorMethods = {

    /* =========================================================
       History
       ========================================================= */

    cloneHistoryState() {

        return {
            items: JSON.parse(
                JSON.stringify(this.items)
            ),

            selectedUid: this.selectedUid,

            checkedDeleteUids: [
                ...(this.checkedDeleteUids || [])
            ],

            dirty: this.dirty
        };
    },


    updateHistorySnapshot() {

        if (this.historyRestoring) {
            return;
        }

        this.historySnapshot =
            this.cloneHistoryState();
    },


    historyStatesEqual(a, b) {

        if (!a || !b) {
            return false;
        }

        return JSON.stringify(a) ===
            JSON.stringify(b);
    },


    saveHistory() {

        if (this.historyRestoring) {
            return;
        }

        const state =
            this.cloneHistoryState();

        this.undoStack.push(state);

        this.redoStack = [];

        const MAX_HISTORY = 100;

        if (
            this.undoStack.length >
            MAX_HISTORY
        ) {
            this.undoStack.shift();
        }
    },


    recordModifiedHistory() {

        if (this.historyRestoring) {
            return;
        }

        if (!this.historySnapshot) {

            this.historySnapshot =
                this.cloneHistoryState();

            return;
        }

        if (this.typingHistoryStarted) {
            return;
        }

        const current =
            this.cloneHistoryState();

        if (
            !this.historyStatesEqual(
                current,
                this.historySnapshot
            )
        ) {

            this.undoStack.push(
                this.historySnapshot
            );

            this.redoStack = [];

            const MAX_HISTORY = 100;

            if (
                this.undoStack.length >
                MAX_HISTORY
            ) {
                this.undoStack.shift();
            }

            this.typingHistoryStarted = true;
        }
    },


    restoreHistoryState(state) {

        if (!state) {
            return;
        }

        this.historyRestoring = true;

        this.items =
            JSON.parse(
                JSON.stringify(
                    state.items || []
                )
            );

        this.selectedUid =
            state.selectedUid || null;

        this.checkedDeleteUids = [
            ...(state.checkedDeleteUids || [])
        ];

        this.dirty =
            state.dirty !== false;

        const item =
            this.items.find(
                item =>
                    item.uid ===
                    this.selectedUid
            );

        if (item) {
            this.prepareSpecialProperties(item);
        }

        this.refreshEditors();

        this.historyRestoring = false;

        this.updateHistorySnapshot();

        this.typingHistoryStarted = false;
    },


    undo() {

        if (
            !this.undoStack ||
            this.undoStack.length === 0
        ) {

            this.statusMessage =
                "沒有可以復原的操作";

            return;
        }

        this.finishTypingHistory();

        const currentState =
            this.cloneHistoryState();

        this.redoStack.push(
            currentState
        );

        const previousState =
            this.undoStack.pop();

        this.restoreHistoryState(
            previousState
        );

        this.statusMessage =
            "已復原上一步";
    },


    redo() {

        if (
            !this.redoStack ||
            this.redoStack.length === 0
        ) {

            this.statusMessage =
                "沒有可以重做的操作";

            return;
        }

        this.finishTypingHistory();

        const currentState =
            this.cloneHistoryState();

        this.undoStack.push(
            currentState
        );

        const nextState =
            this.redoStack.pop();

        this.restoreHistoryState(
            nextState
        );

        this.statusMessage =
            "已重做下一步";
    },


    clearHistory() {

        this.undoStack = [];

        this.redoStack = [];

        this.typingHistoryStarted = false;

        this.historySnapshot = null;
    },


    /* =========================================================
       Editor Commit
       ========================================================= */

    /*
     * FORMATTED → RAW
     *
     * CodeMirror 是 FORMATTED 的真正資料來源。
     *
     * 特殊處理：
     *
     * FUNC 是純文字／數值內容，
     * 不使用 ZSCContent.unformat()，
     * 因為 unformat() 會自動補上分號。
     */

    commitFormattedEditor() {

        if (!this.selectedItem) {
            return;
        }


        let value = "";


        /*
         * 優先從 CodeMirror 取得內容。
         */

        if (
            window.ZSCCodemirror &&
            typeof
                window.ZSCCodemirror.getValue ===
                "function"
        ) {

            const cm =
                window.ZSCCodemirror.getInstance();

            if (cm) {

                value =
                    window.ZSCCodemirror.getValue();

            }
            else {

                value =
                    this.formattedEditorValue ||
                    "";
            }

        }
        else {

            value =
                this.formattedEditorValue ||
                "";
        }


        this.formattedEditorValue =
            value;

        this.formattedHighlightValue =
            value;


        /*
         * -----------------------------------------------------
         * FUNC 特殊處理
         * -----------------------------------------------------
         *
         * FUNC 內容是純文字／數值。
         *
         * 不經過 unformat()，
         * 避免：
         *
         *     12345
         *
         * 被轉成：
         *
         *     12345;
         */

        let raw;


        if (
            this.selectedItem.type ===
            "FUNC"
        ) {

            raw =
                value;

        }
        else {

            raw =
                ZSCContent.unformat(
                    value
                );
        }


        this.selectedItem.content =
            raw;

        this.rawEditorValue =
            raw;
    },


    /*
     * RAW → item
     */

    commitRawEditor() {

        if (!this.selectedItem) {
            return;
        }


        const input =
            document.getElementById(
                "raw-editor"
            );


        if (!input) {
            return;
        }


        const value =
            input.value;


        this.rawEditorValue =
            value;

        this.selectedItem.content =
            value;


        /*
         * RAW → FORMATTED
         */

        const formatted =
            ZSCContent.format(
                value
            );


        this.formattedEditorValue =
            formatted;

        this.formattedHighlightValue =
            formatted;


        /*
         * CodeMirror 更新。
         */

        this.$nextTick(() => {

            if (
                window.ZSCCodemirror
            ) {

                const cm =
                    window.ZSCCodemirror
                        .getInstance();

                if (cm) {

                    window.ZSCCodemirror
                        .setValue(
                            formatted
                        );
                }
            }

        });
    },


    /*
     * 提交目前正在使用的編輯器。
     */

    commitActiveEditor() {

        if (!this.selectedItem) {
            return;
        }


        /*
         * 如果 CodeMirror 已經初始化，
         * 它就是 FORMATTED 的真正資料來源。
         */

        if (
            window.ZSCCodemirror &&
            window.ZSCCodemirror.getInstance()
        ) {

            this.commitFormattedEditor();

            return;
        }


        /*
         * 否則檢查 RAW。
         */

        const active =
            document.activeElement;


        if (
            active &&
            active.id ===
                "raw-editor"
        ) {

            this.commitRawEditor();

            return;
        }


        /*
         * 沒有 focus 時，
         * 使用目前 FORMATTED 值。
         */

        if (
            this.formattedEditorValue !==
            ZSCContent.format(
                this.rawEditorValue || ""
            )
        ) {

            this.commitFormattedEditor();
        }
    },


    /* =========================================================
       Finish Typing
       ========================================================= */

    finishTypingHistory() {

        if (!this.selectedItem) {
            return;
        }


        /*
         * -----------------------------------------------------
         * CodeMirror
         * -----------------------------------------------------
         */

        if (
            window.ZSCCodemirror &&
            typeof
                window.ZSCCodemirror.getValue ===
                "function"
        ) {

            const cm =
                window.ZSCCodemirror.getInstance();

            if (cm) {

                const value =
                    window.ZSCCodemirror.getValue();


                this.formattedEditorValue =
                    value;

                this.formattedHighlightValue =
                    value;


                /*
                 * -------------------------------------------------
                 * FUNC 特殊處理
                 * -------------------------------------------------
                 *
                 * FUNC 不使用 unformat()，
                 * 避免自動加入分號。
                 */

                if (
                    this.selectedItem.type ===
                    "FUNC"
                ) {

                    this.selectedItem.content =
                        value;

                }
                else {

                    this.selectedItem.content =
                        ZSCContent.unformat(
                            value
                        );
                }


                this.rawEditorValue =
                    this.selectedItem.content;
            }
        }


        /*
         * -----------------------------------------------------
         * History
         * -----------------------------------------------------
         */

        this.typingHistoryStarted =
            false;

        this.historySnapshot =
            this.cloneHistoryState();
    },


    /* =========================================================
       File
       ========================================================= */

    openFile() {

        const input =
            document.createElement(
                "input"
            );

        input.type = "file";

        input.accept = ".zsc";


        input.addEventListener(
            "change",
            event => {

                const file =
                    event.target.files[0];

                if (!file) {
                    return;
                }

                this.loadFile(file);
            }
        );


        input.click();
    },


    parseAlarmProperties(item) {

        if (
            !item ||
            item.type !== "ALARM"
        ) {
            return;
        }


        const raw =
            item.intervalRaw || "";


        const match =
            raw.match(
                /^\{\*(\d+(?:\.\d+)?)\}$/
            );


        if (match) {

            item.interval =
                Number(match[1]);
        }
    },


    buildAlarmInterval(item) {

        if (item.intervalRaw) {
            return item.intervalRaw;
        }


        if (
            item.interval !== undefined &&
            item.interval !== null &&
            item.interval !== ""
        ) {

            return "{*" +
                item.interval +
                "}";
        }


        return "{*0}";
    },


    prepareSpecialProperties(item) {

        if (!item) {
            return;
        }


        if (
            item.type === "TRIGGER"
        ) {

            if (
                item.triggerPattern ===
                undefined
            ) {

                item.triggerPattern =
                    "";
            }


            if (
                item.zmudValue ===
                undefined
            ) {

                item.zmudValue =
                    "";
            }
        }


        if (
            item.type === "ALARM"
        ) {

            if (
                item.intervalRaw ===
                undefined
            ) {

                item.intervalRaw =
                    "";
            }


            if (
                item.interval ===
                undefined
            ) {

                item.interval =
                    0;
            }


            if (
                item.zmudValue ===
                undefined
            ) {

                item.zmudValue =
                    "";
            }


            this.parseAlarmProperties(
                item
            );
        }
    },


    handleFileInput(event) {

        const file =
            event.target.files[0];

        if (!file) {
            return;
        }

        this.loadFile(file);

        event.target.value = "";
    },


    handleDrop(event) {

        const files =
            event.dataTransfer &&
            event.dataTransfer.files;


        if (
            !files ||
            files.length === 0
        ) {
            return;
        }


        const file =
            files[0];


        if (
            !file.name
                .toLowerCase()
                .endsWith(".zsc")
        ) {

            this.statusMessage =
                "請放入 .zsc 檔案";

            return;
        }


        this.loadFile(file);
    },


    async loadFile(file) {

        try {

            const buffer =
                await file.arrayBuffer();


            let encoding =
                this.readEncoding;


            if (
                encoding === "auto" ||
                !encoding
            ) {

                encoding =
                    Big5Util.detectEncoding(
                        buffer
                    );
            }


            const text =
                Big5Util.decodeText(
                    buffer,
                    encoding
                );


            const parsed =
                parseZSC(text);


            this.sourceText =
                text;

            this.fileName =
                file.name;

            this.detectedEncoding =
                encoding;


            this.items =
                parsed.items ||
                parsed ||
                [];


            this.selectedUid =
                null;

            this.checkedDeleteUids =
                [];

            this.dirty =
                false;


            this.statusMessage =
                "已開啟：" +
                file.name;


            this.clearHistory();


            this.types.forEach(
                type => {

                    if (
                        typeof
                        this.expandedCategories[type]
                        !== "boolean"
                    ) {

                        this.expandedCategories[type] =
                            true;
                    }
                }
            );


            const firstItem =
                this.items.find(
                    item =>
                        !item.deleted &&
                        this.categories[
                            item.type
                        ] !== false
                );


            if (firstItem) {

                this.selectedUid =
                    firstItem.uid;

                this.prepareSpecialProperties(
                    firstItem
                );
            }


            this.refreshEditors();

            this.updateHistorySnapshot();

        }
        catch (error) {

            console.error(
                "讀取 ZSC 失敗：",
                error
            );


            this.statusMessage =
                "讀取檔案失敗：" +
                (
                    error.message ||
                    error
                );
        }
    },


    newFile() {

        if (
            this.dirty &&
            !confirm(
                "目前檔案尚未儲存，確定要建立新檔案嗎？"
            )
        ) {
            return;
        }


        this.finishTypingHistory();


        this.sourceText = "";

        this.fileName = "";

        this.items = [];

        this.selectedUid = null;

        this.checkedDeleteUids = [];

        this.searchText = "";

        this.detectedEncoding =
            "utf-8";

        this.dirty = false;

        this.statusMessage =
            "已建立新檔案";


        this.clearHistory();


        this.types.forEach(
            type => {

                this.expandedCategories[type] =
                    true;
            }
        );


        this.refreshEditors();

        this.updateHistorySnapshot();
    },


    /* =========================================================
       List
       ========================================================= */

    itemsByType(type) {

        const keyword =
            (this.searchText || "")
                .trim()
                .toLowerCase();


        return this.items.filter(
            item => {

                if (
                    item.type !== type
                ) {
                    return false;
                }


                if (item.deleted) {
                    return false;
                }


                if (!keyword) {
                    return true;
                }


                const name =
                    String(
                        item.name || ""
                    ).toLowerCase();


                const content =
                    String(
                        item.content || ""
                    ).toLowerCase();


                return (
                    name.includes(keyword) ||
                    content.includes(keyword)
                );
            }
        );
    },


    filteredItems() {

        const keyword =
            (this.searchText || "")
                .trim()
                .toLowerCase();


        return this.items.filter(
            item => {

                if (item.deleted) {
                    return false;
                }


                if (
                    this.categories[
                        item.type
                    ] === false
                ) {
                    return false;
                }


                if (!keyword) {
                    return true;
                }


                const name =
                    String(
                        item.name || ""
                    ).toLowerCase();


                const content =
                    String(
                        item.content || ""
                    ).toLowerCase();


                return (
                    name.includes(keyword) ||
                    content.includes(keyword)
                );
            }
        );
    },


    isCategoryExpanded(type) {

        return (
            this.expandedCategories[type] === true
        );
    },


    toggleCategory(type) {

        this.expandedCategories[type] =
            !this.expandedCategories[type];
    },


    expandAllCategories() {

        this.types.forEach(
            type => {

                this.expandedCategories[type] =
                    true;
            }
        );
    },


    collapseAllCategories() {

        this.types.forEach(
            type => {

                this.expandedCategories[type] =
                    false;
            }
        );
    },


    toggleCategoryVisibility(type) {

        this.categories[type] =
            !this.categories[type];
    },


    countType(type) {

        return this.items.filter(
            item =>
                item.type === type &&
                !item.deleted
        ).length;
    },


    selectItem(uid) {

        /*
         * 切換前先提交目前內容。
         */

        this.finishTypingHistory();


        this.selectedUid =
            uid;


        const item =
            this.items.find(
                item =>
                    item.uid === uid
            );


        if (item) {

            this.prepareSpecialProperties(
                item
            );
        }


        this.refreshEditors();

        this.updateHistorySnapshot();
    },


    /* =========================================================
       Add
       ========================================================= */

    addItem(type) {

        this.finishTypingHistory();

        this.saveHistory();


        const uid =
            "item_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .slice(2, 8);


        const item = {

            uid,

            type,

            name: "",

            content: "",

            deleted: false,

            isNew: true
        };


        this.items.push(item);


        this.expandedCategories[type] =
            true;

        this.categories[type] =
            true;


        this.selectedUid =
            uid;


        this.prepareSpecialProperties(
            item
        );


        this.dirty =
            true;


        this.statusMessage =
            "已新增 " +
            type;


        this.refreshEditors();

        this.updateHistorySnapshot();
    },


    /* =========================================================
       Modified
       ========================================================= */

    markModified() {

        this.recordModifiedHistory();


        this.dirty =
            true;


        if (this.selectedItem) {

            this.selectedItem.modified =
                true;
        }


        this.statusMessage =
            "有未儲存的修改";
    },


    /* =========================================================
       RAW Input
       ========================================================= */

    onRawInput(event) {

        if (!this.selectedItem) {
            return;
        }


        const value =
            event.target.value;


        /*
         * 這裡直接保存 RAW。
         *
         * 不重新建立 textarea。
         */

        this.rawEditorValue =
            value;


        this.selectedItem.content =
            value;


        this.markModified();


        /*
         * RAW → FORMATTED
         *
         * 延遲更新，
         * 避免打字時一直重建編輯器。
         */

        this.scheduleRawFormattedRefresh();
    },


    /* =========================================================
       FORMATTED Input
       ========================================================= */

    onFormattedInput(event) {

        /*
         * CodeMirror 現在自己管理輸入。
         *
         * 所以這個方法只保留給舊程式相容，
         * 不再直接依賴 textarea.value。
         */

        if (!this.selectedItem) {
            return;
        }


        let value = "";


        if (
            window.ZSCCodemirror &&
            window.ZSCCodemirror.getInstance()
        ) {

            value =
                window.ZSCCodemirror.getValue();

        }
        else if (
            event &&
            event.target
        ) {

            value =
                event.target.value;
        }


        this.formattedEditorValue =
            value;

        this.formattedHighlightValue =
            value;

        this.markModified();
    },


    /* =========================================================
       RAW → FORMATTED 延遲更新
       ========================================================= */

    scheduleRawFormattedRefresh() {

        if (this.__zscRawFormatTimer) {

            clearTimeout(
                this.__zscRawFormatTimer
            );
        }


        this.__zscRawFormatTimer =
            setTimeout(() => {

                this.__zscRawFormatTimer =
                    null;


                if (!this.selectedItem) {
                    return;
                }


                const input =
                    document.getElementById(
                        "raw-editor"
                    );


                /*
                 * 只有使用者目前仍然在 RAW
                 * 編輯器時才同步。
                 */

                if (
                    input &&
                    document.activeElement !== input
                ) {
                    return;
                }


                const formatted =
                    ZSCContent.format(
                        this.selectedItem.content ||
                        ""
                    );


                this.formattedEditorValue =
                    formatted;

                this.formattedHighlightValue =
                    formatted;


                /*
                 * 更新 CodeMirror。
                 *
                 * 注意：
                 * 只有 RAW 正在編輯時才做。
                 */

                if (
                    window.ZSCCodemirror &&
                    window.ZSCCodemirror.getInstance()
                ) {

                    window.ZSCCodemirror
                        .setValue(
                            formatted
                        );
                }

            }, 300);
    },


    /* =========================================================
       Syntax Highlight
       ========================================================= */

    scheduleSyntaxHighlight(value) {

        /*
         * CodeMirror 已經負責語法顏色。
         *
         * 所以這裡不再操作舊的
         * formatted-highlight。
         */

        this.formattedHighlightValue =
            value;
    },


    /* =========================================================
       Editor Refresh
       ========================================================= */

    refreshRawEditor() {

        if (!this.selectedItem) {

            this.rawEditorValue =
                "";

            return;
        }


        this.rawEditorValue =
            this.selectedItem.content ||
            "";
    },


    /* =========================================================
       CodeMirror FORMATTED
       ========================================================= */

    refreshFormattedEditor() {

        /*
         * 沒有選取項目。
         */

        if (!this.selectedItem) {

            this.formattedEditorValue =
                "";

            this.formattedHighlightValue =
                "";


            this.$nextTick(() => {

                if (
                    window.ZSCCodemirror &&
                    window.ZSCCodemirror.getInstance()
                ) {

                    window.ZSCCodemirror
                        .setValue("");
                }

            });

            return;
        }


        /*
         * 先產生格式化內容。
         */

        const formatted =
            ZSCContent.format(
                this.selectedItem.content ||
                ""
            );


        this.formattedEditorValue =
            formatted;

        this.formattedHighlightValue =
            formatted;


        /*
         * 非常重要：
         *
         * Vue 必須先把
         *
         * #formatted-editor
         *
         * 建立出來。
         */

        this.$nextTick(() => {

            if (
                !window.ZSCCodemirror
            ) {

                console.error(
                    "ZSCCodemirror 尚未載入"
                );

                return;
            }


            let cm =
                window.ZSCCodemirror
                    .getInstance();


            /*
             * 尚未初始化。
             */

            if (!cm) {

                const textarea =
                    document.getElementById(
                        "formatted-editor"
                    );


                if (!textarea) {

                    console.warn(
                        "找不到 #formatted-editor"
                    );

                    return;
                }


                console.log(
                    "refreshFormattedEditor：初始化 CodeMirror"
                );


                cm =
                    window.ZSCCodemirror
                        .init(
                            textarea
                        );
            }


            /*
             * CodeMirror 初始化完成後，
             * 才放入內容。
             */

            if (cm) {

                window.ZSCCodemirror
                    .setValue(
                        formatted
                    );


                /*
                 * 確保游標不要停留在奇怪的位置。
                 */

                cm.setCursor({
                    line: 0,
                    ch: 0
                });
            }

        });
    },


    /* =========================================================
       Syntax Highlight
       ========================================================= */

    refreshSyntaxHighlight() {

        /*
         * 舊版 overlay 已經移除。
         *
         * CodeMirror 自己負責：
         *
         * 文字
         * 顏色
         * 捲動
         * 語法標記
         *
         * 因此這裡故意不再尋找
         * #formatted-highlight。
         */

        return;
    },


    /* =========================================================
       Refresh All Editors
       ========================================================= */

    refreshEditors() {

        /*
         * 清除 RAW 延遲更新。
         */

        if (
            this.__zscRawFormatTimer
        ) {

            clearTimeout(
                this.__zscRawFormatTimer
            );

            this.__zscRawFormatTimer =
                null;
        }


        /*
         * RAW
         */

        this.refreshRawEditor();


        /*
         * FORMATTED
         */

        this.refreshFormattedEditor();


        /*
         * 舊 highlight 不再需要。
         */

        this.refreshSyntaxHighlight();
    },


    /* =========================================================
       Reset
       ========================================================= */

    resetSelectedItem() {

        if (!this.selectedItem) {
            return;
        }


        if (
            !confirm(
                "確定要放棄目前項目的修改嗎？"
            )
        ) {
            return;
        }


        this.finishTypingHistory();


        if (
            this.selectedItem.isNew
        ) {

            this.saveHistory();


            const uid =
                this.selectedItem.uid;


            this.items =
                this.items.filter(
                    item =>
                        item.uid !== uid
                );


            this.selectedUid =
                null;


            this.refreshEditors();

            this.updateDirty();

            this.updateHistorySnapshot();

            return;
        }


        /*
         * 目前仍維持原本行為：
         * 重新顯示目前 item。
         */

        this.refreshEditors();

        this.updateDirty();
    },


    /* =========================================================
       Apply
       ========================================================= */

    applyItem() {

        if (!this.selectedItem) {
            return;
        }


        /*
         * CodeMirror 存在時，
         * 一律以 CodeMirror 內容為準。
         */

        if (
            window.ZSCCodemirror &&
            window.ZSCCodemirror.getInstance()
        ) {

            this.commitFormattedEditor();

        }
        else {

            /*
             * CodeMirror 尚未初始化時，
             * 使用 RAW。
             */

            const rawInput =
                document.getElementById(
                    "raw-editor"
                );


            if (
                rawInput &&
                document.activeElement ===
                    rawInput
            ) {

                this.commitRawEditor();
            }
        }


        this.markModified();


        this.refreshEditors();


        this.statusMessage =
            "已套用目前項目的修改";


        this.updateHistorySnapshot();
    },


    /* =========================================================
       Delete
       ========================================================= */

    deleteItem() {

        if (!this.selectedItem) {
            return;
        }


        if (
            !confirm(
                "確定要刪除目前項目嗎？"
            )
        ) {
            return;
        }


        this.finishTypingHistory();

        this.saveHistory();


        const uid =
            this.selectedItem.uid;


        if (
            this.selectedItem.isNew
        ) {

            this.items =
                this.items.filter(
                    item =>
                        item.uid !== uid
                );

        }
        else {

            this.selectedItem.deleted =
                true;
        }


        this.checkedDeleteUids =
            this.checkedDeleteUids.filter(
                id =>
                    id !== uid
            );


        this.selectedUid =
            null;


        this.dirty =
            true;


        this.statusMessage =
            "項目已標記刪除";


        this.refreshEditors();

        this.updateHistorySnapshot();
    },


    /* =========================================================
       Batch Delete
       ========================================================= */

    deleteSelectedItems() {

        const selectedIds =
            this.checkedDeleteUids || [];


        if (
            selectedIds.length === 0
        ) {

            this.statusMessage =
                "目前沒有勾選任何項目";

            return;
        }


        const targets =
            this.items.filter(
                item =>
                    selectedIds.includes(
                        item.uid
                    ) &&
                    !item.deleted
            );


        if (
            targets.length === 0
        ) {

            this.checkedDeleteUids =
                [];

            this.statusMessage =
                "目前沒有可以刪除的項目";

            return;
        }


        const counts = {};


        for (
            const item of targets
        ) {

            if (!counts[item.type]) {

                counts[item.type] =
                    0;
            }

            counts[item.type]++;
        }


        const summary =
            Object.entries(counts)
                .map(
                    ([type, count]) =>
                        type +
                        "：" +
                        count +
                        " 個"
                )
                .join("\n");


        if (
            !confirm(
                "確定要刪除勾選的項目嗎？\n\n" +
                summary +
                "\n\n合計：" +
                targets.length +
                " 個\n\n" +
                "刪除後需要按「儲存」才會真正寫入 ZSC 檔案。"
            )
        ) {
            return;
        }


        this.finishTypingHistory();

        this.saveHistory();


        this.items =
            this.items.filter(
                item => {

                    if (
                        !selectedIds.includes(
                            item.uid
                        )
                    ) {
                        return true;
                    }


                    if (
                        item.isNew
                    ) {
                        return false;
                    }


                    item.deleted =
                        true;

                    return true;
                }
            );


        if (
            this.selectedUid &&
            selectedIds.includes(
                this.selectedUid
            )
        ) {

            this.selectedUid =
                null;
        }


        this.checkedDeleteUids =
            [];


        this.dirty =
            true;


        this.statusMessage =
            "已刪除勾選項目（" +
            targets.length +
            " 個）";


        this.refreshEditors();

        this.updateHistorySnapshot();
    },


    /* =========================================================
       Delete All
       ========================================================= */

    deleteAllItems(type) {

        const targets =
            this.items.filter(
                item =>
                    item.type === type &&
                    !item.deleted
            );


        if (
            targets.length === 0
        ) {

            this.statusMessage =
                type +
                " 沒有可以刪除的項目";

            return;
        }


        if (
            !confirm(
                "確定要刪除全部 " +
                type +
                " 嗎？\n\n共 " +
                targets.length +
                " 個項目。\n\n" +
                "刪除後需要按「儲存」才會真正寫入 ZSC 檔案。"
            )
        ) {
            return;
        }


        this.finishTypingHistory();

        this.saveHistory();


        this.items =
            this.items.filter(
                item => {

                    if (
                        item.type !== type ||
                        item.deleted
                    ) {
                        return true;
                    }


                    if (
                        item.isNew
                    ) {
                        return false;
                    }


                    item.deleted =
                        true;

                    return true;
                }
            );


        const deletedIds =
            targets.map(
                item =>
                    item.uid
            );


        this.checkedDeleteUids =
            this.checkedDeleteUids.filter(
                uid =>
                    !deletedIds.includes(
                        uid
                    )
            );


        if (
            this.selectedItem &&
            this.selectedItem.type === type
        ) {

            this.selectedUid =
                null;
        }


        this.dirty =
            true;


        this.statusMessage =
            "已刪除全部 " +
            type +
            "（" +
            targets.length +
            " 個）";


        /*
         * 這裡原本錯誤地寫成：
         *
         * refreshFormattedEditor();
         *
         * 必須使用 this。
         */

        this.refreshEditors();

        this.updateHistorySnapshot();
    },


    /* =========================================================
       Dirty
       ========================================================= */

    updateDirty() {

        this.dirty =
            this.items.some(
                item =>
                    item.isNew ||
                    item.deleted ||
                    item.modified
            );
    },


    /* =========================================================
       Build Raw
       ========================================================= */

    buildItemRaw(item) {

        if (!item) {
            return "";
        }


        if (
            item.type === "ALARM"
        ) {

            const intervalRaw =
                this.buildAlarmInterval(
                    item
                );


            const content =
                item.content || "";


            const name =
                item.name || "";


            const zmudValue =
                item.zmudValue || "";


            return (
                "#ALARM " +
                intervalRaw +
                " {" +
                content +
                "} {" +
                name +
                "} " +
                zmudValue
            );
        }


        if (
            item.type === "TRIGGER"
        ) {

            const triggerPattern =
                item.triggerPattern || "";


            const content =
                item.content || "";


            const name =
                item.name || "";


            const zmudValue =
                item.zmudValue || "";


            return (
                "#TRIGGER {" +
                triggerPattern +
                "} {" +
                content +
                "} {" +
                name +
                "} " +
                zmudValue
            );
        }


        return (
            item.raw ||
            item.content ||
            ""
        );
    },


    /* =========================================================
       Build ZSC
       ========================================================= */

    buildZSC() {

        /*
         * 儲存前提交目前編輯內容。
         */

        this.commitActiveEditor();


        let output = "";

        let cursor = 0;


        for (
            const item of this.items
        ) {

            if (
                item.deleted &&
                item.start !== undefined &&
                item.end !== undefined
            ) {

                output +=
                    this.sourceText.slice(
                        cursor,
                        item.start
                    );


                cursor =
                    item.end;


                continue;
            }


            if (
                !item.isNew &&
                item.start !== undefined &&
                item.end !== undefined
            ) {

                output +=
                    this.sourceText.slice(
                        cursor,
                        item.start
                    );


                output +=
                    this.buildItemRaw(
                        item
                    );


                cursor =
                    item.end;


                continue;
            }


            if (
                item.isNew
            ) {

                output +=
                    this.buildItemRaw(
                        item
                    );
            }
        }


        output +=
            this.sourceText.slice(
                cursor
            );


        return output;
    },


    /* =========================================================
       Save
       ========================================================= */

    async saveFile() {

        try {

            this.finishTypingHistory();


            const output =
                this.buildZSC();


            const buffer =
                Big5Util.encodeText(
                    output,
                    this.saveEncoding
                );


            const blob =
                new Blob(
                    [buffer],
                    {
                        type:
                            "application/octet-stream"
                    }
                );


            let name =
                this.fileName ||
                "new.zsc";


            if (
                !name
                    .toLowerCase()
                    .endsWith(".zsc")
            ) {

                name += ".zsc";
            }


            const url =
                URL.createObjectURL(
                    blob
                );


            const link =
                document.createElement(
                    "a"
                );


            link.href =
                url;

            link.download =
                name;


            document.body.appendChild(
                link
            );


            link.click();


            link.remove();


            URL.revokeObjectURL(
                url
            );


            this.sourceText =
                output;


            this.detectedEncoding =
                this.saveEncoding;


            this.dirty =
                false;


            this.items.forEach(
                item => {

                    item.modified =
                        false;

                    item.isNew =
                        false;
                }
            );


            this.statusMessage =
                "已儲存：" +
                name;


            this.updateHistorySnapshot();

        }
        catch (error) {

            console.error(
                "儲存 ZSC 失敗：",
                error
            );


            this.statusMessage =
                "儲存失敗：" +
                (
                    error.message ||
                    error
                );
        }
    },


    /* =========================================================
       Scroll
       ========================================================= */

    syncScroll(event) {

        const target =
            event.target;


        const other =
            target.dataset.scrollTarget;


        if (!other) {
            return;
        }


        const element =
            document.getElementById(
                other
            );


        if (!element) {
            return;
        }


        element.scrollTop =
            target.scrollTop;


        element.scrollLeft =
            target.scrollLeft;
    },


    syncSyntaxScroll(event) {

        /*
         * 舊版 Highlight overlay 已經取消。
         */

        return;
    },


    syncLineNumbers(event) {

        const textarea =
            event.target;


        const lineNumbers =
            textarea.parentElement
                ?.querySelector(
                    ".line-numbers"
                );


        if (!lineNumbers) {
            return;
        }


        lineNumbers.scrollTop =
            textarea.scrollTop;
    }

};