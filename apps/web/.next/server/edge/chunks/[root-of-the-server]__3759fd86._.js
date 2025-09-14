(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__3759fd86._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/middleware.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// middleware.js
__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f40$supabase$2f$auth$2d$helpers$2d$nextjs$2f$dist$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/@supabase/auth-helpers-nextjs/dist/index.js [middleware-edge] (ecmascript)");
;
;
const PUBLIC = [
    '/',
    '/auth/callback',
    '/sign-in',
    '/favicon.ico',
    // static assets:
    '/_next',
    '/api/health'
];
async function middleware(req) {
    const res = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    // refresh/attach session cookies if needed
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f40$supabase$2f$auth$2d$helpers$2d$nextjs$2f$dist$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createMiddlewareClient"])({
        req,
        res
    });
    const { data: { session } } = await supabase.auth.getSession();
    const path = req.nextUrl.pathname;
    const isPublic = PUBLIC.some((p)=>path === p || path.startsWith(p));
    if (!session && !isPublic) {
        const url = req.nextUrl.clone();
        url.pathname = '/sign-in';
        url.searchParams.set('next', path);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(url);
    }
    return res;
}
const config = {
    matcher: [
        '/((?!.*\\.).*)'
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__3759fd86._.js.map