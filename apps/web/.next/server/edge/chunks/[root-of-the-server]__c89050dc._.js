(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__c89050dc._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f40$supabase$2f$auth$2d$helpers$2d$nextjs$2f$dist$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/Fall '25/COSC 481W Jiang/Vybe/apps/web/node_modules/@supabase/auth-helpers-nextjs/dist/index.js [middleware-edge] (ecmascript)");
;
;
async function middleware(req) {
    const res = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f$Fall__$27$25$2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f40$supabase$2f$auth$2d$helpers$2d$nextjs$2f$dist$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createMiddlewareClient"])({
        req,
        res
    });
    await supabase.auth.getSession(); // refresh session if needed
    return res;
}
const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)'
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__c89050dc._.js.map