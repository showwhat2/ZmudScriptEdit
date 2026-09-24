/* =========================================================
   parser.js

   zMUD ZSC Parser

   負責：
   #ALIAS
   #FUNC
   #ALARM
   #TRIGGER
   #BUTTON
   #KEY

   注意：
   不使用簡單正則解析巢狀 {}。
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       跳過空白
       ===================================================== */

    function skipSpaces(text, index) {

        while (
            index < text.length &&
            /\s/.test(text[index])
        ) {
            index++;
        }

        return index;
    }


    /* =====================================================
       讀取普通 token
       ===================================================== */

    function readToken(text, index) {

        index = skipSpaces(text, index);

        const start = index;

        while (
            index < text.length &&
            !/\s/.test(text[index])
        ) {
            index++;
        }

        return {
            value: text.slice(start, index),
            start,
            end: index
        };

    }


    /* =====================================================
       找到對應的 }

       支援：
       { abc }
       { #if { xxx } { yyy } }
       "abc { def }"
       ===================================================== */

    function findMatchingBrace(text, openIndex) {

        if (
            text[openIndex] !== "{"
        ) {
            return -1;
        }


        let depth = 0;

        let quote = null;

        let escaped = false;


        for (
            let i = openIndex;
            i < text.length;
            i++
        ) {

            const ch = text[i];


            /* ---------------------------------------------
               字串內
               --------------------------------------------- */

            if (quote !== null) {

                if (escaped) {

                    escaped = false;

                    continue;

                }


                if (ch === "\\") {

                    escaped = true;

                    continue;

                }


                if (ch === quote) {

                    quote = null;

                }

                continue;

            }


            /* ---------------------------------------------
               開始字串
               --------------------------------------------- */

            if (
                ch === "\"" ||
                ch === "'"
            ) {

                quote = ch;

                continue;

            }


            /* ---------------------------------------------
               {}
               --------------------------------------------- */

            if (ch === "{") {

                depth++;

            }

            else if (ch === "}") {

                depth--;

                if (
                    depth === 0
                ) {

                    return i;

                }

            }

        }


        return -1;

    }


    /* =====================================================
       初始化 Item
       ===================================================== */

    function finalizeItem(item) {

        item.uid =
            "item_" +
            Math.random()
                .toString(36)
                .slice(2) +
            "_" +
            Date.now();


        item.originalName =
            item.name || "";


        item.originalContent =
            item.content || "";


        item.originalPattern =
            item.pattern || "";


        item.originalFlags =
            item.flags || "";


        item.originalAlarmTime =
            item.alarmTime || "";


        item.originalButtonNumber =
            item.buttonNumber || "";


        item.originalButtonText =
            item.buttonText || "";


        item.originalButtonSuffix =
            item.buttonSuffix || "";


        /*
         * 新增：
         * 保存 ALARM 的原始週期語法
         */

        item.originalIntervalRaw =
            item.intervalRaw || "";


        /*
         * 新增：
         * 保存 ZMUD 最後的設定值
         */

        item.originalZmudValue =
            item.zmudValue || "";


        item.originalRaw =
            item.raw || "";


        item.modified = false;

        item.deleted = false;

        item.isNew = false;


        return item;

    }


    /* =====================================================
       解析 ALARM 週期

       例如：

       {*3}
       {*5}
       {*10}

       會得到：

       intervalRaw = "{*3}"
       interval    = 3
       ===================================================== */

    function parseAlarmInterval(intervalRaw) {

        const result = {

            intervalRaw:
                intervalRaw || "",

            interval:
                null

        };


        if (!intervalRaw) {
            return result;
        }


        const match =
            intervalRaw.match(
                /^\{\*(\d+(?:\.\d+)?)\}$/
            );


        if (match) {

            result.interval =
                Number(match[1]);

        }


        return result;

    }


    /* =====================================================
       #ALIAS / #FUNC
       ===================================================== */

    function parseSimpleDirective(
        text,
        hashIndex,
        directive
    ) {

        let pos =
            hashIndex +
            directive.length;


        pos =
            skipSpaces(
                text,
                pos
            );


        const nameToken =
            readToken(
                text,
                pos
            );


        if (
            !nameToken.value
        ) {
            return null;
        }


        pos =
            skipSpaces(
                text,
                nameToken.end
            );


        if (
            text[pos] !== "{"
        ) {
            return null;
        }


        const contentOpen =
            pos;


        const contentClose =
            findMatchingBrace(
                text,
                contentOpen
            );


        if (
            contentClose < 0
        ) {
            return null;
        }


        const content =
            text.slice(
                contentOpen + 1,
                contentClose
            );


        return finalizeItem({

            type:
                directive === "#ALIAS"
                    ? "ALIAS"
                    : "FUNC",

            name:
                nameToken.value,

            content,

            start:
                hashIndex,

            end:
                contentClose + 1,

            contentStart:
                contentOpen + 1,

            contentEnd:
                contentClose,

            raw:
                text.slice(
                    hashIndex,
                    contentClose + 1
                )

        });

    }


    /* =====================================================
       #KEY
       ===================================================== */

    function parseKey(
        text,
        hashIndex
    ) {

        let pos =
            hashIndex +
            "#KEY".length;


        pos =
            skipSpaces(
                text,
                pos
            );


        const keyToken =
            readToken(
                text,
                pos
            );


        if (
            !keyToken.value
        ) {
            return null;
        }


        pos =
            skipSpaces(
                text,
                keyToken.end
            );


        if (
            text[pos] !== "{"
        ) {
            return null;
        }


        const open =
            pos;


        const close =
            findMatchingBrace(
                text,
                open
            );


        if (
            close < 0
        ) {
            return null;
        }


        return finalizeItem({

            type:
                "KEY",

            name:
                keyToken.value,

            content:
                text.slice(
                    open + 1,
                    close
                ),

            start:
                hashIndex,

            end:
                close + 1,

            contentStart:
                open + 1,

            contentEnd:
                close,

            raw:
                text.slice(
                    hashIndex,
                    close + 1
                )

        });

    }


    /* =====================================================
       #TRIGGER

       格式：

       #TRIGGER {pattern} {action} {name} flags

       例如：

       #TRIGGER
       {你正忙於應付攻擊，還想暝思？}
       {#T+ automine+++}
       {automine}
       548

       解析：

       pattern   = 你正忙於應付攻擊，還想暝思？
       content   = #T+ automine+++
       name      = automine
       zmudValue  = 548
       ===================================================== */

    function parseTrigger(
        text,
        hashIndex
    ) {

        let pos =
            hashIndex +
            "#TRIGGER".length;


        pos =
            skipSpaces(
                text,
                pos
            );


        /*
         * Pattern
         */

        if (
            text[pos] !== "{"
        ) {
            return null;
        }


        const patternOpen =
            pos;


        const patternClose =
            findMatchingBrace(
                text,
                patternOpen
            );


        if (
            patternClose < 0
        ) {
            return null;
        }


        const pattern =
            text.slice(
                patternOpen + 1,
                patternClose
            );


        /*
         * Action / Content
         */

        pos =
            skipSpaces(
                text,
                patternClose + 1
            );


        if (
            text[pos] !== "{"
        ) {
            return null;
        }


        const actionOpen =
            pos;


        const actionClose =
            findMatchingBrace(
                text,
                actionOpen
            );


        if (
            actionClose < 0
        ) {
            return null;
        }


        const content =
            text.slice(
                actionOpen + 1,
                actionClose
            );


        /*
         * Name
         */

        pos =
            skipSpaces(
                text,
                actionClose + 1
            );


        if (
            text[pos] !== "{"
        ) {
            return null;
        }


        const nameOpen =
            pos;


        const nameClose =
            findMatchingBrace(
                text,
                nameOpen
            );


        if (
            nameClose < 0
        ) {
            return null;
        }


        const name =
            text.slice(
                nameOpen + 1,
                nameClose
            );


        /*
         * 最後的 ZMUD 設定值
         *
         * 例如：
         *
         * 548
         */

        const zmudValueToken =
            readToken(
                text,
                nameClose + 1
            );


        const zmudValue =
            zmudValueToken.value || "";


        return finalizeItem({

            type:
                "TRIGGER",

            name,

            pattern,

            /*
             * 給 editor.js / UI 使用
             */

            triggerPattern:
                pattern,

            content,

            /*
             * 保留原本 flags 欄位
             *
             * 舊版程式如果有使用 flags，
             * 不會因此壞掉。
             */

            flags:
                zmudValue,

            /*
             * 新增：
             * ZMUD 最後的設定值
             */

            zmudValue,

            start:
                hashIndex,

            end:
                zmudValueToken.end,

            patternStart:
                patternOpen + 1,

            patternEnd:
                patternClose,

            contentStart:
                actionOpen + 1,

            contentEnd:
                actionClose,

            raw:
                text.slice(
                    hashIndex,
                    zmudValueToken.end
                )

        });

    }


    /* =====================================================
       #ALARM

       格式：

       #ALARM {time} {action} {name} flags

       例如：

       #ALARM {*3}
       {#case ...}
       {automine+++}
       556

       解析：

       alarmTime   = "{*3}" 內部文字為 "*3"
       intervalRaw = "{*3}"
       interval    = 3
       content     = #case ...
       name        = automine+++
       zmudValue   = 556
       ===================================================== */

    function parseAlarm(
        text,
        hashIndex
    ) {

        let pos =
            hashIndex +
            "#ALARM".length;


        pos =
            skipSpaces(
                text,
                pos
            );


        /*
         * Time / Interval
         */

        if (
            text[pos] !== "{"
        ) {
            return null;
        }


        const timeOpen =
            pos;


        const timeClose =
            findMatchingBrace(
                text,
                timeOpen
            );


        if (
            timeClose < 0
        ) {
            return null;
        }


        /*
         * 原始的 {} 內容
         *
         * 例如：
         *
         * {*3}
         *
         * alarmTime 會是：
         *
         * *3
         */

        const alarmTime =
            text.slice(
                timeOpen + 1,
                timeClose
            );


        /*
         * 保留完整語法：
         *
         * {*3}
         */

        const intervalRaw =
            text.slice(
                timeOpen,
                timeClose + 1
            );


        /*
         * 嘗試解析：
         *
         * {*3} → 3
         */

        const intervalData =
            parseAlarmInterval(
                intervalRaw
            );


        /*
         * Action / Content
         */

        pos =
            skipSpaces(
                text,
                timeClose + 1
            );


        if (
            text[pos] !== "{"
        ) {
            return null;
        }


        const actionOpen =
            pos;


        const actionClose =
            findMatchingBrace(
                text,
                actionOpen
            );


        if (
            actionClose < 0
        ) {
            return null;
        }


        const content =
            text.slice(
                actionOpen + 1,
                actionClose
            );


        /*
         * Name
         */

        pos =
            skipSpaces(
                text,
                actionClose + 1
            );


        if (
            text[pos] !== "{"
        ) {
            return null;
        }


        const nameOpen =
            pos;


        const nameClose =
            findMatchingBrace(
                text,
                nameOpen
            );


        if (
            nameClose < 0
        ) {
            return null;
        }


        const name =
            text.slice(
                nameOpen + 1,
                nameClose
            );


        /*
         * 最後的 ZMUD 設定值
         *
         * 例如：
         *
         * 556
         */

        const zmudValueToken =
            readToken(
                text,
                nameClose + 1
            );


        const zmudValue =
            zmudValueToken.value || "";


        return finalizeItem({

            type:
                "ALARM",

            name,

            alarmName:
                name,

            /*
             * 原本欄位
             */

            alarmTime,

            /*
             * 新欄位：
             * 完整 ZMUD 週期語法
             *
             * "{*3}"
             */

            intervalRaw,

            /*
             * 新欄位：
             * 純數字
             *
             * 3
             */

            interval:
                intervalData.interval,

            /*
             * Action
             */

            content,

            action:
                content,

            /*
             * 保留舊 flags
             */

            flags:
                zmudValue,

            /*
             * 新欄位：
             * 最後的 ZMUD 設定值
             *
             * "556"
             */

            zmudValue,

            start:
                hashIndex,

            end:
                zmudValueToken.end,

            contentStart:
                actionOpen + 1,

            contentEnd:
                actionClose,

            raw:
                text.slice(
                    hashIndex,
                    zmudValueToken.end
                )

        });

    }


    /* =====================================================
       #BUTTON

       #BUTTON 1 {文字} {命令} {其餘資料...}
       ===================================================== */

    function parseButton(
        text,
        hashIndex
    ) {

        let pos =
            hashIndex +
            "#BUTTON".length;


        const numberToken =
            readToken(
                text,
                pos
            );


        if (
            !numberToken.value
        ) {
            return null;
        }


        pos =
            skipSpaces(
                text,
                numberToken.end
            );


        if (
            text[pos] !== "{"
        ) {
            return null;
        }


        const textOpen =
            pos;


        const textClose =
            findMatchingBrace(
                text,
                textOpen
            );


        if (
            textClose < 0
        ) {
            return null;
        }


        const buttonText =
            text.slice(
                textOpen + 1,
                textClose
            );


        pos =
            skipSpaces(
                text,
                textClose + 1
            );


        if (
            text[pos] !== "{"
        ) {
            return null;
        }


        const commandOpen =
            pos;


        const commandClose =
            findMatchingBrace(
                text,
                commandOpen
            );


        if (
            commandClose < 0
        ) {
            return null;
        }


        const content =
            text.slice(
                commandOpen + 1,
                commandClose
            );


        /*
         * BUTTON 後面的資料全部保留。
         */

        let end =
            commandClose + 1;


        while (
            end < text.length &&
            text[end] !== "\r" &&
            text[end] !== "\n"
        ) {
            end++;
        }


        const buttonSuffix =
            text.slice(
                commandClose + 1,
                end
            );


        return finalizeItem({

            type:
                "BUTTON",

            name:
                buttonText,

            buttonNumber:
                numberToken.value,

            buttonText,

            command:
                content,

            content,

            buttonSuffix,

            start:
                hashIndex,

            end,

            contentStart:
                commandOpen + 1,

            contentEnd:
                commandClose,

            raw:
                text.slice(
                    hashIndex,
                    end
                )

        });

    }


    /* =====================================================
       單一 directive
       ===================================================== */

    function parseDirectiveAt(
        text,
        hashIndex
    ) {

        if (
            text.startsWith(
                "#ALIAS",
                hashIndex
            )
        ) {

            return parseSimpleDirective(
                text,
                hashIndex,
                "#ALIAS"
            );

        }


        if (
            text.startsWith(
                "#FUNC",
                hashIndex
            )
        ) {

            return parseSimpleDirective(
                text,
                hashIndex,
                "#FUNC"
            );

        }


        if (
            text.startsWith(
                "#ALARM",
                hashIndex
            )
        ) {

            return parseAlarm(
                text,
                hashIndex
            );

        }


        if (
            text.startsWith(
                "#TRIGGER",
                hashIndex
            )
        ) {

            return parseTrigger(
                text,
                hashIndex
            );

        }


        if (
            text.startsWith(
                "#BUTTON",
                hashIndex
            )
        ) {

            return parseButton(
                text,
                hashIndex
            );

        }


        if (
            text.startsWith(
                "#KEY",
                hashIndex
            )
        ) {

            return parseKey(
                text,
                hashIndex
            );

        }


        return null;

    }


    /* =====================================================
       整份 ZSC
       ===================================================== */

    function parseZSC(text) {

        const result = [];

        let i = 0;


        while (
            i < text.length
        ) {

            if (
                text[i] === "#"
            ) {

                const item =
                    parseDirectiveAt(
                        text,
                        i
                    );


                if (
                    item
                ) {

                    result.push(
                        item
                    );

                    i =
                        item.end;

                    continue;

                }

            }


            i++;

        }


        result.sort(
            (a, b) =>
                a.start - b.start
        );


        return result;

    }


    /* =====================================================
       對外 API
       ===================================================== */

    window.ZSCParser = {

        skipSpaces,

        readToken,

        findMatchingBrace,

        parseDirectiveAt,

        parseZSC

    };


    /*
     * 為了讓 editor.js 使用方便，
     * 同時提供全域函式。
     */

    window.skipSpaces =
        skipSpaces;

    window.readToken =
        readToken;

    window.findMatchingBrace =
        findMatchingBrace;

    window.parseDirectiveAt =
        parseDirectiveAt;

    window.parseZSC =
        parseZSC;


})();
