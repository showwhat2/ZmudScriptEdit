const editorMethods = {

    // =====================================================
    // Undo / Redo：歷史紀錄工具
    // =====================================================

    cloneHistoryState() {

        return {

            items:
                JSON.parse(
                    JSON.stringify(
                        this.items
                    )
                ),

            selectedUid:
                this.selectedUid,

            checkedDeleteUids:
                [
                    ...(this.checkedDeleteUids || [])
                ],

            dirty:
                this.dirty

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


        return (
            JSON.stringify(a) ===
            JSON.stringify(b)
        );

    },


    saveHistory() {

        if (this.historyRestoring) {

            return;

        }


        const state =
            this.cloneHistoryState();


        this.undoStack.push(
            state
        );


        this.redoStack = [];


        const MAX_HISTORY = 100;


        if (
            this.undoStack.length >
            MAX_HISTORY
        ) {

            this.undoStack.shift();

        }

    },


    // =====================================================
    // 一般欄位修改的歷史紀錄
    // =====================================================

    recordModifiedHistory() {

        if (this.historyRestoring) {

            return;

        }


        /*
         * 正常情況下 historySnapshot
         * 在開檔、選取項目、新增項目後
         * 都已經存在。
         */
        if (!this.historySnapshot) {

            this.historySnapshot =
                this.cloneHistoryState();

            return;

        }


        /*
         * 只有非文字輸入才會使用這個方法。
         *
         * 文字編輯器會使用
         * recordTypingHistory()。
         */
        const current =
            this.cloneHistoryState();


        if (
            this.historyStatesEqual(
                current,
                this.historySnapshot
            )
        ) {

            return;

        }


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


        /*
         * 修改完成後立即建立新的基準。
         */
        this.historySnapshot =
            current;


        this.typingHistoryStarted =
            false;

    },


    // =====================================================
    // 文字輸入歷史紀錄
    // =====================================================

    recordTypingHistory() {

        if (this.historyRestoring) {

            return;

        }


        /*
         * 已經在這一段文字輸入中：
         *
         * 不再 clone 整個 items。
         */
        if (
            this.typingHistoryStarted
        ) {

            return;

        }


        /*
         * 正常情況下這裡一定有 snapshot。
         */
        if (!this.historySnapshot) {

            this.historySnapshot =
                this.cloneHistoryState();

        }


        /*
         * 注意：
         *
         * historySnapshot 是輸入前狀態。
         *
         * 所以這裡只需要把它放入 Undo。
         *
         * 不需要把「目前狀態」再 deep clone 一次。
         */
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


        this.typingHistoryStarted =
            true;

    },


    // =====================================================
    // 還原歷史狀態
    // =====================================================

    restoreHistoryState(state) {

        if (!state) {

            return;

        }


        this.cancelEditorTimers();


        this.historyRestoring =
            true;


        this.items =
            JSON.parse(
                JSON.stringify(
                    state.items || []
                )
            );


        this.selectedUid =
            state.selectedUid ||
            null;


        this.checkedDeleteUids =
            [
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

            this.prepareSpecialProperties(
                item
            );

        }


        this.refreshEditors();


        this.historyRestoring =
            false;


        this.updateHistorySnapshot();


        this.typingHistoryStarted =
            false;

    },


    // =====================================================
    // Undo
    // =====================================================

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


    // =====================================================
    // Redo
    // =====================================================

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


    // =====================================================
    // 清除歷史
    // =====================================================

    clearHistory() {

        this.undoStack = [];

        this.redoStack = [];

        this.typingHistoryStarted =
            false;

        this.historySnapshot =
            null;

    },


    // =====================================================
    // 取消編輯器延遲工作
    // =====================================================

    cancelEditorTimers() {

        if (
            this.highlightFrameId
        ) {

            cancelAnimationFrame(
                this.highlightFrameId
            );

            this.highlightFrameId =
                null;

        }


        if (
            this.rawFormatTimer
        ) {

            clearTimeout(
                this.rawFormatTimer
            );

            this.rawFormatTimer =
                null;

        }

    },


    // =====================================================
    // 延遲更新 Syntax Highlight
    // =====================================================

    scheduleSyntaxHighlight(value) {

        /*
         * 先記住最新文字。
         *
         * 這裡不直接觸發 highlight，
         * 避免每一個 keydown 都重跑。
         */
        this.pendingHighlightValue =
            value;


        if (
            this.highlightFrameId
        ) {

            return;

        }


        this.highlightFrameId =
            requestAnimationFrame(
                () => {

                    this.highlightFrameId =
                        null;


                    this.formattedHighlightValue =
                        this.pendingHighlightValue;

                }
            );

    },


    // =====================================================
    // 延遲 Raw → Formatted
    // =====================================================

    scheduleRawFormattedRefresh() {

        if (
            this.rawFormatTimer
        ) {

            clearTimeout(
                this.rawFormatTimer
            );

        }


        this.rawFormatTimer =
            setTimeout(
                () => {

                    this.rawFormatTimer =
                        null;


                    /*
                     * Raw 編輯器正在輸入時，
                     * 只更新另一邊的 Formatted。
                     */
                    if (
                        !this.selectedItem
                    ) {

                        return;

                    }


                    const input =
                        document.activeElement;


                    /*
                     * 如果使用者此刻已經切換到
                     * Formatted，就不要覆蓋它。
                     */
                    if (
                        input &&
                        input.id ===
                        "formatted-editor"
                    ) {

                        return;

                    }


                    this.formattedEditorValue =
                        ZSCContent.format(
                            this.selectedItem.content ||
                            ""
                        );


                    this.scheduleSyntaxHighlight(
                        this.formattedEditorValue
                    );

                },
                180
            );

    },


    // =====================================================
    // 結束目前連續文字輸入
    // =====================================================

    finishTypingHistory(event) {

        /*
         * 如果是 textarea 失去焦點，
         * 離開時把格式整理一次。
         */
        const target =
            event &&
            event.target;


        const targetId =
            target &&
            target.id;


        this.typingHistoryStarted =
            false;


        if (
            !this.historyRestoring
        ) {

            this.updateHistorySnapshot();

        }


        /*
         * 如果是 Raw / Formatted 編輯器，
         * 離開編輯器後再重新整理。
         */
        if (
            targetId === "raw-editor" ||
            targetId === "formatted-editor"
        ) {

            this.cancelEditorTimers();


            this.refreshEditors();

        }

    },


    // =====================================================
    // 開啟檔案
    // =====================================================

    openFile() {

        const input =
            document.createElement("input");


        input.type =
            "file";


        input.accept =
            ".zsc";


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


    // =====================================================
    // ALARM
    // =====================================================

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

            return (
                "{*" +
                item.interval +
                "}"
            );

        }


        return "{*0}";

    },


    // =====================================================
    // 特殊屬性
    // =====================================================

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

                item.triggerPattern = "";

            }


            if (
                item.zmudValue ===
                undefined
            ) {

                item.zmudValue = "";

            }

        }


        if (
            item.type === "ALARM"
        ) {

            if (
                item.intervalRaw ===
                undefined
            ) {

                item.intervalRaw = "";

            }


            if (
                item.interval ===
                undefined
            ) {

                item.interval = 0;

            }


            if (
                item.zmudValue ===
                undefined
            ) {

                item.zmudValue = "";

            }


            this.parseAlarmProperties(
                item
            );

        }

    },


    // =====================================================
    // File Input
    // =====================================================

    handleFileInput(event) {

        const file =
            event.target.files[0];


        if (!file) {

            return;

        }


        this.loadFile(file);


        event.target.value =
            "";

    },


    // =====================================================
    // Drag & Drop
    // =====================================================

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


    // =====================================================
    // 讀取檔案
    // =====================================================

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
                        this.categories[item.type]
                        !== false
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


    // =====================================================
    // 新增檔案
    // =====================================================

    newFile() {

        if (
            this.dirty &&
            !confirm(
                "目前檔案尚未儲存，確定要建立新檔案嗎？"
            )
        ) {

            return;

        }


        this.cancelEditorTimers();


        this.sourceText =
            "";


        this.fileName =
            "";


        this.items =
            [];


        this.selectedUid =
            null;


        this.checkedDeleteUids =
            [];


        this.searchText =
            "";


        this.detectedEncoding =
            "utf-8";


        this.dirty =
            false;


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


    // =====================================================
    // 分類
    // =====================================================

    itemsByType(type) {

        const keyword =
            (
                this.searchText ||
                ""
            )
            .trim()
            .toLowerCase();


        return this.items.filter(
            item => {

                if (
                    item.type !== type
                ) {

                    return false;

                }


                if (
                    item.deleted
                ) {

                    return false;

                }


                if (!keyword) {

                    return true;

                }


                const name =
                    String(
                        item.name ||
                        ""
                    )
                    .toLowerCase();


                const content =
                    String(
                        item.content ||
                        ""
                    )
                    .toLowerCase();


                return (
                    name.includes(keyword) ||
                    content.includes(keyword)
                );

            }
        );

    },


    filteredItems() {

        const keyword =
            (
                this.searchText ||
                ""
            )
            .trim()
            .toLowerCase();


        return this.items.filter(
            item => {

                if (
                    item.deleted
                ) {

                    return false;

                }


                if (
                    this.categories[item.type]
                    === false
                ) {

                    return false;

                }


                if (!keyword) {

                    return true;

                }


                const name =
                    String(
                        item.name ||
                        ""
                    )
                    .toLowerCase();


                const content =
                    String(
                        item.content ||
                        ""
                    )
                    .toLowerCase();


                return (
                    name.includes(keyword) ||
                    content.includes(keyword)
                );

            }
        );

    },


    isCategoryExpanded(type) {

        return (
            this.expandedCategories[type]
            === true
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
            item => {

                return (
                    item.type === type &&
                    !item.deleted
                );

            }
        ).length;

    },


    // =====================================================
    // 選取項目
    // =====================================================

    selectItem(uid) {

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


    // =====================================================
    // 新增項目
    // =====================================================

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


        this.items.push(
            item
        );


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


    // =====================================================
    // 標記修改
    //
    // isTyping = true
    // 代表 Raw / Formatted 文字輸入。
    // =====================================================

    markModified(isTyping = false) {

        if (isTyping) {

            this.recordTypingHistory();

        }
        else {

            this.recordModifiedHistory();

        }


        this.dirty =
            true;


        if (this.selectedItem) {

            this.selectedItem.modified =
                true;

        }


        this.statusMessage =
            "有未儲存的修改";

    },


    // =====================================================
    // Raw 編輯器
    // =====================================================

    onRawInput(event) {

        if (
            !this.selectedItem
        ) {

            return;

        }


        const value =
            event.target.value;


        /*
         * 直接保存使用者目前輸入內容。
         *
         * 不呼叫 refreshEditors()。
         *
         * 這是本次效能修正最重要的一點。
         */
        this.rawEditorValue =
            value;


        this.selectedItem.content =
            value;


        this.markModified(
            true
        );


        /*
         * Raw 正在輸入時，
         * 不需要立即格式化。
         *
         * 稍微延遲後更新右側 Formatted。
         */
        this.scheduleRawFormattedRefresh();

    },


    // =====================================================
    // Formatted 編輯器
    // =====================================================

    onFormattedInput(event) {

        if (
            !this.selectedItem
        ) {

            return;

        }


        const value =
            event.target.value;


        /*
         * 非常重要：
         *
         * 直接保留 textarea 目前的內容。
         *
         * 不要立刻重新 format。
         *
         * 否則游標可能跳回去，
         * 而且每個字都會重新處理整份文件。
         */
        this.formattedEditorValue =
            value;


        this.selectedItem.content =
            ZSCContent.unformat(
                value
            );


        /*
         * Raw 內容同步，
         * 但不重新建立 Formatted。
         */
        this.rawEditorValue =
            this.selectedItem.content;


        this.markModified(
            true
        );


        /*
         * Syntax Highlight 使用 requestAnimationFrame
         * 延後到瀏覽器準備繪製時再處理。
         */
        this.scheduleSyntaxHighlight(
            value
        );

    },


    // =====================================================
    // Raw 編輯器更新
    // =====================================================

    refreshRawEditor() {

        if (
            !this.selectedItem
        ) {

            this.rawEditorValue =
                "";

            return;

        }


        this.rawEditorValue =
            this.selectedItem.content ||
            "";

    },


    // =====================================================
    // Formatted 編輯器更新
    // =====================================================

    refreshFormattedEditor() {

        if (
            !this.selectedItem
        ) {

            this.formattedEditorValue =
                "";

            this.formattedHighlightValue =
                "";

            return;

        }


        this.formattedEditorValue =
            ZSCContent.format(
                this.selectedItem.content ||
                ""
            );


        this.formattedHighlightValue =
            this.formattedEditorValue;


        this.pendingHighlightValue =
            this.formattedEditorValue;

    },


    // =====================================================
    // Syntax Highlight
    // =====================================================

    refreshSyntaxHighlight() {

        this.$nextTick(
            () => {

                const input =
                    document.getElementById(
                        "formatted-editor"
                    );


                const highlight =
                    document.getElementById(
                        "formatted-highlight"
                    );


                if (
                    !input ||
                    !highlight
                ) {

                    return;

                }


                highlight.scrollTop =
                    input.scrollTop;


                highlight.scrollLeft =
                    input.scrollLeft;

            }
        );

    },


    // =====================================================
    // 編輯器同步
    // =====================================================

    refreshEditors() {

        this.cancelEditorTimers();


        this.refreshRawEditor();


        this.refreshFormattedEditor();


        this.refreshSyntaxHighlight();

    },


    // =====================================================
    // 重設目前項目
    // =====================================================

    resetSelectedItem() {

        if (
            !this.selectedItem
        ) {

            return;

        }


        if (
            !confirm(
                "確定要放棄目前項目的修改嗎？"
            )
        ) {

            return;

        }


        if (
            this.selectedItem.isNew
        ) {

            this.finishTypingHistory();

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
         * 維持目前資料結構。
         *
         * 注意：
         * 目前 items 裡的 content 就是即時資料，
         * 因此原版這裡實際上並沒有真正回復
         * 原始 content。
         *
         * 這裡先保持原有行為。
         */
        this.refreshEditors();


        this.updateDirty();

    },


    // =====================================================
    // 套用
    // =====================================================

    applyItem() {

        if (
            !this.selectedItem
        ) {

            return;

        }


        if (
            this.selectedItem.content !==
            this.rawEditorValue
        ) {

            this.finishTypingHistory();

            this.saveHistory();

        }


        this.selectedItem.content =
            this.rawEditorValue;


        this.markModified(
            false
        );


        this.refreshEditors();


        this.statusMessage =
            "已套用目前項目的修改";


        this.updateHistorySnapshot();

    },


    // =====================================================
    // 刪除
    // =====================================================

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


    // =====================================================
    // 批量刪除
    // =====================================================

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
                "\n\n" +
                "合計：" +
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


    // =====================================================
    // 刪除分類全部
    // =====================================================

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
                " 嗎？\n\n" +
                "共 " +
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


        this.refreshEditors();


        this.updateHistorySnapshot();

    },


    // =====================================================
    // Dirty
    // =====================================================

    updateDirty() {

        this.dirty =
            this.items.some(
                item =>
                    item.isNew ||
                    item.deleted ||
                    item.modified
            );

    },


    // =====================================================
    // 建立單一項目文字
    // =====================================================

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


    // =====================================================
    // 建立 ZSC
    // =====================================================

    buildZSC() {

        let output =
            "";


        let cursor =
            0;


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


    // =====================================================
    // 儲存
    // =====================================================

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


    // =====================================================
    // 捲軸同步
    // =====================================================

    syncScroll(event) {

        const target =
            event.target;


        const other =
            target.dataset
                .scrollTarget;


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


    // =====================================================
    // Syntax Highlight 捲軸
    // =====================================================

    syncSyntaxScroll(event) {

        const input =
            event.target;


        const highlight =
            document.getElementById(
                "formatted-highlight"
            );


        if (!highlight) {

            return;

        }


        highlight.scrollTop =
            input.scrollTop;


        highlight.scrollLeft =
            input.scrollLeft;

    },


    // =====================================================
    // 行號同步
    // =====================================================

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