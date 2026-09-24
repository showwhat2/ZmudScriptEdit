/* =========================================================
   ZSC Content Formatter / Unformatter
   ========================================================= */

const ZSCContent = (() => {

    /* ---------------------------------------------------------
       HTML Escape
       --------------------------------------------------------- */

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* ---------------------------------------------------------
       Quote State
       --------------------------------------------------------- */

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

        if (ch === '"' || ch === "'") {
            state.quote = ch;
        }
    }


    /* ---------------------------------------------------------
       FORMAT
       
       將 ZSC 原始內容排版成容易閱讀的形式。

       主要規則：

       ;      → 換行
       {      → 換行 + 增加縮排
       }      → 減少縮排
       CR/LF  → 換行

       引號內：
       ; { } 都不進行結構處理
       --------------------------------------------------------- */

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
                    "    ".repeat(Math.max(0, indent));

                lineStart = false;
            }
        }


        function trimCurrentLine() {

            currentLine =
                currentLine.replace(/[ \t]+$/g, "");
        }


        function newLine() {

            if (lineStart) {
                return;
            }

            trimCurrentLine();

            lines.push(currentLine);

            currentLine = "";
            lineStart = true;
        }


        function addText(str) {

            addIndent();

            currentLine += str;
        }


        for (let i = 0; i < text.length; i++) {

            const ch = text[i];


            /* -------------------------------------------------
               引號內完全不處理結構符號
               ------------------------------------------------- */

            if (state.quote !== null) {

                addText(ch);

                updateQuoteState(ch, state);

                continue;
            }


            /* -------------------------------------------------
               開始引號
               ------------------------------------------------- */

            if (ch === '"' || ch === "'") {

                addText(ch);

                state.quote = ch;
                state.escaped = false;

                continue;
            }


            /* -------------------------------------------------
               分號
               ------------------------------------------------- */

            if (ch === ";") {

                newLine();

                continue;
            }


            /* -------------------------------------------------
               {
               ------------------------------------------------- */

            if (ch === "{") {

                /*
                 * 如果前面已經有文字，而且最後不是空白，
                 * 自動補一個空格。
                 */

                if (
                    !lineStart &&
                    !/[ \t]$/.test(currentLine)
                ) {
                    currentLine += " ";
                }

                /*
                 * 這裡故意不呼叫 addIndent。
                 *
                 * 因為 { 應該跟著目前內容所在位置。
                 */

                currentLine += "{";

                lineStart = false;

                newLine();

                indent++;

                continue;
            }


            /* -------------------------------------------------
               }
               ------------------------------------------------- */

            if (ch === "}") {

                /*
                 * 如果目前這一行有內容，
                 * 先結束目前這一行。
                 */

                if (!lineStart) {
                    newLine();
                }

                indent = Math.max(0, indent - 1);

                addIndent();

                currentLine += "}";

                continue;
            }


            /* -------------------------------------------------
               換行
               ------------------------------------------------- */

            if (ch === "\r" || ch === "\n") {

                if (!lineStart) {
                    newLine();
                }

                /*
                 * CRLF
                 */

                if (
                    ch === "\r" &&
                    text[i + 1] === "\n"
                ) {
                    i++;
                }

                continue;
            }


            /* -------------------------------------------------
               普通文字
               ------------------------------------------------- */

            addText(ch);
        }


        /*
         * 最後一行
         */

        if (!lineStart) {
            trimCurrentLine();
            lines.push(currentLine);
        }


        /*
         * 最後才做一次全域清理。
         *
         * 舊版本是在每一次換行時：
         *
         * result.replace(...)
         *
         * 這會造成大量不必要的字串複製。
         */

        let result = lines.join("\n");

        result = result
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

        return result;
    }


    /* ---------------------------------------------------------
       Structural Line
       --------------------------------------------------------- */

    function isStructuralLine(line) {

        const s = line.trim();

        if (!s) return true;

        if (s === "{") return true;

        if (s === "}") return true;

        if (s === "} {") return true;

        if (/^}\s*\{$/.test(s)) return true;

        return false;
    }


    /* ---------------------------------------------------------
       UNFORMAT
       
       將排版後的文字重新組合成 ZSC。

       這裡最重要的優化：
       
       舊版：
       nextMeaningfulLine()
       
       每一行都往後掃。
       
       大型檔案會變成 O(n²)。

       新版：
       從最後一行往前掃一次。
       
       O(n)
       --------------------------------------------------------- */

    function unformat(text) {

        text = String(text || "")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n");

        const lines = text.split("\n");

        const nextMeaningful = new Array(lines.length);

        let next = "";

        /*
         * 預先計算每一行後面的下一個有效行。
         */

        for (let i = lines.length - 1; i >= 0; i--) {

            nextMeaningful[i] = next;

            const current = lines[i].trim();

            if (current) {
                next = current;
            }
        }


        const result = [];


        function shouldAddSemicolon(
            line,
            nextLine
        ) {

            const current = line.trim();

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

            if (current.endsWith("{")) {
                return false;
            }

            if (current.endsWith(";")) {
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


        for (let i = 0; i < lines.length; i++) {

            const rawLine = lines[i];

            if (!rawLine.trim()) {
                continue;
            }

            const line = rawLine.trim();

            const nextLine =
                nextMeaningful[i];


            if (line === "{") {

                result.push("{");

                continue;
            }


            if (line === "}") {

                result.push("}");

                continue;
            }


            if (line === "} {") {

                result.push("} {");

                continue;
            }


            /*
             * 非結構行。
             */

            let outputLine = line;

            if (
                shouldAddSemicolon(
                    line,
                    nextLine
                )
            ) {
                outputLine += ";";
            }

            result.push(outputLine);
        }


        return result.join("").trim();
    }


    /* ---------------------------------------------------------
       Syntax Highlight
       
       注意：
       這個函式只產生 HTML。
       
       絕對不會修改原始文字。
       --------------------------------------------------------- */

    function highlight(text) {

        let html = escapeHtml(text);


        /*
         * 字串
         */

        html = html.replace(
            /(&quot;.*?&quot;|&#039;.*?&#039;)/g,
            '<span class="zsc-string">$1</span>'
        );


        /*
         * ZSC Command
         */

        html = html.replace(
            /(^|[\s;{])(#(?:ALIAS|FUNC|ALARM|TRIGGER|BUTTON|KEY|IF|CASE|LOOP|VAR|MATH|SHOW|T\+|T-|WA|GOTO|BREAK|CONTINUE|IFNOT|ELSE))\b/gi,
            '$1<span class="zsc-command">$2</span>'
        );


        /*
         * @variable
         */

        html = html.replace(
            /(@[A-Za-z_][A-Za-z0-9_]*)/g,
            '<span class="zsc-variable">$1</span>'
        );


        /*
         * %variable
         */

        html = html.replace(
            /(%[A-Za-z_][A-Za-z0-9_]*(?:\([^)]*\))?)/g,
            '<span class="zsc-percent">$1</span>'
        );


        /*
         * {}
         */

        html = html.replace(
            /([{}])/g,
            '<span class="zsc-brace">$1</span>'
        );


        return html;
    }


    /* ---------------------------------------------------------
       Render
       --------------------------------------------------------- */

    function render(text) {

        return highlight(
            format(text)
        );
    }


    return {

        format,
        unformat,
        highlight,
        render

    };

})();