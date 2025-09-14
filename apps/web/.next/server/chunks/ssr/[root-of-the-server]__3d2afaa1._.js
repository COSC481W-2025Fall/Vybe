module.exports = [
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/punycode [external] (punycode, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("punycode", () => require("punycode"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/lib/supabase/server.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabaseServer",
    ()=>supabaseServer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f40$supabase$2f$auth$2d$helpers$2d$nextjs$2f$dist$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/node_modules/@supabase/auth-helpers-nextjs/dist/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/node_modules/next/headers.js [app-rsc] (ecmascript)");
;
;
const supabaseServer = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f40$supabase$2f$auth$2d$helpers$2d$nextjs$2f$dist$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerComponentClient"])({
        cookies: __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"]
    });
}),
"[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/app/layout.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RootLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/lib/supabase/server.ts [app-rsc] (ecmascript)");
;
;
;
async function RootLayout({ children }) {
    const sb = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseServer"])();
    const { data: { user } } = await sb.auth.getUser();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("html", {
        lang: "en",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("body", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                    className: "flex items-center gap-4 p-4 border-b",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                            href: "/",
                            children: "Vybe"
                        }, void 0, false, {
                            fileName: "[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/app/layout.tsx",
                            lineNumber: 12,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "ml-auto",
                            children: user ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                                action: "/sign-out",
                                method: "post",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "px-3 py-1 rounded border",
                                    children: "Sign out"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/app/layout.tsx",
                                    lineNumber: 16,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/app/layout.tsx",
                                lineNumber: 15,
                                columnNumber: 15
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                className: "px-3 py-1 rounded border",
                                href: "/sign-in",
                                children: "Sign in"
                            }, void 0, false, {
                                fileName: "[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/app/layout.tsx",
                                lineNumber: 19,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/app/layout.tsx",
                            lineNumber: 13,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/app/layout.tsx",
                    lineNumber: 11,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                    className: "p-6",
                    children: children
                }, void 0, false, {
                    fileName: "[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/app/layout.tsx",
                    lineNumber: 23,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/app/layout.tsx",
            lineNumber: 10,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/app/layout.tsx",
        lineNumber: 9,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__3d2afaa1._.js.map