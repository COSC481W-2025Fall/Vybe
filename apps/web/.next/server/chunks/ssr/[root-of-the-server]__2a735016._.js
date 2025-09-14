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
"[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/lib/supabase/client.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabaseBrowser",
    ()=>supabaseBrowser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f40$supabase$2f$auth$2d$helpers$2d$nextjs$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/@supabase/auth-helpers-nextjs/dist/index.js [app-ssr] (ecmascript)");
'use client';
;
const supabaseBrowser = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f40$supabase$2f$auth$2d$helpers$2d$nextjs$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createClientComponentClient"])();
}),
"[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/app/(auth)/sign-in/page.jsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SignInPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$lib$2f$supabase$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/lib/supabase/client.js [app-ssr] (ecmascript)");
'use client';
;
;
function SignInPage() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$lib$2f$supabase$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabaseBrowser"])();
    const signInWithSpotify = async ()=>{
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'spotify',
            options: {
                redirectTo: `${location.origin}/auth/callback?next=/library`,
                scopes: 'user-read-email user-read-private playlist-read-private user-read-recently-played'
            },
            queryParams: {
                show_dialog: 'true'
            }
        });
        if (error) console.error('Spotify login error:', error.message);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "p-6 flex flex-col justify-center items-center h-80 w-fit bg-[#000000] rounded-lg glow-shadow--soft p-6 bg-black rounded-lg border border-white/40",
        id: "login-box",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col items-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-3xl mb-3 bg-[linear-gradient(90deg,#8b5cf6,#ec4899,#f59e0b,#10b981,#3b82f6)] bg-clip-text text-transparent [background-size:300%_300%] animate-[gradient-move_8s_linear_infinite]",
                        children: "Welcome to Vybe"
                    }, void 0, false, {
                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/app/(auth)/sign-in/page.jsx",
                        lineNumber: 23,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "mb-8 text-[#6A6A6A]",
                        children: "Connect with friends and share your musical journey"
                    }, void 0, false, {
                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/app/(auth)/sign-in/page.jsx",
                        lineNumber: 24,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/app/(auth)/sign-in/page.jsx",
                lineNumber: 22,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "h-0.5 w-20 bg-gray-600"
                    }, void 0, false, {
                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/app/(auth)/sign-in/page.jsx",
                        lineNumber: 27,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: signInWithSpotify,
                        className: "rounded-md bg-primary px-4 py-2 text-primary-foreground bg-[#00A63E] text-amber-50 hover:bg-green-900",
                        children: "Continue with Spotify"
                    }, void 0, false, {
                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/app/(auth)/sign-in/page.jsx",
                        lineNumber: 28,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "h-0.5 w-20 bg-[#6A6A6A]"
                    }, void 0, false, {
                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/app/(auth)/sign-in/page.jsx",
                        lineNumber: 34,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/app/(auth)/sign-in/page.jsx",
                lineNumber: 26,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/app/(auth)/sign-in/page.jsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__2a735016._.js.map