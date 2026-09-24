/* =========================================================
   ZSC CodeMirror
   ========================================================= */

(function () {

    "use strict";


    let cm = null;

    let changeCallback = null;
    let blurCallback = null;

    let internalChange = false;


    /* =====================================================
       ZSC CodeMirror Mode
       ===================================================== */

    CodeMirror.defineMode(
        "zsc",
        function () {

            return {

                startState: function () {

                    return {
                        quote: null
                    };

                },


                token: function (stream, state) {

                    /* -------------------------------------------------
                       空白
                       ------------------------------------------------- */

                    if (stream.eatSpace()) {
                        return null;
                    }


                    /* -------------------------------------------------
                       字串
                       ------------------------------------------------- */

                    const ch =
                        stream.peek();


                    if (
                        ch === '"' ||
                        ch === "'"
                    ) {

                        const quote =
                            stream.next();

                        state.quote =
                            quote;

                        while (!stream.eol()) {

                            const c =
                                stream.next();

                            if (c === "\\") {

                                if (!stream.eol()) {
                                    stream.next();
                                }

                                continue;
                            }

                            if (
                                c === quote
                            ) {

                                state.quote =
                                    null;

                                break;
                            }

                        }

                        return "zsc-string";
                    }


                    /* -------------------------------------------------
                       如果目前正在字串裡
                       ------------------------------------------------- */

                    if (
                        state.quote !== null
                    ) {

                        while (!stream.eol()) {

                            const c =
                                stream.next();

                            if (c === "\\") {

                                if (!stream.eol()) {
                                    stream.next();
                                }

                                continue;
                            }

                            if (
                                c === state.quote
                            ) {

                                state.quote =
                                    null;

                                break;
                            }

                        }

                        return "zsc-string";
                    }


                    /* -------------------------------------------------
                       ZSC / zMUD 指令
                       ------------------------------------------------- */

                    if (
                        stream.match(
                            /#[A-Za-z_][A-Za-z0-9_-]*/
                        )
                    ) {

                        return "zsc-command";
                    }


                    /* -------------------------------------------------
                       @變數
                       ------------------------------------------------- */

                    if (
                        stream.match(
                            /@[A-Za-z_][A-Za-z0-9_]*/
                        )
                    ) {

                        return "zsc-variable";
                    }


                    /* -------------------------------------------------
                       %變數 / %1 / %2
                       ------------------------------------------------- */

                    if (
                        stream.match(
                            /%[A-Za-z_][A-Za-z0-9_]*(?:\([^)]*\))?/
                        )
                    ) {

                        return "zsc-percent";
                    }


                    if (
                        stream.match(
                            /%[0-9]+/
                        )
                    ) {

                        return "zsc-percent";
                    }


                    /* -------------------------------------------------
                       數字
                       ------------------------------------------------- */

                    if (
                        stream.match(
                            /-?\d+(?:\.\d+)?/
                        )
                    ) {

                        return "zsc-number";
                    }


                    /* -------------------------------------------------
                       大括號
                       ------------------------------------------------- */

                    if (
                        stream.match(/[{}]/)
                    ) {

                        return "zsc-brace";
                    }


                    /* -------------------------------------------------
                       分號
                       ------------------------------------------------- */

                    if (
                        stream.match(/;/)
                    ) {

                        return "zsc-semicolon";
                    }


                    /* -------------------------------------------------
                       一般文字
                       ------------------------------------------------- */

                    stream.next();

                    return null;
                }

            };

        }
    );


    /* =====================================================
       初始化
       ===================================================== */

 function init(textarea) {

    /* =====================================================
       已經初始化過
       ===================================================== */

    if (cm) {
        return cm;
    }


    /* =====================================================
       如果沒有傳入 textarea
       自己尋找
       ===================================================== */

    if (!textarea) {

        textarea =
            document.getElementById(
                "formatted-editor"
            );
    }


    /* =====================================================
       找不到就等待 Vue 建立 DOM
       ===================================================== */

    if (!textarea) {

        console.log(
            "等待 #formatted-editor..."
        );


        setTimeout(
            function () {

                init();

            },
            50
        );


        return null;
    }


    /* =====================================================
       CodeMirror 檢查
       ===================================================== */

    if (
        typeof CodeMirror === "undefined"
    ) {

        console.error(
            "CodeMirror 尚未載入"
        );

        return null;
    }


    /* =====================================================
       建立 CodeMirror
       ===================================================== */

    console.log(
        "找到 #formatted-editor，開始初始化 CodeMirror"
    );


    cm =
        CodeMirror.fromTextArea(
            textarea,
            {

                mode: "zsc",

                lineNumbers: true,

                lineWrapping: false,

                indentUnit: 4,

                tabSize: 4,

                indentWithTabs: false,

                autofocus: false,

                viewportMargin: Infinity

            }
        );


    /* =====================================================
       Change
       ===================================================== */

    cm.on(
        "change",
        function (
            instance,
            change
        ) {

            if (
                internalChange
            ) {
                return;
            }


            const value =
                instance.getValue();


            if (
                typeof changeCallback ===
                "function"
            ) {

                changeCallback(
                    value,
                    change
                );

            }

        }
    );


    /* =====================================================
       Blur
       ===================================================== */

    cm.getWrapperElement()
        .addEventListener(
            "blur",
            function () {

                if (
                    typeof blurCallback ===
                    "function"
                ) {

                    blurCallback(
                        cm.getValue()
                    );

                }

            },
            true
        );


    console.log(
        "ZSCCodemirror 初始化完成",
        cm
    );


    return cm;
}


    /* =====================================================
       setValue
       ===================================================== */

    function setValue(value) {

        value =
            String(value || "");


        if (!cm) {

            return;
        }


        internalChange =
            true;


        try {

            if (
                cm.getValue() !== value
            ) {

                cm.setValue(
                    value
                );
            }

            cm.clearHistory();

        } finally {

            internalChange =
                false;
        }

    }


    /* =====================================================
       getValue
       ===================================================== */

    function getValue() {

        if (!cm) {

            return "";
        }


        return cm.getValue();
    }


    /* =====================================================
       focus
       ===================================================== */

    function focus() {

        if (!cm) {
            return;
        }

        cm.focus();
    }


    /* =====================================================
       undo
       ===================================================== */

    function undo() {

        if (!cm) {
            return;
        }

        cm.undo();
    }


    /* =====================================================
       redo
       ===================================================== */

    function redo() {

        if (!cm) {
            return;
        }

        cm.redo();
    }


    /* =====================================================
       scroll
       ===================================================== */

    function scrollToTop() {

        if (!cm) {
            return;
        }

        cm.scrollTo(
            null,
            0
        );
    }


    /* =====================================================
       Change Callback
       ===================================================== */

    function onChange(callback) {

        changeCallback =
            callback;
    }


    /* =====================================================
       Blur Callback
       ===================================================== */

    function onBlur(callback) {

        blurCallback =
            callback;
    }


    /* =====================================================
       取得 CodeMirror instance
       ===================================================== */

    function getInstance() {

        return cm;
    }


    /* =====================================================
       API
       ===================================================== */

    const api = {

        init,

        setValue,

        getValue,

        focus,

        undo,

        redo,

        scrollToTop,

        onChange,

        onBlur,

        getInstance

    };


    /* =====================================================
       ★ 最重要
       一定掛到 window
       ===================================================== */

    window.ZSCCodemirror =
        api;


    console.log(
        "zsc-codemirror.js 已載入"
    );


    console.log(
        "window.ZSCCodemirror =",
        window.ZSCCodemirror
    );


})();