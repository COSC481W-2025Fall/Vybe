(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LibraryView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/lucide-react/dist/esm/icons/clock.js [app-client] (ecmascript) <export default as Clock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListMusic$3e$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/lucide-react/dist/esm/icons/list-music.js [app-client] (ecmascript) <export default as ListMusic>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
// --- sample data (replace with real data later) ---
const RECENT = [
    {
        id: 1,
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        album: 'After Hours',
        cover: 'https://picsum.photos/seed/blinding/80/80',
        playedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 2,
        title: 'Levitating',
        artist: 'Dua Lipa',
        album: 'Future Nostalgia',
        cover: 'https://picsum.photos/seed/levitating/80/80',
        playedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 3,
        title: 'Good 4 U',
        artist: 'Olivia Rodrigo',
        album: 'SOUR',
        cover: 'https://picsum.photos/seed/good4u/80/80',
        playedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
];
const TABS = [
    {
        key: 'recent',
        label: 'Recent History'
    },
    {
        key: 'saved',
        label: 'Saved Playlists'
    }
];
// --- helpers ---
function timeAgo(input) {
    const date = new Date(input);
    const diff = Math.max(0, Date.now() - date.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return "".concat(mins, " min").concat(mins === 1 ? '' : 's', " ago");
    const hours = Math.floor(mins / 60);
    if (hours < 24) return "".concat(hours, " hour").concat(hours === 1 ? '' : 's', " ago");
    const days = Math.floor(hours / 24);
    if (days < 7) return "".concat(days, " day").concat(days === 1 ? '' : 's', " ago");
    const weeks = Math.floor(days / 7);
    return "".concat(weeks, " week").concat(weeks === 1 ? '' : 's', " ago");
}
function TabButton(param) {
    let { isActive, children, onClick } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        onClick: onClick,
        className: [
            'rounded-full px-3 py-1.5 text-sm transition',
            isActive ? 'bg-white text-black shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
        ].join(' '),
        children: children
    }, void 0, false, {
        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
        lineNumber: 55,
        columnNumber: 5
    }, this);
}
_c = TabButton;
function Row(param) {
    let { item } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
        className: "flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-accent/30 transition",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                src: item.cover,
                width: 48,
                height: 48,
                className: "h-12 w-12 rounded-md object-cover",
                alt: "".concat(item.title, " cover")
            }, void 0, false, {
                fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                lineNumber: 72,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "min-w-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "truncate text-sm font-medium",
                        children: item.title
                    }, void 0, false, {
                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                        lineNumber: 80,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "truncate text-xs text-muted-foreground",
                        children: [
                            item.artist,
                            " • ",
                            item.album
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                        lineNumber: 81,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                lineNumber: 79,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "ml-auto flex items-center gap-1 text-xs text-muted-foreground",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"], {
                        className: "h-3.5 w-3.5"
                    }, void 0, false, {
                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                        lineNumber: 86,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: timeAgo(item.playedAt)
                    }, void 0, false, {
                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                        lineNumber: 87,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                lineNumber: 85,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
        lineNumber: 71,
        columnNumber: 5
    }, this);
}
_c1 = Row;
function LibraryView() {
    _s();
    const [tab, setTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('recent');
    const content = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "LibraryView.useMemo[content]": ()=>{
            if (tab === 'recent') {
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "rounded-2xl border border-border bg-card/60 p-4 shadow-xl backdrop-blur chroma-card",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-3 flex items-center gap-2 text-sm font-medium",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"], {
                                    className: "h-4 w-4 text-muted-foreground"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                                    lineNumber: 101,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Recent Listening History"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                                    lineNumber: 102,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                            lineNumber: 100,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                            className: "divide-y divide-border/60",
                            children: RECENT.map({
                                "LibraryView.useMemo[content]": (item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Row, {
                                        item: item
                                    }, item.id, false, {
                                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                                        lineNumber: 106,
                                        columnNumber: 15
                                    }, this)
                            }["LibraryView.useMemo[content]"])
                        }, void 0, false, {
                            fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                            lineNumber: 104,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                    lineNumber: 99,
                    columnNumber: 9
                }, this);
            }
            // Saved playlists placeholder
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-2xl border border-border bg-card/60 p-6 shadow-xl backdrop-blur chroma-card",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-2 flex items-center gap-2 text-sm font-medium",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListMusic$3e$__["ListMusic"], {
                                className: "h-4 w-4 text-muted-foreground"
                            }, void 0, false, {
                                fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                                lineNumber: 116,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Saved Playlists"
                            }, void 0, false, {
                                fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                                lineNumber: 117,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                        lineNumber: 115,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-muted-foreground",
                        children: "You don’t have any saved playlists yet."
                    }, void 0, false, {
                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                        lineNumber: 119,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                lineNumber: 114,
                columnNumber: 7
            }, this);
        }
    }["LibraryView.useMemo[content]"], [
        tab
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "mx-auto max-w-4xl px-4 py-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "mb-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-xl font-semibold",
                        children: "Your Library"
                    }, void 0, false, {
                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                        lineNumber: 129,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-muted-foreground",
                        children: "Your listening history and saved playlists"
                    }, void 0, false, {
                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                        lineNumber: 130,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                lineNumber: 128,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-4 flex items-center gap-2",
                children: TABS.map((param)=>{
                    let { key, label } = param;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(TabButton, {
                        isActive: tab === key,
                        onClick: ()=>setTab(key),
                        children: label
                    }, key, false, {
                        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                        lineNumber: 137,
                        columnNumber: 11
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
                lineNumber: 135,
                columnNumber: 7
            }, this),
            content
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/components/LibraryView.jsx",
        lineNumber: 127,
        columnNumber: 5
    }, this);
}
_s(LibraryView, "bISlqmLPOBHpN2KopPU+j1Shi7M=");
_c2 = LibraryView;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "TabButton");
__turbopack_context__.k.register(_c1, "Row");
__turbopack_context__.k.register(_c2, "LibraryView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/lucide-react/dist/esm/icons/clock.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * @license lucide-react v0.543.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ __turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>Clock
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "M12 6v6l4 2",
            key: "mmk7yg"
        }
    ],
    [
        "circle",
        {
            cx: "12",
            cy: "12",
            r: "10",
            key: "1mglay"
        }
    ]
];
const Clock = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("clock", __iconNode);
;
 //# sourceMappingURL=clock.js.map
}),
"[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/lucide-react/dist/esm/icons/clock.js [app-client] (ecmascript) <export default as Clock>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Clock",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/lucide-react/dist/esm/icons/clock.js [app-client] (ecmascript)");
}),
"[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/lucide-react/dist/esm/icons/list-music.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * @license lucide-react v0.543.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ __turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>ListMusic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "M16 5H3",
            key: "m91uny"
        }
    ],
    [
        "path",
        {
            d: "M11 12H3",
            key: "51ecnj"
        }
    ],
    [
        "path",
        {
            d: "M11 19H3",
            key: "zflm78"
        }
    ],
    [
        "path",
        {
            d: "M21 16V5",
            key: "yxg4q8"
        }
    ],
    [
        "circle",
        {
            cx: "18",
            cy: "16",
            r: "3",
            key: "1hluhg"
        }
    ]
];
const ListMusic = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("list-music", __iconNode);
;
 //# sourceMappingURL=list-music.js.map
}),
"[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/lucide-react/dist/esm/icons/list-music.js [app-client] (ecmascript) <export default as ListMusic>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ListMusic",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$EMU_Course_Files$2f2d2d$Fall_$27$25$2d2d2f$COSC__481W__Jiang$2f$Vybe$2f$apps$2f$web$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/EMU_Course_Files/--Fall_'25--/COSC 481W Jiang/Vybe/apps/web/node_modules/lucide-react/dist/esm/icons/list-music.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=Documents_EMU_Course_Files_--Fall_%2725--_COSC%20481W%20Jiang_Vybe_apps_web_796d704b._.js.map