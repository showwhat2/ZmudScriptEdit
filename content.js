/* =========================================================
   ZSC Content Formatter / Unformatter
   ========================================================= */

const ZSCContent = (() => {

    // -----------------------------------------------------
    // HTML Escape
    // -----------------------------------------------------

    function escapeHtml(text) {

        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    // -----------------------------------------------------
    // 判斷字元是否在引號中
    // -----------------------------------------------------

    function updateQuoteState(ch, state) {

        if (state.escaped) {

            state.escaped = false;

            return;

        }


        if (ch === "\\") {

            state.escaped = true;

            return;

        }


        if (state.quote !== null) {

            if (ch === state.quote) {

                state.quote = null;

            }

            return;

        }


        if (
            ch === '"' ||
            ch === "'"
        ) {

            state.quote = ch;

        }

    }


    // -----------------------------------------------------
    // 格式化 ZSC
    //
    // 重要：
    // 這裡使用「目前行」的方式處理。
    //
    // 舊版每次換行都：
    //
    // result.replace(...)
    //
    // 會反覆掃描整份 result。
    //
    // 新版只處理目前這一行。
    // -----------------------------------------------------

    function format(text) {

        text = String(text || "");


        const lines = [];

        let currentLine = "";

        let indent = 0;

        const state = {

            quote: null,

            escaped: false

        };

        let lineStart = true;


        function addIndent() {

            if (lineStart) {

                currentLine =
                    "    ".repeat(
                        Math.max(0, indent)
                    );

                lineStart = false;

            }

        }


        function trimCurrentLine() {

            currentLine =
                currentLine.replace(
                    /[ \t]+$/g,
                    ""
                );

        }


        function newLine() {

            trimCurrentLine();


            /*
             * 舊版：
             *
             * 如果已經在換行狀態，
             * 再次換行不會增加空白行。
             */
            if (!lineStart) {

                lines.push(
                    currentLine
                );

                currentLine = "";

                lineStart = true;

            }

        }


        function addText(str) {

            addIndent();

            currentLine += str;

        }


        for (
            let i = 0;
            i < text.length;
            i++
        ) {

            const ch = text[i];


            // ---------------------------------------------
            // 引號內
            // ---------------------------------------------

            if (state.quote !== null) {

                addText(ch);

                updateQuoteState(
                    ch,
                    state
                );

                continue;

            }


            // ---------------------------------------------
            // 一般引號
            // ---------------------------------------------

            if (
                ch === '"' ||
                ch === "'"
            ) {

                addText(ch);

                state.quote = ch;

                state.escaped = false;

                continue;

            }


            // ---------------------------------------------
            // 分號
            // ---------------------------------------------

            if (ch === ";") {

                /*
                 * 分號本身不顯示，
                 * 只負責換行。
                 */
                newLine();

                continue;

            }


            // ---------------------------------------------
            // 左大括號
            // ---------------------------------------------

            if (ch === "{") {

                /*
                 * 如果前面沒有空白，
                 * 補一個空白。
                 */
                if (
                    !lineStart &&
                    !/[ \t]$/.test(
                        currentLine
                    )
                ) {

                    currentLine += " ";

                }


                /*
                 * 注意：
                 * 舊版這裡直接 result += "{"
                 *
                 * 因此如果是純結構行，
                 * 不會自動增加 indent。
                 */
                currentLine += "{";


                newLine();


                indent++;


                continue;

            }


            // ---------------------------------------------
            // 右大括號
            // ---------------------------------------------

            if (ch === "}") {

                /*
                 * 如果目前這一行有內容，
                 * 先結束這一行。
                 */
                if (!lineStart) {

                    newLine();

                }


                indent =
                    Math.max(
                        0,
                        indent - 1
                    );


                addIndent();


                currentLine += "}";


                /*
                 * 不立即換行。
                 *
                 * 這樣：
                 *
                 * } {
                 *
                 * 或：
                 *
                 * } else
                 *
                 * 可以繼續留在同一行。
                 */

                continue;

            }


            // ---------------------------------------------
            // 原本的換行
            // ---------------------------------------------

            if (
                ch === "\r" ||
                ch === "\n"
            ) {

                if (!lineStart) {

                    newLine();

                }


                if (
                    ch === "\r" &&
                    text[i + 1] === "\n"
                ) {

                    i++;

                }


                continue;

            }


            // ---------------------------------------------
            // 一般文字
            // ---------------------------------------------

            addText(ch);

        }


        /*
         * 最後一行。
         */
        if (!lineStart) {

            trimCurrentLine();

            lines.push(
                currentLine
            );

        }


        let result =
            lines.join("\n");


        /*
         * 保留原本的最終整理規則。
         */
        result =
            result
                .replace(
                    /[ \t]+\n/g,
                    "\n"
                )
                .replace(
                    /\n{3,}/g,
                    "\n\n"
                )
                .trim();


        return result;

    }


    // -----------------------------------------------------
    // 判斷某一行是不是純結構行
    // -----------------------------------------------------

    function isStructuralLine(line) {

        const s =
            line.trim();


        if (!s) {

            return true;

        }


        if (s === "{") {

            return true;

        }


        if (s === "}") {

            return true;

        }


        if (s === "} {") {

            return true;

        }


        if (
            /^}\s*\{$/.test(s)
        ) {

            return true;

        }


        return false;

    }


    // -----------------------------------------------------
    // 格式化內容 → ZSC
    // -----------------------------------------------------

    function unformat(text) {

        text =
            String(text || "")
                .replace(
                    /\r\n/g,
                    "\n"
                )
                .replace(
                    /\r/g,
                    "\n"
                );


        const lines =
            text.split("\n");


        /*
         * -------------------------------------------------
         * 先從後往前建立：
         *
         * nextMeaningfulLines[i]
         *
         * 代表第 i 行後面的下一個非空白行。
         *
         * 舊版每一行都重新往後搜尋，
         * 最壞會變成 O(n²)。
         *
         * 現在只需要一次 O(n)。
         * -------------------------------------------------
         */

        const nextMeaningfulLines =
            new Array(
                lines.length
            );


        let nextMeaningful =
            "";


        for (
            let i = lines.length - 1;
            i >= 0;
            i--
        ) {

            nextMeaningfulLines[i] =
                nextMeaningful;


            const trimmed =
                lines[i].trim();


            if (trimmed) {

                nextMeaningful =
                    trimmed;

            }

        }


        // -------------------------------------------------
        // 判斷目前這行是否應該補 ;
        // -------------------------------------------------

        function shouldAddSemicolon(
            line,
            nextLine
        ) {

            const current =
                line.trim();


            if (!current) {

                return false;

            }


            if (
                current === "{" ||
                current === "}" ||
                current === "} {"
            ) {

                return false;

            }


            if (
                current.endsWith("{")
            ) {

                return false;

            }


            if (
                current.endsWith(";")
            ) {

                return false;

            }


            if (
                nextLine === "}" ||
                nextLine === "} {"
            ) {

                return true;

            }


            return true;

        }


        /*
         * 使用陣列累積，
         * 避免大量字串 +=。
         */
        const result = [];


        for (
            let i = 0;
            i < lines.length;
            i++
        ) {

            const rawLine =
                lines[i];


            if (!rawLine.trim()) {

                continue;

            }


            const line =
                rawLine.trim();


            const nextLine =
                nextMeaningfulLines[i];


            // ---------------------------------------------
            // 純 {
            // ---------------------------------------------

            if (line === "{") {

                result.push("{");

                continue;

            }


            // ---------------------------------------------
            // 純 }
            // ---------------------------------------------

            if (line === "}") {

                result.push("}");

                continue;

            }


            // ---------------------------------------------
            // } {
            // ---------------------------------------------

            if (line === "} {") {

                result.push("} {");

                continue;

            }


            // ---------------------------------------------
            // 一般行
            // ---------------------------------------------

            result.push(line);


            if (
                shouldAddSemicolon(
                    line,
                    nextLine
                )
            ) {

                result.push(";");

            }

        }


        return result.join("").trim();

    }


    // -----------------------------------------------------
    // Syntax Highlight
    // -----------------------------------------------------

    function highlight(text) {

        let html =
            escapeHtml(text);


        // 字串
        html =
            html.replace(
                /(&quot;.*?&quot;|&#039;.*?&#039;)/g,
                '<span class="zsc-string">$1</span>'
            );


        // ZSC 指令
        html =
            html.replace(
                /(^|[\s;{])(#(?:ALIAS|FUNC|ALARM|TRIGGER|BUTTON|KEY|IF|CASE|LOOP|VAR|MATH|SHOW|T\+|T-|WA|GOTO|BREAK|CONTINUE|IFNOT|ELSE))\b/gi,
                '$1<span class="zsc-command">$2</span>'
            );


        // @變數
        html =
            html.replace(
                /(@[A-Za-z_][A-Za-z0-9_]*)/g,
                '<span class="zsc-variable">$1</span>'
            );


        // %變數
        html =
            html.replace(
                /(%[A-Za-z_][A-Za-z0-9_]*(?:\([^)]*\))?)/g,
                '<span class="zsc-percent">$1</span>'
            );


        // 大括號
        html =
            html.replace(
                /([{}])/g,
                '<span class="zsc-brace">$1</span>'
            );


        return html;

    }


    // -----------------------------------------------------
    // Render
    // -----------------------------------------------------

    function render(text) {

        return highlight(
            format(text)
        );

    }


    // -----------------------------------------------------
    // 對外公開
    // -----------------------------------------------------

    return {

        format,

        unformat,

        highlight,

        render

    };

})();