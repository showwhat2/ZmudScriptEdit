/*
 * big5.js
 *
 * ZSC Editor Big5 / UTF-8 編碼工具
 *
 * 重要：
 * 這個檔案不使用 import / export。
 * 可以直接由 file:// 的 index.html 載入。
 *
 * Big5 解碼：
 * 使用瀏覽器原生 TextDecoder。
 *
 * Big5 編碼：
 * 使用 Big5 Unicode -> Big5 對照表。
 *
 * ---------------------------------------------------------
 *
 * 注意：
 * 如果你的瀏覽器支援 TextDecoder("big5")，
 * Big5 讀取可以直接使用瀏覽器功能。
 *
 * Big5「寫出」則需要 Unicode -> Big5 對照資料。
 *
 * ---------------------------------------------------------
 */


/* =========================================================
   Big5 Encoder
   ========================================================= */

(function () {

    "use strict";


    /*
     * -----------------------------------------------------
     * Big5 Unicode -> Big5 mapping
     *
     * 格式：
     *
     * Unicode code point : Big5 code
     *
     * 這裡採用 Map。
     *
     * -----------------------------------------------------
     *
     * 注意：
     * ASCII 不需要放進表格。
     *
     * 例如：
     *
     * A
     * 1
     * #
     * {
     * }
     *
     * 都直接輸出。
     */


    const unicodeToBig5 =
        new Map();


    /*
     * =====================================================
     * 建立 Big5 對照資料
     * =====================================================
     *
     * 這裡使用瀏覽器 TextDecoder 反向建立常用 Big5
     * Unicode 對照。
     *
     * Big5 的雙位元組範圍：
     *
     * 第一位：
     * 81 ~ FE
     *
     * 第二位：
     * 40 ~ 7E
     *  A1 ~ FE
     *
     * =====================================================
     */


    function buildTable() {

        const decoder =
            new TextDecoder(
                "big5"
            );


        const buffer =
            new Uint8Array(2);


        for (
            let b1 = 0x81;
            b1 <= 0xFE;
            b1++
        ) {


            for (
                let b2 = 0x40;
                b2 <= 0xFE;
                b2++
            ) {


                /*
                 * 排除 0x7F ~ 0xA0
                 */

                if (
                    b2 >= 0x7F &&
                    b2 <= 0xA0
                ) {

                    continue;

                }


                buffer[0] =
                    b1;

                buffer[1] =
                    b2;


                let char;


                try {

                    char =
                        decoder.decode(
                            buffer
                        );

                }
                catch (
                    e
                ) {

                    continue;

                }


                /*
                 * 只有成功產生一個字元時
                 * 才加入。
                 */

                if (
                    char.length === 1
                ) {


                    const code =
                        char.charCodeAt(0);


                    /*
                     * 避免覆蓋之前的 mapping
                     */

                    if (
                        !unicodeToBig5.has(
                            code
                        )
                    ) {


                        unicodeToBig5.set(
                            code,
                            (
                                b1 << 8
                            ) |
                            b2
                        );

                    }

                }

            }

        }

    }


    /*
     * 建立表格。
     *
     * 這只會在 big5.js 載入時執行一次。
     */

    buildTable();


    /* =====================================================
       UTF-8 Encode
       ===================================================== */

    function encodeUTF8(
        text
    ) {

        return new TextEncoder().encode(
            text
        );

    }


    /* =====================================================
       UTF-8 Decode
       ===================================================== */

    function decodeUTF8(
        buffer
    ) {

        return new TextDecoder(
            "utf-8",
            {
                fatal: false
            }
        ).decode(
            buffer
        );

    }


    /* =====================================================
       Big5 Decode
       ===================================================== */

    function decodeBig5(
        buffer
    ) {

        return new TextDecoder(
            "big5",
            {
                fatal: false
            }
        ).decode(
            buffer
        );

    }


    /* =====================================================
       Big5 Encode
       ===================================================== */

    function encodeBig5(
        text
    ) {


        const output = [];


        const unsupported = [];


        for (
            let i = 0;
            i < text.length;
            i++
        ) {


            const code =
                text.charCodeAt(i);


            /*
             * ASCII
             */

            if (
                code <= 0x7F
            ) {

                output.push(
                    code
                );

                continue;

            }


            /*
             * Big5 對照
             */

            const big5 =
                unicodeToBig5.get(
                    code
                );


            if (
                big5 !== undefined
            ) {


                output.push(

                    (big5 >> 8) & 0xFF

                );


                output.push(

                    big5 & 0xFF

                );


                continue;

            }


            /*
             * Big5 不支援的字元。
             *
             * 不要默默轉成 ?
             *
             * 直接報錯。
             */

            unsupported.push(
                text[i]
            );

        }


        if (
            unsupported.length > 0
        ) {


            const unique =
                [...new Set(
                    unsupported
                )];


            throw new Error(

                "以下字元無法使用 Big5 儲存：\n\n" +

                unique.join(" ") +

                "\n\n" +

                "請改用 UTF-8 儲存，或移除這些字元。"

            );

        }


        return new Uint8Array(
            output
        );

    }


    /* =====================================================
       自動判斷 UTF-8 / Big5
       ===================================================== */

    function detectEncoding(
        buffer
    ) {


        /*
         * UTF-8 BOM
         */

        if (

            buffer.length >= 3 &&

            buffer[0] === 0xEF &&

            buffer[1] === 0xBB &&

            buffer[2] === 0xBF

        ) {

            return "utf-8";

        }


        /*
         * 嚴格 UTF-8 測試
         */

        try {


            const decoder =
                new TextDecoder(
                    "utf-8",
                    {
                        fatal: true
                    }
                );


            decoder.decode(
                buffer
            );


            return "utf-8";

        }
        catch (
            e
        ) {


            return "big5";

        }

    }


    /* =====================================================
       通用 Decode
       ===================================================== */

    function decodeText(
        buffer,
        encoding
    ) {


        if (
            encoding === "big5"
        ) {

            return decodeBig5(
                buffer
            );

        }


        return decodeUTF8(
            buffer
        );

    }


    /* =====================================================
       通用 Encode
       ===================================================== */

    function encodeText(
        text,
        encoding
    ) {


        if (
            encoding === "big5"
        ) {

            return encodeBig5(
                text
            );

        }


        return encodeUTF8(
            text
        );

    }


    /* =====================================================
       對外 API
       ===================================================== */

    window.Big5Util = {

        encodeUTF8,

        decodeUTF8,

        encodeBig5,

        decodeBig5,

        encodeText,

        decodeText,

        detectEncoding

    };


})();